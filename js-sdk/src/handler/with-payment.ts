// withPayment.ts
import { exact } from "x402/schemes";
import { useFacilitator } from "x402/verify";
import { findMatchingPaymentRequirements, processPriceToAtomicAmount } from "x402/shared";
import { getAddress, type Address } from "viem";
import type { Network, PaymentRequirements, PaymentPayload, SettleResponse } from "x402/types";
import { settleResponseHeader, SupportedEVMNetworks, SupportedSVMNetworks } from "x402/types";

type Price = string; // e.g. "$0.01" or "0.00001 ETH"

type WithPaymentOptions = {
  /** Map tool name -> price */
  toolPricing: Record<string, Price>;
  /** Receiver addresses keyed by network */
  payTo: Partial<Record<Network, Address | string>>;
  /** Optional: facilitator configuration for x402 */
  facilitator?: Parameters<typeof useFacilitator>[0];
  /** If true, inject x402 settlement data into JSON-RPC result(s) */
  decorateResponse?: boolean;
  /** If true, also set an X-PAYMENT-RESPONSE header (if your stack uses it) */
  setResponseHeader?: boolean;
};

/** Build x402 "accepts" requirements across all configured networks */
async function getPaymentRequirementsForTool(
  toolName: string,
  price: Price,
  payTo: Partial<Record<Network, Address | string>>,
  facilitator: Parameters<typeof useFacilitator>[0] | undefined
): Promise<PaymentRequirements[]> {
  const requirements: PaymentRequirements[] = [];

  // Lazy fetch facilitator kinds only if needed for SVM
  let facilitatorKinds: { kinds: Array<{ network: string; scheme: string; extra?: Record<string, unknown> }> } | null = null;

  const networks = Object.keys(payTo) as Network[];
  for (const network of networks) {
    if (!network) continue;

    const payToAddress = payTo[network];
    if (!payToAddress) continue;

    const atomic = processPriceToAtomicAmount(price, network);
    if ("error" in atomic) throw new Error(atomic.error);
    const { maxAmountRequired, asset } = atomic;

    if (SupportedEVMNetworks.includes(network)) {
      const extra = ("eip712" in asset ? (asset as { eip712?: Record<string, unknown> }).eip712 : undefined) as
        | Record<string, unknown>
        | undefined;
      const normalizedPayTo = getAddress(payToAddress as string);
      const normalizedAsset = getAddress((asset.address as unknown) as string);

      requirements.push({
        scheme: "exact" as const,
        network,
        maxAmountRequired,
        resource: `mcpay-sdk://tool/${toolName}`,
        description: `Payment for MCP tool: ${toolName}`,
        mimeType: "application/json",
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
        if (kind.network === network && kind.scheme === "exact") {
          feePayer = kind?.extra?.feePayer as string | undefined;
          break;
        }
      }

      if (!feePayer) {
        throw new Error(`The facilitator did not provide a fee payer for network: ${network}.`);
      }

      requirements.push({
        scheme: "exact" as const,
        network,
        maxAmountRequired,
        resource: `mcpay-sdk://tool/${toolName}`,
        description: `Payment for MCP tool: ${toolName}`,
        mimeType: "application/json",
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

/** Find a paid tools/call in a JSON-RPC batch or single message */
function findPaidToolCall(body: unknown, toolPricing: Record<string, Price>) {
  const items: unknown[] = Array.isArray(body) ? body : [body];
  const call = items.find((m): m is { method: string; params: { name: string } } => {
    if (!m || typeof m !== "object") return false;
    const maybe = m as { method?: unknown; params?: unknown };
    if (maybe.method !== "tools/call") return false;
    if (!maybe.params || typeof maybe.params !== "object") return false;
    const name = (maybe.params as { name?: unknown }).name;
    return typeof name === "string" && toolPricing[name] != null;
  });
  if (!call) return null;
  const toolName = call.params.name;
  return { toolName, price: toolPricing[toolName] as Price };
}

/** Like withMcpAuth, but for X402 payments */
export function withPayment(
  handler: (req: Request) => Response | Promise<Response>,
  {
    toolPricing,
    payTo,
    facilitator,
    decorateResponse = true,
    setResponseHeader = false,
  }: WithPaymentOptions
) {
  return async (req: Request) => {
    // Only gate the write paths: POST /mcp and POST /message (SSE relay)
    const url = new URL(req.url);
    const isPost = req.method === "POST";
    const isMcp = url.pathname.endsWith("/mcp");
    const isMessage = url.pathname.endsWith("/message");
    if (!isPost || (!isMcp && !isMessage)) {
      return handler(req);
    }

    // Body may be non-JSON; if so, just pass through
    let bodyJson: unknown;
    try {
      bodyJson = await req.clone().json();
    } catch {
      return handler(req);
    }

    const paid = findPaidToolCall(bodyJson, toolPricing);
    if (!paid) {
      return handler(req);
    }

    // 1) Verify payment header
    const xPayment = req.headers.get("x-payment");
    if (!xPayment) {
      const accepts = await getPaymentRequirementsForTool(paid.toolName, paid.price, payTo, facilitator);
      return new Response(JSON.stringify({ x402Version: 1, error: "X-PAYMENT header is required", accepts }), {
        status: 402,
        headers: { "content-type": "application/json" },
      });
    }

    let paymentPayload: PaymentPayload;
    try {
      paymentPayload = exact.evm.decodePayment(xPayment);
      paymentPayload.x402Version = 1;
    } catch {
      const accepts = await getPaymentRequirementsForTool(paid.toolName, paid.price, payTo, facilitator);
      return new Response(JSON.stringify({ x402Version: 1, error: "Invalid payment header", accepts }), {
        status: 402,
        headers: { "content-type": "application/json" },
      });
    }

    const reqs = await getPaymentRequirementsForTool(paid.toolName, paid.price, payTo, facilitator);
    const selected = findMatchingPaymentRequirements(reqs, paymentPayload);
    if (!selected) {
      return new Response(JSON.stringify({ x402Version: 1, error: "Unable to match payment requirements", accepts: reqs }), {
        status: 402,
        headers: { "content-type": "application/json" },
      });
    }

    const { verify, settle } = useFacilitator(facilitator);
    const verifyResp = await verify(paymentPayload, selected);
    if (!verifyResp.isValid) {
      return new Response(JSON.stringify({
        x402Version: 1,
        error: verifyResp.invalidReason || "Payment verification failed",
        accepts: reqs,
      }), { status: 402, headers: { "content-type": "application/json" } });
    }

    // 2) Forward to the actual MCP handler
    const upstream = await handler(req);

    // 3) Optionally settle & decorate
    if (!decorateResponse && !setResponseHeader) return upstream;

    // We need to read the body to decorate; if that’s undesirable for streaming,
    // turn off decoration/header or handle settlement out-of-band.
    let text: string;
    try {
      text = await upstream.text();
    } catch {
      return upstream; // non-text / streamed: return as-is
    }

    let newText = text;
    let headers = new Headers(upstream.headers);


    let settleResp: SettleResponse;

    try {
    settleResp = await settle(paymentPayload, selected);

      if (decorateResponse) {
        const parsed = (() => { try { return JSON.parse(text); } catch { return undefined; } })();
        if (parsed) {
          if (Array.isArray(parsed)) {
            for (const m of parsed) {
              if (m?.jsonrpc === "2.0" && "result" in m && m.id != null) {
                m.result = {
                  ...m.result,
                  x402Settlement: { transactionHash: settleResp.transaction, settled: true },
                };
              }
            }
            newText = JSON.stringify(parsed);
          } else if (parsed?.jsonrpc === "2.0" && "result" in parsed && parsed.id != null) {
            parsed.result = {
              ...parsed.result,
              x402Settlement: { transactionHash: settleResp.transaction, settled: true },
            };
            newText = JSON.stringify(parsed);
          }
        }
      }

      if (setResponseHeader) {
        headers.set("X-PAYMENT-RESPONSE", settleResponseHeader(settleResp));
      }
    } catch {
      // Settlement failed—return original body/headers; you may choose to surface this instead.
    }

    return new Response(newText, { status: upstream.status, headers });
  };
}