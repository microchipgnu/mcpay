import type { Step } from "./types";
import { UpstreamService } from "./upstream-service";

export const retriesStep: Step = async (ctx) => {
    const DEFAULT_MAX_RETRIES = 3;
    const DEFAULT_BASE_DELAY_MS = 2000;
    function parseRetryAfterMs(headerValue: string | null | undefined, fallbackMs: number): number {
        if (!headerValue) return fallbackMs;
        const trimmed = headerValue.trim();
        const asNum = Number(trimmed);
        if (!Number.isNaN(asNum)) return Math.max(0, Math.floor(asNum * 1000));
        const dateMs = Date.parse(trimmed);
        if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
        return fallbackMs;
    }
    async function sleepMs(ms: number) { if (ms > 0) await new Promise(r => setTimeout(r, ms)); }

    async function fetchWithBackoff(input: string, init: RequestInit = {}, maxRetries = DEFAULT_MAX_RETRIES, baseDelayMs = DEFAULT_BASE_DELAY_MS): Promise<Response> {
        let lastError: unknown = undefined;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            let res: Response | undefined = undefined;
            try {
                res = await UpstreamService.fetch(input, init);
                const status = res.status;
                const shouldRetry = status === 429 || (status >= 500 && status < 600);
                if (!shouldRetry) return res;
                lastError = new Error(`${status} from ${new URL(input).hostname}`);
                if (attempt < maxRetries) {
                    const retryAfterHeader = res.headers.get('retry-after');
                    const calculatedDelay = parseRetryAfterMs(retryAfterHeader, baseDelayMs * Math.pow(2, attempt));
                    const delayMs = calculatedDelay + Math.random() * 1000;
                    // eslint-disable-next-line no-console
                    console.log(`[${new Date().toISOString()}] ${status} from ${new URL(input).hostname}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
                    await sleepMs(delayMs);
                    continue;
                }
                return res;
            } catch (err) {
                lastError = err;
                if (attempt < maxRetries) {
                    const delayMs = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
                    // eslint-disable-next-line no-console
                    console.log(`[${new Date().toISOString()}] Network error fetching ${new URL(input).hostname}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
                    await sleepMs(delayMs);
                    continue;
                }
                throw lastError instanceof Error ? lastError : new Error(String(lastError));
            }
        }
        throw lastError instanceof Error ? lastError : new Error('Maximum retries exceeded');
    }
    ctx.fetchWithRetry = async (url: URL, init?: RequestInit, options?: { maxRetries?: number; baseDelayMs?: number }) => {
        const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
        const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
        return fetchWithBackoff(url.toString(), init ?? {}, maxRetries, baseDelayMs);
    };
    return ctx;
};

export default retriesStep;


