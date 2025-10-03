import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createMcpPaidHandler } from "mcpay/handler";
import { z } from "zod";

const app = new Hono();


const handler = createMcpPaidHandler(
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
            url: "https://facilitator.mcpay.tech"
        },
        recipient: {
            "evm": {address: "0xc9343113c791cB5108112CFADa453Eef89a2E2A2", isTestnet: true},
            "svm": {address: "4VQeAqyPxR9pELndskj38AprNj1btSgtaCrUci8N4Mdg", isTestnet: true}
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

app.use("*", (c) => handler(c.req.raw));

serve({
    fetch: app.fetch,
    port: 3010,
});

console.log("Server is running on port http://localhost:3010");