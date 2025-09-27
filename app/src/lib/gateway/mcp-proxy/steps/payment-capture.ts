import type { Step } from "./types";
import { txOperations, withTransaction } from "@/lib/gateway/db/actions";
import { decodePayment, settle, createExactPaymentRequirements } from "@/lib/gateway/payments";
import { fromBaseUnits } from "@/lib/commons";
import type { SupportedNetwork } from "@/types/x402";

export const paymentCaptureStep: Step = async (ctx) => {
    try {
        const toolCall = ctx.toolCall;
        const pickedPricing = ctx.pickedPricing;
        if (!toolCall?.isPaid || !pickedPricing) return ctx;
        const res = ctx.upstreamResponse;
        if (!res || res.status >= 400) return ctx;
        const cacheHeader = res.headers.get('x-mcpay-cache') || '';
        if (cacheHeader.toUpperCase() === 'HIT') return ctx;
        const signed = ctx.paymentHeader || ctx.req.headers.get('X-PAYMENT') || undefined;
        if (!signed) return ctx;
        let settleResponse: Awaited<ReturnType<typeof settle>> | undefined;
        try {
            const decoded = decodePayment(signed);
            const humanReadableAmount = fromBaseUnits(pickedPricing.maxAmountRequiredRaw, pickedPricing.tokenDecimals);
            const requirement = createExactPaymentRequirements(humanReadableAmount, pickedPricing.network as SupportedNetwork, `mcpay://${toolCall.name}` as `${string}://${string}`, `Execution of ${toolCall.name}`, toolCall.payTo as `0x${string}`);
            settleResponse = await settle(decoded, requirement);
        } catch { return ctx; }
        if (!settleResponse || settleResponse.success === false) return ctx;
        try {
            const headerCandidate = (settleResponse as { header?: string } | undefined)?.header;
            if (headerCandidate) {
                res.headers.set('X-PAYMENT-RESPONSE', headerCandidate);
                const prevExpose = res.headers.get('Access-Control-Expose-Headers');
                const exposeVal = prevExpose && prevExpose.length > 0 ? `${prevExpose}, X-PAYMENT-RESPONSE` : 'X-PAYMENT-RESPONSE';
                res.headers.set('Access-Control-Expose-Headers', exposeVal);
            }
        } catch {}
        try {
            const signedHeader = signed;
            if (signedHeader && toolCall.toolId) {
                await withTransaction(async (tx) => {
                    const existing = await txOperations.getPaymentBySignature(signedHeader)(tx);
                    if (existing) {
                        await txOperations.updatePaymentStatus(existing.id, 'completed', settleResponse!.transaction)(tx);
                    } else {
                        const user = ctx.user || null;
                        await txOperations.createPayment({ toolId: toolCall.toolId as string, userId: user?.id, amountRaw: pickedPricing.maxAmountRequiredRaw, tokenDecimals: pickedPricing.tokenDecimals, currency: pickedPricing.assetAddress, network: pickedPricing.network, transactionHash: settleResponse!.transaction, status: 'completed', signature: signedHeader, paymentData: { payer: settleResponse!.payer, network: settleResponse!.network }, })(tx);
                    }
                });
            }
        } catch {}
        return ctx;
    } catch { return ctx; }
};

export default paymentCaptureStep;


