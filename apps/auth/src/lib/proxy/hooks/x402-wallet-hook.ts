import type { Hook } from "mcpay/handler";
import { attemptAutoSign } from "../../3rd-parties/payment-strategies/index.js";
import { auth } from "../../auth.js";
import type { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { RequestExtra, ToolCallResponseHookResult } from "mcpay/handler";
import { PaymentRequirements } from "x402/types";


type X402ErrorPayload = {
    x402Version?: number;
    error?: string;
    accepts?: Array<{
        scheme: string;
        network: string;
        maxAmountRequired: string;
        payTo?: string;
        asset: string;
        maxTimeoutSeconds?: number;
        resource?: string;
        mimeType?: string;
        description?: string;
        extra?: Record<string, unknown>;
    }>;
};

function isPaymentRequired(res: any): X402ErrorPayload | null {
    const meta = (res?._meta as Record<string, unknown> | undefined) ?? null;
    if (!meta) return null;
    const payload = meta["x402/error"] as X402ErrorPayload | undefined;
    if (!payload) return null;
    if (!payload.error) return null;
    // Treat any pricing-related error as an opportunity to auto-pay
    const codes = new Set(["PAYMENT_REQUIRED", "INVALID_PAYMENT", "UNABLE_TO_MATCH_PAYMENT_REQUIREMENTS", "PRICE_COMPUTE_FAILED"]);
    return codes.has(payload.error) ? payload : null;
}

export class X402WalletHook implements Hook {
    name = "x402-wallet";

    async processCallToolRequest(req: CallToolRequest, _extra: RequestExtra) {
        return { resultType: "continue" as const, request: req };
    }

    async processCallToolResult(res: CallToolResult, req: CallToolRequest, extra: RequestExtra): Promise<ToolCallResponseHookResult> {
        try {
            console.log("[X402WalletHook] processCallToolResult called");
            const payload = isPaymentRequired(res);
            if (!payload) {
                console.log("[X402WalletHook] No payment required, continuing.");
                return { resultType: "continue" as const, response: res };
            }

            // Must have an authenticated user to auto-pay
            const session = await auth.api.getSession({ headers: (extra?.inboundHeaders as Headers) ?? new Headers() });
            if (!session?.user?.id) {
                console.log("[X402WalletHook] No authenticated user found, cannot auto-pay.");
                return { resultType: "continue" as const, response: res };
            }

            const first = Array.isArray(payload.accepts) && payload.accepts.length > 0 ? payload.accepts[0] : null;
            if (!first) {
                console.log("[X402WalletHook] No acceptable payment option found in payload, continuing.");
                return { resultType: "continue" as const, response: res };
            }

            const toolName = String((req?.params as unknown as { name?: string })?.name ?? "");
            const toolCall = {
                isPaid: true,
                payment: {
                    maxAmountRequired: String(first.maxAmountRequired),
                    network: String(first.network),
                    asset: String(first.asset),
                    payTo: typeof first.payTo === "string" ? first.payTo : undefined,
                    resource: String(first.resource ?? `mcp://${toolName}`),
                    description: String(first.description ?? (toolName ? `Paid access to ${toolName}` : "Paid access")),
                },
            } as const;

            const user = {
                id: String(session.user.id),
                email: session.user.email as string | undefined,
                name: (session.user as unknown as { name?: string }).name,
                displayName: (session.user as unknown as { displayName?: string }).displayName,
            } as const;

            console.log("[X402WalletHook] Attempting auto-sign with toolCall:", toolCall, "user:", user);

            const result = await attemptAutoSign(payload.accepts as PaymentRequirements[], user);
            if (!result.success || !result.signedPaymentHeader) {
                console.log("[X402WalletHook] Auto-sign failed or no signedPaymentHeader returned. Result:", result);
                return { resultType: "continue" as const, response: res };
            }

            // Ask proxy to retry with x402/payment token
            const originalParams = (req?.params ?? {}) as Record<string, unknown>;
            const originalMeta = (originalParams["_meta"] as Record<string, unknown> | undefined) ?? {};
            const inferredName = typeof (originalParams)?.name === "string" ? String((originalParams).name) : toolName;
            const nextMeta = { ...originalMeta, ["x402/payment"]: result.signedPaymentHeader } as Record<string, unknown>;
            const nextParams = { ...originalParams, name: inferredName, _meta: nextMeta } as Record<string, unknown>;
            const nextRequest = { method: "tools/call" as const, params: nextParams } as CallToolRequest;

            console.log("[X402WalletHook] Auto-sign succeeded, retrying with signed payment header.");

            return { resultType: "retry" as const, request: nextRequest };
        } catch (err) {
            console.error("[X402WalletHook] Error in processCallToolResult:", err);
            return { resultType: "continue" as const, response: res };
        }
    }
}

