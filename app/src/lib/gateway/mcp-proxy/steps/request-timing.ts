import type { Step } from "./types";

export const requestTimingStep: Step = async (ctx) => {
    if (!ctx.startTime) ctx.startTime = Date.now();
    return ctx;
};

export default requestTimingStep;


