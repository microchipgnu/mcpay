import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createMcpPaidHandler } from "mcpay/handler";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const app = new Hono();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WIDGET_JS = (() => {
	try {
		return readFileSync(join(__dirname, "web/dist/component.js"), "utf8");
	} catch {
		return "";
	}
})();

const WIDGET_CSS = "";

const handler = createMcpPaidHandler(
	(server) => {
		// Register the component resource
		server.registerResource(
			"chatgpt-mcpay-widget",
			"ui://widget/chatgpt-mcpay.html",
			{},
			async () => ({
				contents: [
					{
						uri: "ui://widget/chatgpt-mcpay.html",
						mimeType: "text/html+skybridge",
						text: `
<div id="widget-root"></div>
${WIDGET_CSS ? `<style>${WIDGET_CSS}</style>` : ""}
<script type="module">${WIDGET_JS}</script>
`.trim(),
					},
				],
			})
		);

		// Free tool: present the widget with structured content
		server.tool(
			"report.show",
			"Use this when the user asks to view their payment report or dashboard.",
			{},
			async () => {
				return {
					structuredContent: {
						cards: [
							{ id: "1", title: "Today", value: "$12.40" },
							{ id: "2", title: "Yesterday", value: "$9.10" },
						],
					},
					content: [{ type: "text", text: "Here is a quick snapshot." }],
					_meta: {
						"openai/outputTemplate": "ui://widget/chatgpt-mcpay.html",
						"openai/toolInvocation/invoking": "Loading the report…",
						"openai/toolInvocation/invoked": "Report loaded",
						"openai/widgetAccessible": true,
					},
				};
			}
		);

		// Paid tool: provide a summary (gated by x402 payments)
		server.paidTool(
			"summary.paid",
			"Use this when the user asks for a premium summary.",
			"$0.001",
			{ topic: z.string().describe("What to summarize, e.g., payments last week") },
			{
				"openai/toolInvocation/invoking": "Generating premium summary…",
				"openai/toolInvocation/invoked": "Premium summary ready",
				readOnlyHint: true,
			},
			async ({ topic }) => {
				return {
					content: [
						{ type: "text", text: `Premium summary for: ${topic}. Overall: stable growth.` },
					],
				};
			}
		);
	},
	{
		facilitator: { url: "https://facilitator.payai.network" },
		recipient: {
			evm: { address: "0xc9343113c791cB5108112CFADa453Eef89a2E2A2", isTestnet: true },
			svm: { address: "4VQeAqyPxR9pELndskj38AprNj1btSgtaCrUci8N4Mdg", isTestnet: true },
		},
	},
	{ serverInfo: { name: "chatgpt-mcpay", version: "1.0.0" } },
	{ maxDuration: 300, verboseLogs: true }
);

app.use("*", (c) => handler(c.req.raw));

serve({ fetch: app.fetch, port: 3020 });

console.log("Server listening at http://localhost:3020");
