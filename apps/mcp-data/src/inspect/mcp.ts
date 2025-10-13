import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { config } from 'dotenv';
config();


export const inspectMcp = async (origin: string) => {
    console.log(`[inspectMcp] Inspecting MCP server at origin: ${origin}`);
    const url = new URL(origin);

    const transport = new StreamableHTTPClientTransport(url);
    const client = new Client({ name: 'inspect-mcpay.tech/1.0', version: '1.0.0' }, { capabilities: {} });

    try {
        await client.connect(transport);
        console.log("[inspectMcp] Connected to MCP server.");
    } catch (e) {
        console.error("[inspectMcp] Failed to connect to MCP server.", e);
        // Cannot continue if not connected
        return {
            tools: [],
            resources: [],
            prompts: [],
            resourceTemplates: [],
            server: {
                capabilities: {},
                info: {},
                instructions: "",
            }
        };
    }

    // Helper to Zod-unwrap, JSON safe
    const zodToJson = (val: unknown) => {
        if (!val) return val;
        try {
            // If it's a Zod output object (typically output of .parse, .safeParse etc), it's just a POJO, but may contain methods or non-serializable stuff (edge case).
            // We defensively JSON roundtrip anything that's object-like but not an array.
            if (typeof val === "object" && !Array.isArray(val)) {
                return JSON.parse(JSON.stringify(val));
            }
            return val;
        } catch {
            return val;
        }
    };

    let tools: any = [];
    try {
        const rawTools = await client.listTools();
        tools = Array.isArray(rawTools) ? rawTools : [];
        if (!Array.isArray(rawTools) && typeof rawTools === "object" && rawTools !== null) {
            // Some older SDKs may return { tools: [] }
            if (Array.isArray((rawTools as any).tools)) {
                tools = (rawTools as any).tools;
            }
        }
        tools = zodToJson(tools);
        console.log("[inspectMcp] Retrieved tools:", tools);
    } catch (e) {
        console.error("[inspectMcp] Failed to retrieve tools", e);
        tools = [];
    }

    let resources: any = [];
    try {
        const rawResources = await client.listResources();
        resources = Array.isArray(rawResources) ? rawResources : [];
        if (!Array.isArray(rawResources) && typeof rawResources === "object" && rawResources !== null) {
            if (Array.isArray((rawResources as any).resources)) {
                resources = (rawResources as any).resources;
            }
        }
        resources = zodToJson(resources);
        console.log("[inspectMcp] Retrieved resources:", resources);
    } catch (e) {
        console.error("[inspectMcp] Failed to retrieve resources", e);
        resources = [];
    }

    let prompts: any = [];
    try {
        const rawPrompts = await client.listPrompts();
        prompts = Array.isArray(rawPrompts) ? rawPrompts : [];
        if (!Array.isArray(rawPrompts) && typeof rawPrompts === "object" && rawPrompts !== null) {
            if (Array.isArray((rawPrompts as any).prompts)) {
                prompts = (rawPrompts as any).prompts;
            }
        }
        prompts = zodToJson(prompts);
        console.log("[inspectMcp] Retrieved prompts:", prompts);
    } catch (e) {
        console.error("[inspectMcp] Failed to retrieve prompts", e);
        prompts = [];
    }

    let resourceTemplates: any = [];
    try {
        const rawTemplates = await client.listResourceTemplates();
        resourceTemplates = Array.isArray(rawTemplates) ? rawTemplates : [];
        if (!Array.isArray(rawTemplates) && typeof rawTemplates === "object" && rawTemplates !== null) {
            if (Array.isArray((rawTemplates as any).resourceTemplates)) {
                resourceTemplates = (rawTemplates as any).resourceTemplates;
            }
        }
        resourceTemplates = zodToJson(resourceTemplates);
        console.log("[inspectMcp] Retrieved resource templates:", resourceTemplates);
    } catch (e) {
        console.error("[inspectMcp] Failed to retrieve resource templates", e);
        resourceTemplates = [];
    }

    let serverCapabilities: any = {};
    try {
        const caps = client.getServerCapabilities();
        serverCapabilities = zodToJson(caps) ?? {};
        console.log("[inspectMcp] Server capabilities:", serverCapabilities);
    } catch (e) {
        console.error("[inspectMcp] Failed to get server capabilities", e);
        serverCapabilities = {};
    }

    let serverInfo: any = {};
    try {
        const info = client.getServerVersion();
        serverInfo = zodToJson(info) ?? {};
        console.log("[inspectMcp] Server info:", serverInfo);
    } catch (e) {
        console.error("[inspectMcp] Failed to get server info", e);
        serverInfo = {};
    }

    let serverInstructions: any = "";
    try {
        const instructions = client.getInstructions();
        serverInstructions = typeof instructions === "string"
            ? instructions
            : zodToJson(instructions) ?? "";
        console.log("[inspectMcp] Server instructions:", serverInstructions);
    } catch (e) {
        console.error("[inspectMcp] Failed to get server instructions", e);
        serverInstructions = "";
    }

    return {
        tools,
        resources,
        prompts,
        resourceTemplates,
        server: {
            capabilities: serverCapabilities,
            info: serverInfo,
            instructions: serverInstructions,
        }
    };
};