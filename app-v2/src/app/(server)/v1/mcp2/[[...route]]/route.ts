import { withProxy } from "@/lib/gateway/proxy";
import { AuthHeadersHook } from "@/lib/gateway/proxy/hooks/auth-headers-hook";
import { LoggingHook } from "@/lib/gateway/proxy/hooks/logging-hook";
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
    prices: Record<string, string>;
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

        // Removed console.log for tools

        const availableNetworks = new Set<string>();
        for (const t of tools) {
            const pricing = (t.pricing as PricingEntry[] | null) || [];
            for (const p of pricing) if (p && p.active === true && p.network) availableNetworks.add(p.network);
        }
        if (availableNetworks.size === 0) return null;

        const preferredNetwork = pickPreferredNetwork(availableNetworks);
        if (!preferredNetwork) return null;

        const prices: Record<string, string> = {};
        for (const t of tools) {
            const pricing = (t.pricing as PricingEntry[] | null) || [];
            const active = pricing.filter((p) => p && p.active === true);
            if (!active.length) continue;
            const selected = active.find((p) => p.network === preferredNetwork) || active[0];
            if (!selected || !selected.maxAmountRequiredRaw) continue;

            // Convert base units (e.g., USDC 6 decimals) to a US dollar string like "$0.01"
            const raw = String(selected.maxAmountRequiredRaw);
            const decimals = Number(selected.tokenDecimals ?? 6);

            // Ensure non-negative integer string
            const rawSanitized = raw.replace(/^\+/, "");
            if (!/^\d+$/.test(rawSanitized)) continue;

            const zeroes = "0".repeat(Math.max(decimals - rawSanitized.length, 0));
            const padded = zeroes + rawSanitized;
            const integerPart = padded.slice(0, Math.max(padded.length - decimals, 0)) || "0";
            const fractionalPartFull = (padded.slice(-decimals) || "").padStart(decimals, "0");

            // Trim trailing zeros but keep at least two decimal places for readability
            let fractional = fractionalPartFull.replace(/0+$/, "");
            if (fractional.length < 2) fractional = fractionalPartFull.slice(0, Math.max(2, Math.min(decimals, fractionalPartFull.length)));

            const formatted = fractional && Number(fractional) !== 0
                ? `${integerPart}.${fractional}`
                : `${integerPart}.00`;

            prices[t.name as string] = `$${formatted}`;
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

    // Removed console.log for Target URL

    let prices: Record<string, string> = {};
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

    // Removed console.log for Recipient and Prices

    const proxy = withProxy([
        new LoggingHook(),
        new X402MonetizationHook({
            recipient: recipient,
            prices,
            facilitator: {
                url: "https://facilitator.x402.rs",
            },
        }),
        new AuthHeadersHook(),
    ]);

    return proxy(c.req.raw);
});

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);
