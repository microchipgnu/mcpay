import type { Step } from "./types";
import { txOperations, withTransaction } from "@/lib/gateway/db/actions";
import { fromBaseUnits } from "@/lib/commons";
import { captureResponseData } from "./utils";

export const analyticsStep: Step = async (ctx) => {
    const toolCall = ctx.toolCall || undefined;
    const upstream = ctx.rawUpstreamResponse || ctx.upstreamResponse;
    if (!toolCall || !upstream) return ctx;
    const user = ctx.user || null;
    const authMethod = ctx.authMethod;
    const effectiveStart = typeof ctx.startTime === 'number' ? ctx.startTime : Date.now();
    const responseData = await captureResponseData(upstream);
    try {
        const pickedPricing = ctx.pickedPricing;
        await withTransaction(async (tx) => {
            await txOperations.recordToolUsage({ toolId: (toolCall.toolId as string) || 'unknown', userId: user?.id, responseStatus: upstream.status.toString(), executionTimeMs: Date.now() - effectiveStart, ipAddress: ctx.req.headers.get('x-forwarded-for') || ctx.req.headers.get('x-real-ip') || undefined, userAgent: ctx.req.headers.get('user-agent') || undefined, requestData: { toolName: toolCall.name, args: toolCall.args, authMethod }, result: responseData })(tx);
            const paymentAmount = pickedPricing?.maxAmountRequiredRaw || "0";
            if (toolCall.isPaid && paymentAmount && pickedPricing) {
                try {
                    const isBaseUnits = /^\d+$/.test(paymentAmount);
                    const humanAmount = isBaseUnits ? fromBaseUnits(paymentAmount, pickedPricing.tokenDecimals) : paymentAmount;
                    // eslint-disable-next-line no-console
                    console.log(`[${new Date().toISOString()}] Analytics: Revenue ${humanAmount} ${pickedPricing.assetAddress}`);
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.log(`[${new Date().toISOString()}] Analytics: Revenue conversion failed, using amount as-is: ${paymentAmount} (error: ${error})`);
                }
            }
        });
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`[${new Date().toISOString()}] Analytics recording error:`, e);
    }
    return ctx;
};

export default analyticsStep;


