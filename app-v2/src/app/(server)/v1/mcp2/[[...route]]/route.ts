import { withProxy } from "@/lib/gateway/proxy";
import { AuthHeadersHook } from "@/lib/gateway/proxy/hooks/auth-headers-hook";
import { X402MonetizationHook } from "@/lib/gateway/proxy/hooks/x402-hook";
import { withTransaction, txOperations } from "@/lib/gateway/db/actions";
import type { PricingEntry } from "@/types/payments";
import type { Network } from "x402/types";
import type { RecipientWithTestnet } from "@/lib/gateway/proxy/hooks/x402-hook";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/vercel";

export const runtime = 'nodejs';

// Resolve upstream target MCP origin from header, query param, or DB by server id
async function resolveTargetUrl(req: Request): Promise<string | null> {
    const url = new URL(req.url);
    const directUrl = req.headers.get("x-mcpay-target-url") ?? url.searchParams.get("target-url");
    if (directUrl) return directUrl;

    const id = url.searchParams.get("id");
    if (id) {
        try {
            const mcpConfig = await withTransaction(async (tx) => {
                return await txOperations.internal_getMcpServerByServerId(id)(tx);
            });
            if (mcpConfig?.mcpOrigin) return mcpConfig.mcpOrigin as string;
        } catch {
            // ignore
        }
    }
    return null;
}

function pickPreferredNetwork(networks: Set<string>): string | undefined {
    const preference = ["base", "base-sepolia", "sei-testnet", "avalanche", "avalanche-fuji", "iotex"];
    for (const n of preference) if (networks.has(n)) return n;
    const first = networks.values().next();
    return first.done ? undefined : first.value;
}

async function buildMonetizationForTarget(targetUrl: string): Promise<{
    prices: Record<string, { amount: string; asset: { address: string; decimals?: number } }>;
    recipient: Partial<Record<Network, string>>;
} | null> {
    try {
        const server = await withTransaction(async (tx) => {
            return await txOperations.getMcpServerByOrigin(targetUrl)(tx);
        });
        if (!server) return null;

        const tools = await withTransaction(async (tx) => {
            return await txOperations.listMcpToolsByServer(server.id)(tx);
        });

        console.log(`[${new Date().toISOString()}] Tools: ${JSON.stringify(tools)}`);

        const availableNetworks = new Set<string>();
        for (const t of tools) {
            const pricing = (t.pricing as PricingEntry[] | null) || [];
            for (const p of pricing) if (p && p.active === true && p.network) availableNetworks.add(p.network);
        }
        if (availableNetworks.size === 0) return null;

        const preferredNetwork = pickPreferredNetwork(availableNetworks);
        if (!preferredNetwork) return null;

        const prices: Record<string, { amount: string; asset: { address: string; decimals?: number } }> = {};
        for (const t of tools) {
            const pricing = (t.pricing as PricingEntry[] | null) || [];
            const active = pricing.filter((p) => p && p.active === true);
            if (!active.length) continue;
            const selected = active.find((p) => p.network === preferredNetwork) || active[0];
            if (!selected || !selected.assetAddress || !selected.maxAmountRequiredRaw) continue;
            prices[t.name as string] = {
                amount: String(selected.maxAmountRequiredRaw),
                asset: { address: String(selected.assetAddress), decimals: Number(selected.tokenDecimals) }
            };
        }

        const recipient: Partial<Record<Network, string>> = {};
        if (server.receiverAddress) {
            recipient[preferredNetwork as Network] = String(server.receiverAddress);
        }

        return { prices, recipient };
    } catch {
        return null;
    }
}

const app = new Hono();
app.use("*", cors());
app.all("/*", async (c) => {
    const targetUrl = await resolveTargetUrl(c.req.raw);

    console.log(`[${new Date().toISOString()}] Target URL: ${targetUrl}`);

    let prices: Record<string, any> = {};
    let recipient: Partial<Record<Network, string>> | { evm: RecipientWithTestnet } = {
        evm: { address: "0x0000000000000000000000000000000000000000", isTestnet: false },
    };

    if (targetUrl) {
        const monetization = await buildMonetizationForTarget(targetUrl);
        if (monetization && Object.keys(monetization.prices).length > 0) {
            prices = monetization.prices;
            recipient = monetization.recipient;
        }
    }

    console.log(`[${new Date().toISOString()}] Recipient: ${JSON.stringify(recipient)}`);
    console.log(`[${new Date().toISOString()}] Prices: ${JSON.stringify(prices)}`);

    const proxy = withProxy([
        new X402MonetizationHook({
            recipient: recipient,
            prices,
            facilitator: {
                url: "https://x402.org/facilitator",
            },
        }),
        new AuthHeadersHook(),
    ]);

    return proxy(c.req.raw);
});

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);
