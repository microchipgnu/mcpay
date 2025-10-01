import { Hono } from "hono";
import { createMcpPaidHandler } from "mcpay/handler";
import { z } from "zod/v3";

const app = new Hono();

const proxy = () => {
    return ""
}

type Pricing = {
    price: string,
    description: string
    title: string
    execute: any
}

const pricing: Record<string, Pricing> = {
    "tool1": {
        price: "$0.001",
        description: "paid tool",
        title: "weather",
        execute: proxy
    },
}

const handler = (price: Record<string, Pricing>) => createMcpPaidHandler(
    (server) => {

        server.paidTool(
            "weather",
            "Paid tool",
            "$0.001",
            { city: z.string() },
            {},
            async ({ city }) => {
                return {
                    content: [{ type: "text", text: `The weather in ${city} is sunny` }],
                }
            }
        );

        server.tool(
            "free_tool",
            "Free to use",
            { s: z.string(), city: z.string() },
            async ({ s, city }) => ({
                content: [{ type: "text", text: `We support ${city}` }],
            })
        );
    },
    {
        facilitator: {
            url: "https://facilitator.x402.rs"
        },
        recipient: {
            "evm": { address: "0xc9343113c791cB5108112CFADa453Eef89a2E2A2", isTestnet: true },
            "svm": { address: "4VQeAqyPxR9pELndskj38AprNj1btSgtaCrUci8N4Mdg", isTestnet: true }
        }
    },
    {
        serverInfo: { name: "paid-mcp", version: "1.0.0" },
    },
    {
        maxDuration: 300,
        verboseLogs: true
    }
);


app.use("*", (c) => handler(pricing)(c.req.raw));

export default app;