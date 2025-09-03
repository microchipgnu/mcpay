import type { Step } from "./types";
import { txOperations, withTransaction } from "@/lib/gateway/db/actions";
import type { PricingEntry, ToolCall } from "@/types";
import { tryParseJson } from "./utils";

export const inspectToolCallStep: Step = async (ctx) => {
    try {
        const rawUrl = new URL(ctx.req.url);
        const match = rawUrl.pathname.match(/^\/(?:mcp)\/([^\/]+)/);
        const id = match ? match[1] : undefined;
        if (id) {
            const server = await withTransaction(async (tx) => {
                return await txOperations.internal_getMcpServerByServerId(id)(tx);
            });
            if (server?.mcpOrigin) {
                try { ctx.targetUpstream = new URL(server.mcpOrigin); } catch {}
            }
        }

        if (ctx.req.method.toUpperCase() !== 'POST') return ctx;
        const contentType = ctx.req.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return ctx;
        const json = await tryParseJson(ctx.req);
        if (!json || typeof json !== 'object') return ctx;
        const body = json as { method?: unknown; params?: unknown };
        if (body.method !== 'tools/call' || !body.params || typeof body.params !== 'object') return ctx;
        const params = body.params as { name?: unknown; arguments?: unknown };
        const toolName: string | undefined = typeof params.name === 'string' ? params.name : undefined;
        const toolArgs: Record<string, unknown> = params.arguments && typeof params.arguments === 'object' ? (params.arguments as Record<string, unknown>) : {};

        let isPaid = false;
        let pricing: PricingEntry[] | undefined = undefined;
        let toolId: string | undefined = undefined;
        let serverId: string | undefined = undefined;
        let payTo: string | undefined = undefined;

        if (id) {
            const server = await withTransaction(async (tx) => {
                return await txOperations.internal_getMcpServerByServerId(id)(tx);
            });
            payTo = server?.receiverAddress || undefined;
            if (server && toolName) {
                serverId = server.id;
                const tools = await withTransaction(async (tx) => {
                    return await txOperations.listMcpToolsByServer(server.id)(tx);
                });
                const toolConfig = (tools as Array<{ name: string; id: string; pricing?: unknown }>)["find"]((t) => t.name === toolName);
                if (toolConfig) {
                    toolId = toolConfig.id;
                    const pricings = (toolConfig.pricing ?? []) as PricingEntry[];
                    const activePricings = pricings.filter(p => p.active === true);
                    if (activePricings.length > 0) { isPaid = true; pricing = activePricings; }
                }
            }
        }

        let pickedPricing: PricingEntry | undefined = undefined;
        if (pricing && pricing.length > 0) {
            pickedPricing = pricing.find(p => p.network === 'base') || pricing[0];
        }

        const toolCall: ToolCall = {
            name: toolName || 'unknown',
            args: toolArgs,
            isPaid,
            payTo,
            pricing: pickedPricing ? [pickedPricing] : undefined,
            ...(id && { id }),
            ...(toolId && { toolId }),
            ...(serverId && { serverId }),
        };
        ctx.toolCall = toolCall;
        ctx.pickedPricing = pickedPricing || null;
        return ctx;
    } catch {
        return ctx;
    }
};

export default inspectToolCallStep;


