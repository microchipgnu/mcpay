import type { McpServer, RegisteredTool, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { ZodRawShape } from "zod";

import { getAddress } from "viem";
import { decodePayment as decodeX402Payment } from "x402/schemes";
import { findMatchingPaymentRequirements, processPriceToAtomicAmount } from "x402/shared";
import type {
    FacilitatorConfig,
    Network,
    PaymentPayload,
    PaymentRequirements,
    Price,
} from "x402/types";
import { SupportedEVMNetworks, SupportedSVMNetworks } from "x402/types";
import { useFacilitator } from "x402/verify";

export type RecipientWithTestnet = {
  address: string;
  isTestnet?: boolean;
};

export type X402Config = {
  recipient:
    | Partial<Record<Network, string>>
    | Partial<Record<"evm" | "svm", RecipientWithTestnet>>;
  facilitator: FacilitatorConfig;
  version?: number;
};

export interface X402AugmentedServer {
  paidTool<Args extends ZodRawShape>(
    name: string,
    description: string,
    price: Price,
    paramsSchema: Args,
    annotations: ToolAnnotations,
    cb: ToolCallback<Args>
  ): RegisteredTool;
}

export function withX402<S extends McpServer>(
  server: S,
  cfg: X402Config
): S & X402AugmentedServer {
  const { verify, settle } = useFacilitator(cfg.facilitator);
  const x402Version = cfg.version ?? 1;

  function paidTool<Args extends ZodRawShape>(
    name: string,
    description: string,
    price: Price,
    paramsSchema: Args,
    annotations: ToolAnnotations,
    cb: ToolCallback<Args>
  ): RegisteredTool {
    return server.tool(
      name,
      description,
      paramsSchema,
      { ...annotations, paymentHint: true, paymentPriceUSD: price },
      (async (args, extra) => {
        // Normalize recipients to a per-network map, supporting evm/svm shorthands
        const normalizeRecipients = (
          r: X402Config["recipient"]
        ): Partial<Record<Network, string>> => {
          if (!r || typeof r !== "object") return {};

          const out: Partial<Record<Network, string>> = {};

          // Helper to detect if a network is a testnet
          const isTestnetNetwork = (network: Network): boolean => {
            return (
              network.includes("sepolia") ||
              network.includes("fuji") ||
              network.includes("devnet") ||
              network.includes("testnet") ||
              network.includes("amoy")
            );
          };

          // Expand evm/svm shorthands first
          const maybeFamily = r as Partial<Record<"evm" | "svm", RecipientWithTestnet>>;
          if (maybeFamily.evm && typeof maybeFamily.evm.address === "string") {
            const useTestnet = maybeFamily.evm.isTestnet;
            for (const net of SupportedEVMNetworks) {
              if (useTestnet === undefined || isTestnetNetwork(net) === !!useTestnet) {
                out[net] = maybeFamily.evm.address;
              }
            }
          }
          if (maybeFamily.svm && typeof maybeFamily.svm.address === "string") {
            const useTestnet = maybeFamily.svm.isTestnet;
            for (const net of SupportedSVMNetworks) {
              if (useTestnet === undefined || isTestnetNetwork(net) === !!useTestnet) {
                out[net] = maybeFamily.svm.address;
              }
            }
          }

          // Copy explicit per-network mappings (override expanded ones if present)
          const allKnown = new Set<Network>([...SupportedEVMNetworks, ...SupportedSVMNetworks]);
          for (const [key, value] of Object.entries(r as Record<string, unknown>)) {
            if (typeof value === "string" && allKnown.has(key as Network)) {
              out[key as Network] = value;
            }
          }

          return out;
        };

        const recipientsByNetwork = normalizeRecipients(cfg.recipient);

        // Build PaymentRequirements across supported networks
        const buildRequirements = async (): Promise<PaymentRequirements[]> => {
          const reqs: PaymentRequirements[] = [];
          let facilitatorKinds: { kinds: Array<{ network: string; scheme: string; extra?: Record<string, unknown> }> } | null = null;
          const { supported } = useFacilitator(cfg.facilitator);

          const networks = Object.keys(recipientsByNetwork) as Network[];
          for (const network of networks) {
            const payTo = recipientsByNetwork[network];
            if (!network || !payTo) continue;

            const atomic = processPriceToAtomicAmount(price, network);
            if ("error" in atomic) continue;
            const { maxAmountRequired, asset } = atomic;

            if (SupportedEVMNetworks.includes(network)) {
              const extra = ("eip712" in asset ? (asset as { eip712?: Record<string, unknown> }).eip712 : undefined) as
                | Record<string, unknown>
                | undefined;

              const normalizedPayTo = getAddress(String(payTo));
              const normalizedAsset = getAddress(String(asset.address));

              reqs.push({
                scheme: "exact" as const,
                network,
                maxAmountRequired,
                payTo: normalizedPayTo,
                asset: normalizedAsset,
                maxTimeoutSeconds: 300,
                resource: `mcp://${name}`,
                mimeType: "application/json",
                description,
                extra,
              });
              continue;
            }

            if (SupportedSVMNetworks.includes(network)) {
              if (!facilitatorKinds) {
                try {
                  facilitatorKinds = await supported();
                } catch {
                  continue;
                }
              }
              let feePayer: string | undefined;
              for (const kind of facilitatorKinds.kinds) {
                if (kind.network === network && kind.scheme === "exact") {
                  feePayer = (kind?.extra?.feePayer as string | undefined) ?? undefined;
                  break;
                }
              }
              if (!feePayer) continue;

              reqs.push({
                scheme: "exact" as const,
                network,
                maxAmountRequired,
                payTo: String(payTo),
                asset: String(asset.address),
                maxTimeoutSeconds: 300,
                resource: `mcp://${name}`,
                mimeType: "application/json",
                description,
                extra: { feePayer },
              });
              continue;
            }
          }

        return reqs;
        };

        const accepts = await buildRequirements();
        if (!accepts.length) {
          const payload = { x402Version, error: "PRICE_COMPUTE_FAILED" } as const;
          const err: CallToolResult = {
            isError: true,
            _meta: { "x402/error": payload },
            content: [{ type: "text", text: JSON.stringify(payload) }],
          };
          return err;
        }

        // Get token either from MCP _meta or from header
        const requestInfoUnknown: unknown = (extra as { requestInfo?: unknown }).requestInfo;
        const headersUnknown: unknown = requestInfoUnknown && (requestInfoUnknown as { headers?: unknown }).headers;
        const headerToken = (() => {
          if (!headersUnknown) return undefined;
          if (typeof (headersUnknown as Headers).get === "function") {
            return (headersUnknown as Headers).get("X-PAYMENT") ?? undefined;
          }
          if (typeof headersUnknown === "object" && headersUnknown !== null) {
            const rec = headersUnknown as Record<string, unknown>;
            const direct = rec["X-PAYMENT"] ?? rec["x-payment"];
            return typeof direct === "string" ? direct : undefined;
          }
          return undefined;
        })();

        const metaToken = (extra?._meta && (extra._meta as Record<string, unknown>)["x402/payment"]) as string | undefined;
        const token = metaToken ?? headerToken;

        const paymentRequired = (
          reason = "PAYMENT_REQUIRED",
          extraFields: Record<string, unknown> = {}
        ): CallToolResult => {
          const payload = {
            x402Version,
            error: reason,
            accepts,
            ...extraFields,
          } as const;
          return {
            isError: true,
            _meta: { "x402/error": payload },
            content: [{ type: "text", text: JSON.stringify(payload) }],
          };
        };

        if (!token || typeof token !== "string") return paymentRequired();

        // Decode & verify
        let decoded: PaymentPayload;
        try {
          decoded = decodeX402Payment(token);
          decoded.x402Version = x402Version;
        } catch {
          return paymentRequired("INVALID_PAYMENT");
        }

        const selected = findMatchingPaymentRequirements(accepts, decoded);
        if (!selected) {
          return paymentRequired("UNABLE_TO_MATCH_PAYMENT_REQUIREMENTS");
        }

        const vr = await verify(decoded, selected);
        if (!vr.isValid) {
          return paymentRequired(vr.invalidReason ?? "INVALID_PAYMENT", {
            payer: vr.payer,
          });
        }

        // Execute tool
        let result: CallToolResult;
        let failed = false;
        try {
          result = await cb(args, extra);
          if (
            result &&
            typeof result === "object" &&
            "isError" in result &&
            (result as { isError?: boolean }).isError
          ) {
            failed = true;
          }
        } catch (e) {
          failed = true;
          result = {
            isError: true,
            content: [
              { type: "text", text: `Tool execution failed: ${String(e)}` },
            ],
          };
        }

        // Settle only on success
        if (!failed) {
          try {
            const s = await settle(decoded, selected);
            if (s.success) {
              result._meta ??= {} as Record<string, unknown>;
              (result._meta as Record<string, unknown>)[
                "x402/payment-response"
              ] = {
                success: true,
                transaction: s.transaction,
                network: s.network,
                payer: s.payer,
              };
            } else {
              return paymentRequired(s.errorReason ?? "SETTLEMENT_FAILED");
            }
          } catch {
            return paymentRequired("SETTLEMENT_FAILED");
          }
        }

        return result;
      }) as ToolCallback<Args>
    );
  }

  Object.defineProperty(server, "paidTool", {
    value: paidTool,
    writable: false,
    enumerable: false,
    configurable: true,
  });

  return server as S & X402AugmentedServer;
}
