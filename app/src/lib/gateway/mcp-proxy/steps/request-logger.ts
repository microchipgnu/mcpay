import type { Step } from "./types";
import { tryParseJson } from "./utils";

export const requestLoggerStep: Step = async (ctx) => {
    try {
        if (ctx.req.method.toUpperCase() === 'POST') {
            const json = await tryParseJson(ctx.req);
            if (json !== undefined) {
                // eslint-disable-next-line no-console
                console.log('\x1b[36m%s\x1b[0m', `[${new Date().toISOString()}] Request JSON:`, JSON.stringify(json, null, 2));
            }
        }
    } catch {}
    return ctx;
};

export default requestLoggerStep;


