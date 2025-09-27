import { Context } from "hono";
import type { Step, PipelineCtx } from "./steps/types";
import requestTimingStep from "./steps/request-timing";
import requestLoggerStep from "./steps/request-logger";
import jsonrpcAcceptStep from "./steps/jsonrpc-accept";
import authResolutionStep from "./steps/auth-resolution";
import inspectToolCallStep from "./steps/inspect-tool-call";
import browserHeadersStep from "./steps/browser-headers";
import forwardStep from "./steps/forward";
import cacheReadStep from "./steps/cache-read";
import rateLimitStep from "./steps/rate-limit";
import paymentPreAuthStep from "./steps/payment-preauth";
import retriesStep from "./steps/retries";
import upstreamStep from "./steps/upstream";
import cacheWriteStep from "./steps/cache-write";
import paymentCaptureStep from "./steps/payment-capture";
import analyticsStep from "./steps/analytics";

export type { PipelineCtx };

export async function run(steps: Step[], ctx: PipelineCtx): Promise<Response> {
    for (const step of steps) {
        ctx = await step(ctx);
        if (ctx.response) return ctx.response; // short-circuit
    }
    // fallthrough: upstreamResponse or a response written in Hono context
    if (ctx.upstreamResponse) return ctx.upstreamResponse;
    return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 });
}

// Default pipeline in the correct order
export const PIPELINE_STEPS: Step[] = [
    requestTimingStep,
    requestLoggerStep,
    jsonrpcAcceptStep,
    authResolutionStep,
    inspectToolCallStep,
    browserHeadersStep,
    forwardStep,
    cacheReadStep,
    rateLimitStep,
    paymentPreAuthStep,
    retriesStep,
    upstreamStep,
    cacheWriteStep,
    paymentCaptureStep,
    analyticsStep,
];

const pipeline = {
    run,
    PIPELINE_STEPS,
};

export default pipeline;


