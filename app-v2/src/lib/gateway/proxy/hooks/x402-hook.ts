import type { CallToolRequest, CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import type { FacilitatorConfig, Network, PaymentPayload, PaymentRequirements, Price } from "x402/types";
import { SupportedEVMNetworks, SupportedSVMNetworks } from "x402/types";
import { decodePayment as decodeX402Payment } from "x402/schemes";
import { findMatchingPaymentRequirements, processPriceToAtomicAmount } from "x402/shared";
import { useFacilitator } from "x402/verify";
import { getAddress } from "viem";
import type { Hook, RequestExtra } from ".";

export type RecipientWithTestnet = { address: string; isTestnet?: boolean };
export type X402ProxyConfig = {
    recipient: Partial<Record<Network, string>> | Partial<Record<"evm" | "svm", RecipientWithTestnet>>;
    facilitator: FacilitatorConfig;
    version?: number;
    prices: Record<string, Price>; // toolName -> Price
};

type SettlementCtx = { decoded: PaymentPayload; selected: PaymentRequirements };

export class X402MonetizationHook implements Hook {
    name = "x402-monetization";
    private readonly cfg: X402ProxyConfig;
    private readonly verify: ReturnType<typeof useFacilitator>["verify"];
    private readonly settle: ReturnType<typeof useFacilitator>["settle"];
    private readonly x402Version: number;
    private readonly pending = new Map<string | number, SettlementCtx>();

    constructor(cfg: X402ProxyConfig) {
        this.cfg = cfg;
        const { verify, settle } = useFacilitator(cfg.facilitator);
        this.verify = verify;
        this.settle = settle;
        this.x402Version = cfg.version ?? 1;
    }

    private normalizeRecipients(r: X402ProxyConfig["recipient"]): Partial<Record<Network, string>> {
        if (!r || typeof r !== "object") return {};
        const out: Partial<Record<Network, string>> = {};

        const isTestnetNetwork = (network: Network): boolean =>
            network.includes("sepolia") ||
            network.includes("fuji") ||
            network.includes("devnet") ||
            network.includes("testnet") ||
            network.includes("amoy");

        const maybeFamily = r as Partial<Record<"evm" | "svm", RecipientWithTestnet>>;
        if (maybeFamily.evm?.address) {
            const useTestnet = maybeFamily.evm.isTestnet;
            for (const net of SupportedEVMNetworks) {
                if (useTestnet === undefined || isTestnetNetwork(net) === !!useTestnet) {
                    out[net] = maybeFamily.evm.address;
                }
            }
        }
        if (maybeFamily.svm?.address) {
            const useTestnet = maybeFamily.svm.isTestnet;
            for (const net of SupportedSVMNetworks) {
                if (useTestnet === undefined || isTestnetNetwork(net) === !!useTestnet) {
                    out[net] = maybeFamily.svm.address;
                }
            }
        }

        const allKnown = new Set<Network>([...SupportedEVMNetworks, ...SupportedSVMNetworks]);
        for (const [key, value] of Object.entries(r as Record<string, unknown>)) {
            if (typeof value === "string" && allKnown.has(key as Network)) {
                out[key as Network] = value;
            }
        }
        return out;
    }

    private async buildRequirements(toolName: string, description: string, price: Price) {
        const recipientsByNetwork = this.normalizeRecipients(this.cfg.recipient);
        const reqs: PaymentRequirements[] = [];

        let facilitatorKinds: { kinds: Array<{ network: string; scheme: string; extra?: Record<string, unknown> }> } | null = null;
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
                    resource: `mcp://${toolName}`,
                    mimeType: "application/json",
                    description,
                    extra,
                });
                continue;
            }

            if (SupportedSVMNetworks.includes(network)) {
                if (!facilitatorKinds) {
                    try {
                        const { supported } = useFacilitator(this.cfg.facilitator);
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
                    resource: `mcp://${toolName}`,
                    mimeType: "application/json",
                    description,
                    extra: { feePayer },
                });
                continue;
            }
        }

        return reqs;
    }

    private paymentRequired(accepts: PaymentRequirements[], reason: string, extraFields: Record<string, unknown> = {}): CallToolResult {
        const payload = { x402Version: this.x402Version, error: reason, accepts, ...extraFields } as const;
        return {
            isError: true,
            _meta: { "x402/error": payload } as Record<string, unknown>,
            content: [{ type: "text", text: JSON.stringify(payload) }],
        };
    }

    async processCallToolRequest(req: CallToolRequest, extra: RequestExtra) {
        const name = String((req?.params as any)?.name ?? "");
        if (!name) return { resultType: "continue" as const, request: req };

        const price = this.cfg.prices[name];
        if (!price) return { resultType: "continue" as const, request: req };

        const description = `Paid access to ${name}`;
        const accepts = await this.buildRequirements(name, description, price);
        if (!accepts.length) {
            return { resultType: "respond" as const, response: this.paymentRequired(accepts, "PRICE_COMPUTE_FAILED") };
        }

        const params = (req.params ?? {}) as Record<string, unknown>;
        const meta = (params._meta as Record<string, unknown> | undefined) ?? {};
        const token = typeof meta["x402/payment"] === "string" ? (meta["x402/payment"] as string) : undefined;

        if (!token) {
            return { resultType: "respond" as const, response: this.paymentRequired(accepts, "PAYMENT_REQUIRED") };
        }

        let decoded: PaymentPayload;
        try {
            decoded = decodeX402Payment(token);
            decoded.x402Version = this.x402Version;
        } catch {
            return { resultType: "respond" as const, response: this.paymentRequired(accepts, "INVALID_PAYMENT") };
        }

        const selected = findMatchingPaymentRequirements(accepts, decoded);
        if (!selected) {
            return { resultType: "respond" as const, response: this.paymentRequired(accepts, "UNABLE_TO_MATCH_PAYMENT_REQUIREMENTS") };
        }

        const vr = await this.verify(decoded, selected);
        if (!vr.isValid) {
            return {
                resultType: "respond" as const,
                response: this.paymentRequired(accepts, vr.invalidReason ?? "INVALID_PAYMENT", { payer: vr.payer }),
            };
        }

        this.pending.set(extra.requestId, { decoded, selected });
        return { resultType: "continue" as const, request: req };
    }

    async processCallToolResult(res: CallToolResult, _req: CallToolRequest, extra: RequestExtra) {
        const ctx = this.pending.get(extra.requestId);
        this.pending.delete(extra.requestId);

        // If not a paid tool or no context, pass through
        if (!ctx) return { resultType: "continue" as const, response: res };

        const failed =
            !!res?.isError ||
            (Array.isArray(res?.content) && res.content.length === 1 && typeof (res.content[0] as any)?.text === "string" &&
                (res.content[0] as any).text.includes("error"));

        if (failed) return { resultType: "continue" as const, response: res };

        try {
            const s = await this.settle(ctx.decoded, ctx.selected);
            if (s.success) {
                const meta = ((res._meta as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
                meta["x402/payment-response"] = {
                    success: true,
                    transaction: s.transaction,
                    network: s.network,
                    payer: s.payer,
                };
                const content = Array.isArray(res.content) ? [...res.content] : [];
                const note = `Payment settled on ${s.network} (tx: ${s.transaction ?? "n/a"}).`;
                const idx = content.findIndex((c) => c && (c as any).type === "text");
                if (idx >= 0) {
                    const t = content[idx] as TextContent;
                    content[idx] = { ...t, text: `${t.text}\n\n${note}` };
                } else {
                    content.push({ type: "text", text: note } as TextContent);
                }
                const response: CallToolResult = { ...res, _meta: meta, content };
                return { resultType: "continue" as const, response };
            }
            const response = this.paymentRequired([], s.errorReason ?? "SETTLEMENT_FAILED");
            return { resultType: "continue" as const, response };
        } catch {
            const response = this.paymentRequired([], "SETTLEMENT_FAILED");
            return { resultType: "continue" as const, response };
        }
    }
}