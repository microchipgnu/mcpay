import type { Step } from "./types";
import { fromBaseUnits } from "@/lib/commons";
import { extractApiKey } from "@/lib/gateway/auth-utils";
import { txOperations, withTransaction } from "@/lib/gateway/db/actions";
import { createExactPaymentRequirements, decodePayment } from "@/lib/gateway/payments";
import type { SupportedNetwork } from "@/types/x402";
import { createFacilitator } from "@/types/x402";
import { getFacilitatorUrl } from "@/lib/gateway/env";
import { attemptAutoSign } from "@/lib/gateway/payment-strategies";
import { tryParseJson } from "./utils";

export const paymentPreAuthStep: Step = async (ctx) => {
    try {
        const toolCall = ctx.toolCall;
        const pickedPricing = ctx.pickedPricing;
        if (!toolCall?.isPaid) return ctx;
        if (!pickedPricing || !toolCall.payTo) {
            ctx.response = new Response(JSON.stringify({ x402Version: 1, error: 'No payment information available', accepts: [] }), { status: 402, headers: { 'content-type': 'application/json' } });
            return ctx;
        }
        const humanReadableAmount = fromBaseUnits(pickedPricing.maxAmountRequiredRaw, pickedPricing.tokenDecimals);
        const paymentRequirements = [
            createExactPaymentRequirements(humanReadableAmount, pickedPricing.network as SupportedNetwork, `mcpay://${toolCall.name}` as `${string}://${string}`, `Execution of ${toolCall.name}`, toolCall.payTo as `0x${string}`)
        ];
        // Auto-sign if allowed
        const url = new URL(ctx.req.url);
        const searchParams = url.searchParams;
        let bodyParams: Record<string, unknown> | undefined = undefined;
        try { const json = await tryParseJson(ctx.req); if (json && typeof json === 'object') bodyParams = json as Record<string, unknown>; } catch {}
        const hasApiKey = !!extractApiKey({ headers: ctx.req.headers, searchParams, bodyParams });
        const managedWalletHeaders = ((ctx.req.headers.get('x-wallet-provider') || '').toLowerCase() === 'coinbase-cdp' && (ctx.req.headers.get('x-wallet-type') || '').toLowerCase() === 'managed');
        const shouldAutoSign = !ctx.paymentHeader && (hasApiKey || managedWalletHeaders);
        if (shouldAutoSign) {
            try {
                const autoSignResult = await attemptAutoSign(ctx.hono, { isPaid: true, payment: { maxAmountRequired: humanReadableAmount, network: pickedPricing.network, asset: pickedPricing.assetAddress, payTo: toolCall.payTo, resource: `mcpay://${toolCall.name}` as `${string}://${string}`, description: `Execution of ${toolCall.name}` } }, (() => { const u = ctx.user; if (!u) return undefined; return { id: u.id, email: u.email || undefined, name: u.name || undefined, displayName: u.displayName || undefined }; })());
                if (autoSignResult.success && autoSignResult.signedPaymentHeader) { ctx.paymentHeader = autoSignResult.signedPaymentHeader; }
            } catch {}
        }
        // Require payment header
        const existingHeader = ctx.req.headers.get('X-PAYMENT') || ctx.req.headers.get('x-payment') || undefined;
        ctx.paymentHeader = ctx.paymentHeader || existingHeader;
        if (!ctx.paymentHeader) {
            ctx.response = new Response(JSON.stringify({ x402Version: 1, error: 'X-PAYMENT header is required', accepts: paymentRequirements }), { status: 402, headers: { 'content-type': 'application/json' } });
            return ctx;
        }
        // Verify
        try {
            const decoded = decodePayment(ctx.paymentHeader);
            const requirement = paymentRequirements[0]!;
            const facilitatorUrl = getFacilitatorUrl(requirement.network);
            const facilitator = createFacilitator({ url: facilitatorUrl as `${string}://${string}` });
            const resp = await facilitator.verify(decoded, requirement);
            if (!resp.isValid) {
                ctx.response = new Response(JSON.stringify({ x402Version: 1, error: resp.invalidReason, accepts: paymentRequirements, payer: resp.payer }), { status: 402, headers: { 'content-type': 'application/json' } });
                return ctx;
            }
        } catch (error) {
            ctx.response = new Response(JSON.stringify({ x402Version: 1, error, accepts: paymentRequirements }), { status: 402, headers: { 'content-type': 'application/json' } });
            return ctx;
        }
        // Persist pending (best-effort)
        try {
            const signedHeader = ctx.paymentHeader;
            if (signedHeader && pickedPricing && toolCall.toolId) {
                await withTransaction(async (tx) => {
                    const existing = await txOperations.getPaymentBySignature(signedHeader)(tx);
                    if (!existing) {
                        let payerAddress: string | undefined = undefined;
                        try { const decodedForPayer = decodePayment(signedHeader); payerAddress = decodedForPayer.payload.authorization.from; } catch {}
                        const user = ctx.user || null;
                        await txOperations.createPayment({ toolId: toolCall.toolId as string, userId: user?.id, amountRaw: pickedPricing.maxAmountRequiredRaw, tokenDecimals: pickedPricing.tokenDecimals, currency: pickedPricing.assetAddress, network: pickedPricing.network, status: 'pending', signature: signedHeader, paymentData: payerAddress ? { payer: payerAddress } : undefined, })(tx);
                    }
                });
            }
        } catch {}
        return ctx;
    } catch { return ctx; }
};

export default paymentPreAuthStep;


