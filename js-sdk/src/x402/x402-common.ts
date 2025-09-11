import { getAddress, type Address } from 'viem';
import { exact } from 'x402/schemes';
import { findMatchingPaymentRequirements, processPriceToAtomicAmount } from 'x402/shared';
import {
  SupportedEVMNetworks,
  SupportedSVMNetworks,
  type Network,
  type PaymentPayload,
  type PaymentRequirements,
  type Price,
  type SettleResponse,
} from 'x402/types';
import { useFacilitator } from 'x402/verify';

type FacilitatorOptions = Parameters<typeof useFacilitator>[0];

export interface BuildRequirementsArgs {
  toolName: string;
  price: Price;
  payTo: Partial<Record<Network, Address | string>>;
  facilitator?: FacilitatorOptions;
  networks?: Network[];
  resourcePrefix?: string; // e.g., 'mcp' or 'mcpay-sdk'
}

export async function buildPaymentRequirementsForTool({
  toolName,
  price,
  payTo,
  facilitator,
  networks,
  resourcePrefix = 'mcp',
}: BuildRequirementsArgs): Promise<PaymentRequirements[]> {
  const requirements: PaymentRequirements[] = [];

  // Lazy fetch facilitator kinds only if needed for SVM
  let facilitatorKinds: { kinds: Array<{ network: string; scheme: string; extra?: Record<string, unknown> }> } | null = null;

  const targetNetworks: Network[] = networks ?? (Object.keys(payTo) as Network[]);

  for (const network of targetNetworks) {
    if (!network) continue;

    const payToAddress = payTo[network];
    if (!payToAddress) continue;

    const atomic = processPriceToAtomicAmount(price, network);
    if ('error' in atomic) throw new Error(atomic.error);
    const { maxAmountRequired, asset } = atomic;

    if (SupportedEVMNetworks.includes(network)) {
      const extra = ('eip712' in asset ? (asset as { eip712?: Record<string, unknown> }).eip712 : undefined) as
        | Record<string, unknown>
        | undefined;
      const normalizedPayTo = typeof payToAddress === 'string' ? getAddress(payToAddress) : (payToAddress as string);
      const normalizedAsset = getAddress((asset.address as unknown) as string);

      requirements.push({
        scheme: 'exact',
        network,
        maxAmountRequired,
        resource: `${resourcePrefix}://tool/${toolName}`,
        description: `Payment for MCP tool: ${toolName}`,
        mimeType: 'application/json',
        payTo: normalizedPayTo,
        maxTimeoutSeconds: 60,
        asset: normalizedAsset,
        outputSchema: undefined,
        extra,
      });
      continue;
    }

    if (SupportedSVMNetworks.includes(network)) {
      if (!facilitatorKinds) {
        const { supported } = useFacilitator(facilitator);
        facilitatorKinds = await supported();
      }

      let feePayer: string | undefined;
      for (const kind of facilitatorKinds.kinds) {
        if (kind.network === network && kind.scheme === 'exact') {
          feePayer = kind?.extra?.feePayer as string | undefined;
          break;
        }
      }

      if (!feePayer) {
        throw new Error(`The facilitator did not provide a fee payer for network: ${network}.`);
      }

      requirements.push({
        scheme: 'exact',
        network,
        maxAmountRequired,
        resource: `${resourcePrefix}://tool/${toolName}`,
        description: `Payment for MCP tool: ${toolName}`,
        mimeType: 'application/json',
        payTo: payToAddress as string,
        maxTimeoutSeconds: 60,
        asset: asset.address as string,
        outputSchema: undefined,
        extra: { feePayer },
      });
      continue;
    }

    throw new Error(`Unsupported network: ${network}`);
  }

  return requirements;
}

export function findPaidToolCallFromBody(
  body: unknown,
  toolPricing: Record<string, Price>
): { toolName: string; price: Price } | null {
  const items: unknown[] = Array.isArray(body) ? body : [body];
  const call = items.find((m): m is { method: string; params: { name: string } } => {
    if (!m || typeof m !== 'object') return false;
    const maybe = m as { method?: unknown; params?: unknown };
    if (maybe.method !== 'tools/call') return false;
    if (!maybe.params || typeof maybe.params !== 'object') return false;
    const name = (maybe.params as { name?: unknown }).name;
    return typeof name === 'string' && toolPricing[name] != null;
  });
  if (!call) return null;
  const toolName = call.params.name;
  return { toolName, price: toolPricing[toolName] as Price };
}

export function decodePaymentHeaderOrThrow(header: string): PaymentPayload {
  const paymentPayload = exact.evm.decodePayment(header);
  paymentPayload.x402Version = 1;
  return paymentPayload;
}

export interface VerifyPaymentArgs {
  toolName: string;
  price: Price;
  payTo: Partial<Record<Network, Address | string>>;
  facilitator?: FacilitatorOptions;
  payment: PaymentPayload;
  networks?: Network[];
  resourcePrefix?: string;
}

export async function verifyPaymentForTool({
  toolName,
  price,
  payTo,
  facilitator,
  payment,
  networks,
  resourcePrefix = 'mcp',
}: VerifyPaymentArgs): Promise<{
  isValid: boolean;
  selectedRequirements?: PaymentRequirements;
  accepts: PaymentRequirements[];
  invalidReason?: string;
}> {
  const accepts = await buildPaymentRequirementsForTool({
    toolName,
    price,
    payTo,
    facilitator,
    networks,
    resourcePrefix,
  });

  const selected = findMatchingPaymentRequirements(accepts, payment);
  if (!selected) {
    return {
      isValid: false,
      accepts,
      invalidReason: 'Unable to find matching payment requirements',
    };
  }

  const { verify } = useFacilitator(facilitator);
  const verifyResp = await verify(payment, selected);

  return {
    isValid: verifyResp.isValid,
    selectedRequirements: selected,
    accepts,
    invalidReason: verifyResp.invalidReason,
  };
}

export function decorateJsonRpcWithSettlement(text: string, settleResp: SettleResponse): string {
  const parsed = (() => {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return undefined;
    }
  })();

  if (!parsed) return text;

  if (Array.isArray(parsed)) {
    for (const m of parsed as Array<Record<string, unknown>>) {
      const jsonrpc = m?.jsonrpc;
      const id = (m as { id?: unknown }).id;
      const hasResult = Object.prototype.hasOwnProperty.call(m, 'result');
      if (jsonrpc === '2.0' && hasResult && id != null) {
        (m as { result: Record<string, unknown> }).result = {
          ...(m as { result?: Record<string, unknown> }).result,
          x402Settlement: { transactionHash: settleResp.transaction, settled: true },
        };
      }
    }
    return JSON.stringify(parsed);
  }

  if (
    (parsed as { jsonrpc?: unknown })?.jsonrpc === '2.0' &&
    Object.prototype.hasOwnProperty.call(parsed as object, 'result') &&
    (parsed as { id?: unknown }).id != null
  ) {
    (parsed as { result: Record<string, unknown> }).result = {
      ...(parsed as { result?: Record<string, unknown> }).result,
      x402Settlement: { transactionHash: settleResp.transaction, settled: true },
    };
    return JSON.stringify(parsed);
  }

  return text;
}

export async function settlePaymentForSelected({
  payment,
  selectedRequirements,
  facilitator,
}: {
  payment: PaymentPayload;
  selectedRequirements: PaymentRequirements;
  facilitator?: FacilitatorOptions;
}): Promise<SettleResponse> {
  const { settle } = useFacilitator(facilitator);
  return settle(payment, selectedRequirements);
}


