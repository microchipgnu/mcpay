import type { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import type { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
    CallToolRequest,
    CallToolResult,
    CallToolResultSchema,
    CompatibilityCallToolResultSchema
} from '@modelcontextprotocol/sdk/types.js';
import { createPaymentHeader } from 'x402/client';
import type { MultiNetworkSigner, PaymentRequirements, Network } from 'x402/types';
import { SupportedEVMNetworks, SupportedSVMNetworks } from 'x402/types';


export interface X402AugmentedClient {
  callTool(
    params: CallToolRequest["params"],
    resultSchema?:
      | typeof CallToolResultSchema
      | typeof CompatibilityCallToolResultSchema,
    options?: RequestOptions
  ): Promise<CallToolResult>;
}

export type X402ClientConfig = {
  wallet: Partial<MultiNetworkSigner>;
  maxPaymentValue?: bigint;
  version?: number;
  confirmationCallback?: (payment: PaymentRequirements[]) => Promise<
    | boolean
    | number
    | { index: number }
    | { network: Network }
    | { requirement: PaymentRequirements }
  >; // Allows declining (false), approving (true), or selecting which requirement
};

/**
 * Wraps an MCP client with X402 payment capabilities
 */
export function withX402Client<T extends MCPClient>(
  client: T,
  x402Config: X402ClientConfig
): X402AugmentedClient & T {
  const { wallet: walletConfig, version } = x402Config;
  const signer = { evm: walletConfig.evm, svm: walletConfig.svm } as MultiNetworkSigner;

  const maxPaymentValue = x402Config.maxPaymentValue ?? BigInt(0.1 * 10 ** 6); // 0.10 USDC

  const _listTools = client.listTools.bind(client);

  // Wrap the original method to include payment information in the description
  const listTools: typeof _listTools = async (params, options) => {
    const toolsRes = await _listTools(params, options);
    toolsRes.tools = toolsRes.tools.map((tool) => {
      let description = tool.description;
      if (tool.annotations?.paymentHint) {
        const cost = tool.annotations?.paymentPriceUSD
          ? `$${tool.annotations?.paymentPriceUSD}`
          : "an unknown amount";
        
        let paymentDetails = ` (This is a paid tool, you will be charged ${cost} for its execution)`;
        
        // Add detailed payment information if available
        if (tool.annotations?.paymentNetworks && Array.isArray(tool.annotations.paymentNetworks)) {
          const networks = tool.annotations.paymentNetworks as Array<{
            network: string;
            recipient: string;
            maxAmountRequired: string;
            asset: { address: string; symbol?: string; decimals?: number };
            type: 'evm' | 'svm';
          }>;
          
          if (networks.length > 0) {
            paymentDetails += `\n\nPayment Details:`;
            networks.forEach((net) => {
              const amount = net.maxAmountRequired;
              const symbol = net.asset.symbol || 'tokens';
              const decimals = net.asset.decimals || 6;
              const formattedAmount = (Number(amount) / Math.pow(10, decimals)).toFixed(decimals);
              
              paymentDetails += `\n• ${net.network} (${net.type.toUpperCase()}): ${formattedAmount} ${symbol}`;
              paymentDetails += `\n  Recipient: ${net.recipient}`;
              paymentDetails += `\n  Asset: ${net.asset.address}`;
            });
          }
        }
        
        description += paymentDetails;
      }
      return {
        ...tool,
        description
      };
    });
    return toolsRes;
  };

  const _callTool = client.callTool.bind(client);

  const callToolWithPayment = async (
    params: CallToolRequest["params"],
    resultSchema?:
      | typeof CallToolResultSchema
      | typeof CompatibilityCallToolResultSchema,
    options?: RequestOptions
  ): ReturnType<typeof client.callTool> => {
    // call the tool
    const res = await _callTool(params, resultSchema, options);

    // If it errored and returned accepts, we need to confirm payment
    const maybeX402Error = res._meta?.["x402/error"] as
      | { accepts: PaymentRequirements[] }
      | undefined;

    if (
      res.isError &&
      maybeX402Error &&
      maybeX402Error.accepts &&
      Array.isArray(maybeX402Error.accepts) &&
      maybeX402Error.accepts.length > 0
    ) {
      const accepts = maybeX402Error.accepts;
      const confirmationCallback = x402Config.confirmationCallback;

      // Use the x402 confirmation callback if provided
      // Build supported networks based on available signers using all x402-supported chains
      const supportedNetworks: Network[] = [];
      if (signer.evm) supportedNetworks.push(...SupportedEVMNetworks);
      if (signer.svm) supportedNetworks.push(...SupportedSVMNetworks);

      // Resolve selection from confirmation callback (if provided)
      let selectedReq: PaymentRequirements | undefined;
      if (confirmationCallback) {
        const selection = await confirmationCallback(accepts);

        if (selection === false) {
          return {
            isError: true,
            content: [{ type: "text", text: "User declined payment" }]
          };
        }

        // If boolean true, we just proceed to default selection below
        if (selection !== true) {
          if (typeof selection === 'number') {
            const idx = selection;
            if (Number.isInteger(idx) && idx >= 0 && idx < accepts.length) {
              selectedReq = accepts[idx];
            }
          } else if (typeof selection === 'object' && selection) {
            if ('index' in selection) {
              const idx = selection.index;
              if (Number.isInteger(idx) && idx >= 0 && idx < accepts.length) {
                selectedReq = accepts[idx];
              }
            } else if ('network' in selection) {
              const net = selection.network as Network;
              selectedReq = accepts.find((a) => a.network === net && a.scheme === 'exact');
            } else if ('requirement' in selection) {
              const reqSel = selection.requirement as PaymentRequirements;
              selectedReq = accepts.find((a) =>
                a.scheme === reqSel.scheme &&
                a.network === reqSel.network &&
                a.maxAmountRequired === reqSel.maxAmountRequired &&
                'payTo' in a && 'payTo' in reqSel && String(a.payTo) === String((reqSel as { payTo: unknown }).payTo) &&
                'asset' in a && 'asset' in reqSel && String(a.asset) === String((reqSel as { asset: unknown }).asset)
              ) ?? undefined;
            }
          }
        }
      }

      // Default or fallback selection
      const req = selectedReq ?? (
        accepts.find((a) => a?.scheme === "exact" && supportedNetworks.includes(a.network))
        ?? accepts.find((a) => a?.scheme === "exact")
        ?? accepts[0]
      );

      if (!req || req.scheme !== "exact") {
        return res;
      }

      const maxAmountRequired = BigInt(req.maxAmountRequired);
      if (maxAmountRequired > maxPaymentValue) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Payment exceeds client cap: ${maxAmountRequired} > ${maxPaymentValue}`
            }
          ]
        };
      }

      // Use x402/client to get the X-PAYMENT token with MultiNetworkSigner
      const token = await createPaymentHeader(
        signer,
        version ?? 1,
        req
      );

      // Call the tool with the payment token
      const paidRes = await _callTool(
        {
          ...params,
          _meta: {
            ...(params._meta ?? {}),
            "x402/payment": token
          }
        },
        resultSchema,
        options
      );
      return paidRes;
    }

    return res;
  };

  const _client = client as X402AugmentedClient & T;
  _client.listTools = listTools;
  Object.defineProperty(_client, "callTool", {
    value: callToolWithPayment,
    writable: false,
    enumerable: false,
    configurable: true
  });

  return _client;
}
