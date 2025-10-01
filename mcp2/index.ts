import { Hono } from "hono";
import { cors } from "hono/cors";
import { AuthHeadersHook, LoggingHook, withProxy, X402MonetizationHook } from "mcpay/handler";
import type { Network, Price } from "x402/types";

export const runtime = 'nodejs';

type RecipientWithTestnet = { address: string; isTestnet?: boolean };
// ----------------------------
// Lightweight JSON file store
// ----------------------------
type StoredTool = {
    name: string;
    pricing: Price[];
};

type StoredServerConfig = {
    id: string;
    mcpOrigin: string;
    requireAuth?: boolean;
    authHeaders?: Record<string, string>;
    receiverAddressByNetwork?: Partial<Record<Network, string>>;
    tools?: StoredTool[];
};

type StoreShape = {
    serversById: Record<string, StoredServerConfig>;
    serverIdByOrigin: Record<string, string>;
};

const STORE_PATH = `${import.meta.dir}/mcp-store.json`;
let store: StoreShape = { serversById: {}, serverIdByOrigin: {} };
let saveScheduled = false;

async function fileExists(path: string): Promise<boolean> {
    try {
        await Bun.file(path).text();
        return true;
    } catch {
        return false;
    }
}

async function loadStore(): Promise<void> {
    try {
        if (!(await fileExists(STORE_PATH))) {
            store = { serversById: {}, serverIdByOrigin: {} };
            await Bun.write(STORE_PATH, JSON.stringify(store, null, 2));
            return;
        }
        const text = await Bun.file(STORE_PATH).text();
        const parsed = JSON.parse(text) as StoreShape;
        // Basic shape guard
        if (parsed && typeof parsed === 'object' && parsed.serversById && parsed.serverIdByOrigin) {
            store = parsed;
        }
    } catch {
        // reset on parse errors
        store = { serversById: {}, serverIdByOrigin: {} };
    }
}

async function saveStore(): Promise<void> {
    try {
        await Bun.write(STORE_PATH, JSON.stringify(store, null, 2));
    } catch {
        // ignore write failures
    }
}

function scheduleSave(): void {
    if (saveScheduled) return;
    saveScheduled = true;
    setTimeout(() => {
        saveScheduled = false;
        void saveStore();
    }, 25);
}

function upsertServerConfig(input: Partial<StoredServerConfig> & { id: string; mcpOrigin: string }): StoredServerConfig {
    const current = store.serversById[input.id] ?? { id: input.id, mcpOrigin: input.mcpOrigin } as StoredServerConfig;
    const merged: StoredServerConfig = {
        ...current,
        ...input,
        // merge nested fields
        authHeaders: { ...(current.authHeaders ?? {}), ...(input.authHeaders ?? {}) },
        receiverAddressByNetwork: { ...(current.receiverAddressByNetwork ?? {}), ...(input.receiverAddressByNetwork ?? {}) },
        tools: input.tools ?? current.tools ?? [],
    };
    store.serversById[merged.id] = merged;
    store.serverIdByOrigin[merged.mcpOrigin] = merged.id;
    scheduleSave();
    return merged;
}

function getServerById(id: string): StoredServerConfig | null {
    return store.serversById[id] ?? null;
}

function getServerByOrigin(origin: string): StoredServerConfig | null {
    const id = store.serverIdByOrigin[origin];
    if (!id) return null;
    return getServerById(id);
}

// Resolve upstream target MCP origin from header/query (base64) or store by server id
async function resolveTargetUrl(req: Request): Promise<string | null> {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id) {
        const server = getServerById(id);
        if (server?.mcpOrigin) return server.mcpOrigin;
    }

    const directEncoded = req.headers.get("x-mcpay-target-url") ?? url.searchParams.get("target-url");
    if (directEncoded) {
        try {
            const decoded = atob(decodeURIComponent(directEncoded));
            return decoded;
        } catch {
            // if not base64, assume raw URL
            return directEncoded;
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
    prices: Record<string, Price>;
    recipient: Partial<Record<Network, string>>;
} | null> {
    try {
        const server = getServerByOrigin(targetUrl);
        if (!server) return null;

        const tools = server.tools ?? [];

        // Build recipients directly from configured map
        const recipient: Partial<Record<Network, string>> = {};
        const map = server.receiverAddressByNetwork ?? {};
        for (const [net, addr] of Object.entries(map)) {
            if (addr) recipient[net as Network] = String(addr);
        }
        // If there are no recipients configured, monetization cannot be applied
        if (!Object.keys(recipient).length) return null;

        // Build prices per tool using the first provided Price entry
        const prices: Record<string, Price> = {};
        for (const t of tools) {
            const pricing = (t.pricing as Price[] | null) || [];
            const selected = pricing[0];
            if (selected === undefined || selected === null) continue;
            prices[t.name as string] = selected;
        }

        return { prices, recipient };
    } catch {
        return null;
    }
}

// Boot the store at startup
void loadStore();

const app = new Hono();
app.use("*", cors());

// Admin: register or update an MCP server config
app.post("/register", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        return c.json({ error: "invalid_json" }, 400);
    }

    const { id, mcpOrigin } = body as { id?: string; mcpOrigin?: string };
    if (!id || !mcpOrigin) {
        return c.json({ error: "missing_id_or_origin" }, 400);
    }

    const input: Partial<StoredServerConfig> = {
        id,
        mcpOrigin,
        requireAuth: (body as any).requireAuth === true,
        authHeaders: (body as any).authHeaders ?? {},
        receiverAddressByNetwork: (body as any).receiverAddressByNetwork ?? {},
        tools: Array.isArray((body as any).tools) ? (body as any).tools : [],
    } as StoredServerConfig;

    const saved = upsertServerConfig(input as StoredServerConfig);
    return c.json({ ok: true, id: saved.id });
});

// Admin: list or fetch stored servers
app.get("/servers", async (c) => {
    const list = Object.values(store.serversById).map((s) => ({ id: s.id, mcpOrigin: s.mcpOrigin }));
    return c.json({ servers: list });
});

app.get("/servers/:id", async (c) => {
    const id = c.req.param("id");
    const s = id ? getServerById(id) : null;
    if (!s) return c.json({ error: "not_found" }, 404);
    return c.json(s);
});

// Proxy endpoint: /mcp?id=<ID>
app.all("/mcp", async (c) => {
    const original = c.req.raw;
    const targetUrl = await resolveTargetUrl(original);

    let prices: Record<string, Price> = {};
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

    // Ensure the proxy receives a base64 target-url header
    const headers = new Headers(original.headers);
    if (targetUrl && !headers.get("x-mcpay-target-url")) {
        headers.set("x-mcpay-target-url", btoa(targetUrl));
    }

    const reqForProxy = new Request(original.url, {
        method: original.method,
        headers,
        body: original.body,
    });

    const proxy = withProxy([
        new LoggingHook(),
        new X402MonetizationHook({
            recipient: recipient,
            prices,
            facilitator: {
                url: "https://facilitator.x402.rs",
            },
        }),
        new AuthHeadersHook(async (_req, extra) => {
            const serverId = extra.serverId;
            if (!serverId) return null;
            const mcpConfig = getServerById(serverId);
            if (!mcpConfig?.authHeaders || mcpConfig.requireAuth !== true) return null;
            const result: Record<string, string> = {};
            for (const [key, value] of Object.entries(mcpConfig.authHeaders)) {
                if (typeof value === "string" && value.length > 0) result[key] = value;
            }
            return result;
        }),
    ]);

    return proxy(reqForProxy);
});

export default {
    app,
    fetch: app.fetch,
}