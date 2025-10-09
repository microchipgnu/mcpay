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

void WIDGET_JS;
void WIDGET_CSS;

const handler = createMcpPaidHandler(
	(server) => {
		// Register the component resource (React bundle) - commented out in favor of inline version
		// server.registerResource(
		// 	"chatgpt-mcpay-widget",
		// 	"ui://widget/chatgpt-mcpay.html",
		// 	{},
		// 	async () => ({
		// 		contents: [
		// 			{
		// 				uri: "ui://widget/chatgpt-mcpay.html",
		// 				mimeType: "text/html+skybridge",
		// 				text: `
		// <div id="widget-root"></div>
		// ${WIDGET_CSS ? `<style>${WIDGET_CSS}</style>` : ""}
		// <script type="module">${WIDGET_JS}</script>
		// `.trim(),
		// 			},
		// 		],
		// 	})
		// );

		// Register inline vanilla HTML/JS widget
		server.registerResource(
			"chatgpt-mcpay-widget-inline",
			"ui://widget/chatgpt-mcpay-inline.html",
			{},
			async () => ({
				contents: [
					{
						uri: "ui://widget/chatgpt-mcpay-inline.html",
						mimeType: "text/html+skybridge",
						text: `
<div id="widget-root"></div>
<style>
:root { color-scheme: light; }
.container { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color: #000; width: 100%; }
.cards { display: flex; gap: 1rem; }
.card { flex: 1 1 0; border: 1px solid #e5e7eb; border-radius: 1rem; padding: 0.75rem; text-align: left; background: #fff; cursor: pointer; }
.card.selected { box-shadow: inset 0 0 0 2px #000; }
.card .title { font-weight: 500; margin-bottom: 0.25rem; }
.card .value { font-size: 1.5rem; line-height: 2rem; }
.actions { margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem; }
.btn { border-radius: 9999px; background: #000; color: #fff; padding: 0.375rem 0.75rem; border: 0; }
.btn.secondary { background: rgba(0,0,0,0.8); }
.muted { font-size: 0.875rem; color: rgba(0,0,0,0.6); }
.btn.loading { opacity: 0.9; pointer-events: none; }
.spinner { width: 14px; height: 14px; border-radius: 9999px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; display: inline-block; vertical-align: -2px; margin-right: 0.5rem; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.muted.pulsing { animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
</style>
<script type="module">
const openai = window.openai || {};
const root = document.getElementById("widget-root");

function getReportFromOutput(output) {
	if (output && typeof output === "object" && Array.isArray(output.cards)) {
		return output;
	}
	return { cards: [] };
}

let report = getReportFromOutput(openai.toolOutput);
let selected = (openai.widgetState && openai.widgetState.selected) || null;
let lastOutputHash = JSON.stringify(openai.toolOutput || {});
let paymentStatusMessage = "";
let isPaying = false;

function render() {
	if (!root) return;
	const total = Array.isArray(report.cards) ? report.cards.length : 0;

	const cardsHtml = (report.cards || []).map((c) => {
		const isSelected = selected === c.id;
		return \`<button class="card\${isSelected ? " selected" : ""}" data-card-id="\${c.id}">
	<div class="title">\${c.title}</div>
	<div class="value">\${c.value}</div>
</button>\`;
	}).join("");

	root.innerHTML = \`<div class="container">
	<div class="cards">\${cardsHtml}</div>
	<div class="actions">
		<button class="btn" id="btn-refresh">Refresh</button>
		<button class="btn secondary\${isPaying ? " loading" : ""}" id="btn-premium"\${isPaying ? " disabled" : ""}>\${isPaying ? '<span class="spinner"></span><span class="btn-label">Processing…</span>' : 'x402 payment'}</button>
		<div class="muted\${isPaying ? " pulsing" : ""}">\${paymentStatusMessage || (total + " cards")}</div>
	</div>
</div>\`;

	// Wire up events
	Array.from(root.querySelectorAll("[data-card-id]")).forEach((el) => {
		el.addEventListener("click", async () => {
			const cardId = el.getAttribute("data-card-id");
			selected = cardId;
			try {
				await openai.setWidgetState?.({ __v: 1, selected: cardId });
			} catch {}
			render();
		});
	});

	const btnRefresh = root.querySelector("#btn-refresh");
	if (btnRefresh) {
		btnRefresh.addEventListener("click", async () => {
			try {
				await openai.callTool?.("report.show", {});
			} catch {}
		});
	}

	const btnPremium = root.querySelector("#btn-premium");
	if (btnPremium) {
		btnPremium.addEventListener("click", async () => {
			if (isPaying) return;
			isPaying = true;
			paymentStatusMessage = "Submitting x402 payment…";
			render();
			try {
				await new Promise((r) => setTimeout(r, 800));
				await openai.callTool?.("summary.paid", { topic: "payments last week" });
				await new Promise((r) => setTimeout(r, 400));
				paymentStatusMessage = "x402 payment submitted";
				// Increment Today's value by 0.01
				const cards = Array.isArray(report.cards) ? report.cards : [];
				const target = cards.find((c) => c && c.title === "Today") || cards.find((c) => c && c.id === "1") || cards[0];
				if (target && typeof target.value === "string") {
					const numeric = parseFloat(target.value.replace(/[^0-9.]/g, "")) || 0;
					target.value = "$" + (numeric + 0.01).toFixed(2);
				}
				render();
				await openai.sendFollowupTurn?.({ prompt: "Summarize what changed." });
			} catch {}
			isPaying = false;
			render();
		});
	}
}

function maybeUpdateFromToolOutput() {
	const currentHash = JSON.stringify(openai.toolOutput || {});
	if (currentHash !== lastOutputHash) {
		lastOutputHash = currentHash;
		report = getReportFromOutput(openai.toolOutput);
		render();
	}
}

render();
setInterval(maybeUpdateFromToolOutput, 800);
</script>
`.trim(),
					},
				],
			})
		);

		// Pizzaz external widgets (map, carousel, albums, list, video)
		server.registerResource(
			"pizzaz-map",
			"ui://widget/pizzaz-map.html",
			{},
			async () => ({
				contents: [
					{
						uri: "ui://widget/pizzaz-map.html",
						mimeType: "text/html+skybridge",
						text: `
<div id="pizzaz-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-0038.js"></script>
<script type="module">
const openai = window.openai || {};
const root = document.getElementById('pizzaz-root');
// Delegate click handling within the Pizzaz widget to catch the "Order Online" button
document.addEventListener('click', async (ev) => {
	let el = ev.target;
	for (let hops = 0; hops < 6 && el; hops++) {
		// Only react to clicks inside the pizzaz widget
		if (root && !root.contains(el)) { el = el.parentElement; continue; }
		const text = (el.textContent || '').trim();
		const cls = (el.className || '');
		const isOrderOnline = text === 'Order Online' && cls.indexOf('cursor-pointer') !== -1;
		if (isOrderOnline) {
			const btn = el;
			const originalText = btn.textContent;
			btn.textContent = 'Processing…';
			btn.style.pointerEvents = 'none';
			btn.style.opacity = '0.8';
			try {
				await new Promise(r => setTimeout(r, 3000));
				await openai.callTool?.('pizza.buy', { pizzaId: 'pep', size: 'medium' });
				btn.textContent = 'Purchase successful';
				await new Promise(r => setTimeout(r, 2000));
				await openai.sendFollowupTurn?.({ prompt: 'Payment was successful.' });
			} catch (e) {}
			btn.textContent = originalText;
			btn.style.pointerEvents = '';
			btn.style.opacity = '';
			break;
		}
		el = el.parentElement;
	}
}, true);
</script>
`.trim()
					}
				]
			})
		);

		server.registerTool(
			"pizzaz-map",
			{
				title: "Show Pizza Map",
				_meta: {
					"openai/outputTemplate": "ui://widget/pizzaz-map.html",
					"openai/toolInvocation/invoking": "Hand-tossing a map",
					"openai/toolInvocation/invoked": "Served a fresh map"
				},
				inputSchema: { pizzaTopping: z.string() }
			},
			async () => ({ content: [{ type: "text", text: "Rendered a pizza map!" }], structuredContent: {} })
		);

		server.registerResource(
			"pizzaz-carousel",
			"ui://widget/pizzaz-carousel.html",
			{},
			async () => ({
				contents: [
					{
						uri: "ui://widget/pizzaz-carousel.html",
						mimeType: "text/html+skybridge",
						text: `
<div id="pizzaz-carousel-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-carousel-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-carousel-0038.js"></script>
`.trim()
					}
				]
			})
		);

		server.registerTool(
			"pizzaz-carousel",
			{
				title: "Show Pizza Carousel",
				_meta: {
					"openai/outputTemplate": "ui://widget/pizzaz-carousel.html",
					"openai/toolInvocation/invoking": "Carousel some spots",
					"openai/toolInvocation/invoked": "Served a fresh carousel"
				},
				inputSchema: { pizzaTopping: z.string() }
			},
			async () => ({ content: [{ type: "text", text: "Rendered a pizza carousel!" }], structuredContent: {} })
		);

		server.registerResource(
			"pizzaz-albums",
			"ui://widget/pizzaz-albums.html",
			{},
			async () => ({
				contents: [
					{
						uri: "ui://widget/pizzaz-albums.html",
						mimeType: "text/html+skybridge",
						text: `
<div id="pizzaz-albums-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-albums-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-albums-0038.js"></script>
`.trim()
					}
				]
			})
		);

		server.registerTool(
			"pizzaz-albums",
			{
				title: "Show Pizza Album",
				_meta: {
					"openai/outputTemplate": "ui://widget/pizzaz-albums.html",
					"openai/toolInvocation/invoking": "Hand-tossing an album",
					"openai/toolInvocation/invoked": "Served a fresh album"
				},
				inputSchema: { pizzaTopping: z.string() }
			},
			async () => ({ content: [{ type: "text", text: "Rendered a pizza album!" }], structuredContent: {} })
		);

		server.registerResource(
			"pizzaz-list",
			"ui://widget/pizzaz-list.html",
			{},
			async () => ({
				contents: [
					{
						uri: "ui://widget/pizzaz-list.html",
						mimeType: "text/html+skybridge",
						text: `
<div id="pizzaz-list-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-list-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-list-0038.js"></script>
`.trim()
					}
				]
			})
		);

		server.registerTool(
			"pizzaz-list",
			{
				title: "Show Pizza List",
				_meta: {
					"openai/outputTemplate": "ui://widget/pizzaz-list.html",
					"openai/toolInvocation/invoking": "Hand-tossing a list",
					"openai/toolInvocation/invoked": "Served a fresh list"
				},
				inputSchema: { pizzaTopping: z.string() }
			},
			async () => ({ content: [{ type: "text", text: "Rendered a pizza list!" }], structuredContent: {} })
		);

		server.registerResource(
			"pizzaz-video",
			"ui://widget/pizzaz-video.html",
			{},
			async () => ({
				contents: [
					{
						uri: "ui://widget/pizzaz-video.html",
						mimeType: "text/html+skybridge",
						text: `
<div id="pizzaz-video-root"></div>
<link rel="stylesheet" href="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-video-0038.css">
<script type="module" src="https://persistent.oaistatic.com/ecosystem-built-assets/pizzaz-video-0038.js"></script>
`.trim()
					}
				]
			})
		);

		server.registerTool(
			"pizzaz-video",
			{
				title: "Show Pizza Video",
				_meta: {
					"openai/outputTemplate": "ui://widget/pizzaz-video.html",
					"openai/toolInvocation/invoking": "Hand-tossing a video",
					"openai/toolInvocation/invoked": "Served a fresh video"
				},
				inputSchema: { pizzaTopping: z.string() }
			},
			async () => ({ content: [{ type: "text", text: "Rendered a pizza video!" }], structuredContent: {} })
		);

		// Inline Pizza Widget and Tools
		server.registerResource(
			"pizza-widget-inline",
			"ui://widget/pizza-widget-inline.html",
			{},
			async () => ({
				contents: [
					{
						uri: "ui://widget/pizza-widget-inline.html",
						mimeType: "text/html+skybridge",
						text: `
<div id="pizza-root"></div>
<style>
::root { color-scheme: light; }
.container { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color: #000; width: 100%; }
.cards { display: flex; gap: 1rem; }
.card { flex: 1 1 0; border: 1px solid #e5e7eb; border-radius: 1rem; padding: 0.75rem; text-align: left; background: #fff; cursor: pointer; }
.card.selected { box-shadow: inset 0 0 0 2px #000; }
.card .title { font-weight: 500; margin-bottom: 0.25rem; }
.card .value { font-size: 1.5rem; line-height: 2rem; }
.actions { margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.btn { border-radius: 9999px; background: #000; color: #fff; padding: 0.375rem 0.75rem; border: 0; }
.btn.secondary { background: rgba(0,0,0,0.8); }
.btn.size { background: #f3f4f6; color: #000; border: 1px solid #e5e7eb; }
.btn.size.selected { background: #000; color: #fff; border-color: #000; }
.muted { font-size: 0.875rem; color: rgba(0,0,0,0.6); }
.btn.loading { opacity: 0.9; pointer-events: none; }
.spinner { width: 14px; height: 14px; border-radius: 9999px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; display: inline-block; vertical-align: -2px; margin-right: 0.5rem; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.muted.pulsing { animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
</style>
<script type="module">
const openai = window.openai || {};
const root = document.getElementById("pizza-root");

function getMenuFromOutput(output) {
	if (output && typeof output === "object" && Array.isArray(output.items)) {
		return output;
	}
	return { items: [
		{ id: "marg", name: "Margherita", price: "$12.00" },
		{ id: "pep", name: "Pepperoni", price: "$14.00" },
		{ id: "veg", name: "Veggie", price: "$13.00" },
	] };
}

let menu = getMenuFromOutput(openai.toolOutput);
let selectedPizzaId = (openai.widgetState && openai.widgetState.selectedPizzaId) || (Array.isArray(menu.items) && menu.items[0] && menu.items[0].id) || null;
let selectedSize = (openai.widgetState && openai.widgetState.selectedSize) || "medium";
let lastOutputHash = JSON.stringify(openai.toolOutput || {});
let statusMessage = "";
let isBuying = false;

function render() {
	if (!root) return;
	const items = Array.isArray(menu.items) ? menu.items : [];

	const cardsHtml = items.map((item) => {
		const isSelected = selectedPizzaId === item.id;
		return \`<button class=\"card\${isSelected ? " selected" : ""}\" data-pizza-id=\"\${item.id}\">\n\t<div class=\"title\">\${item.name}</div>\n\t<div class=\"value\">\${item.price}</div>\n</button>\`;
	}).join("");

	const sizes = ["small","medium","large"];
	const sizeButtons = sizes.map((s) => {
		const isS = selectedSize === s;
		return \`<button class=\"btn size\${isS ? " selected" : ""}\" data-size=\"\${s}\">\${s[0].toUpperCase()+s.slice(1)}</button>\`;
	}).join("");

	root.innerHTML = \`<div class=\"container\">\n\t<div class=\"cards\">\${cardsHtml}</div>\n\t<div class=\"actions\">\n\t\t<div>Size: \${sizeButtons}</div>\n\t\t<button class=\"btn\" id=\"btn-refresh\">Refresh Menu</button>\n\t\t<button class=\"btn secondary\${isBuying ? " loading" : ""}\" id=\"btn-buy\"\${isBuying ? " disabled" : ""}>\${isBuying ? '<span class=\"spinner\"></span><span class=\"btn-label\">Buying…</span>' : 'Buy Pizza (x402)'}</button>\n\t\t<div class=\"muted\${isBuying ? " pulsing" : ""}\">\${statusMessage || (items.length + " pizzas available")}</div>\n\t</div>\n</div>\`;

	Array.from(root.querySelectorAll("[data-pizza-id]")).forEach((el) => {
		el.addEventListener("click", async () => {
			const id = el.getAttribute("data-pizza-id");
			selectedPizzaId = id;
			try { await openai.setWidgetState?.({ __v: 1, selectedPizzaId: id, selectedSize }); } catch {}
			render();
		});
	});

	Array.from(root.querySelectorAll("[data-size]")).forEach((el) => {
		el.addEventListener("click", async () => {
			const s = el.getAttribute("data-size");
			selectedSize = s;
			try { await openai.setWidgetState?.({ __v: 1, selectedPizzaId, selectedSize: s }); } catch {}
			render();
		});
	});

	const btnRefresh = root.querySelector("#btn-refresh");
	if (btnRefresh) {
		btnRefresh.addEventListener("click", async () => {
			try { await openai.callTool?.("pizza.menu", {}); } catch {}
		});
	}

	const btnBuy = root.querySelector("#btn-buy");
	if (btnBuy) {
		btnBuy.addEventListener("click", async () => {
			if (isBuying) return;
			isBuying = true;
			const selectedItem = items.find((i) => i && i.id === (selectedPizzaId || (items[0] && items[0].id))) || items[0];
			const sizeLabel = selectedSize ? selectedSize[0].toUpperCase() + selectedSize.slice(1) : "Medium";
			const basePrice = selectedItem && selectedItem.price ? (parseFloat(String(selectedItem.price).replace(/[^0-9.]/g, "")) || 0) : 0;
			const multipliers = { small: 1.0, medium: 1.15, large: 1.3 };
			const total = basePrice * (multipliers[selectedSize] || 1.15);
			statusMessage = \`Submitting x402 payment for \${sizeLabel} \${selectedItem ? selectedItem.name : "Pizza"} - $\${total.toFixed(2)}…\`;
			render();
			try {
				await new Promise((r) => setTimeout(r, 600));
				await openai.callTool?.("pizza.buy", { pizzaId: selectedPizzaId || (items[0] && items[0].id) || "1", size: selectedSize });
				statusMessage = \`Payment submitted. Baking \${sizeLabel} \${selectedItem ? selectedItem.name : "Pizza"}…\`;
				render();
				await new Promise((r) => setTimeout(r, 800));
				statusMessage = "Pizza is baking…";
				render();
				await new Promise((r) => setTimeout(r, 900));
				statusMessage = \`Out for delivery: \${sizeLabel} \${selectedItem ? selectedItem.name : "Pizza"}…\`;
				render();
				await new Promise((r) => setTimeout(r, 900));
				statusMessage = "Delivered! Enjoy 🍕";
				render();
				await openai.sendFollowupTurn?.({ prompt: "Confirm the pizza order and delivery status." });
			} catch {}
			isBuying = false;
			render();
		});
	}
}

function maybeUpdateFromToolOutput() {
	const currentHash = JSON.stringify(openai.toolOutput || {});
	if (currentHash !== lastOutputHash) {
		lastOutputHash = currentHash;
		menu = getMenuFromOutput(openai.toolOutput);
		render();
	}
}

render();
setInterval(maybeUpdateFromToolOutput, 800);
</script>
`.trim(),
					},
				],
			})
		);

		server.registerTool(
			"pizza.menu",
			{
				title: "Show Pizza Menu",
				description: "Use this to show the pizza menu UI.",
				inputSchema: {},
				outputSchema: {},
				annotations: { readOnlyHint: true },
				_meta: {
					"openai/outputTemplate": "ui://widget/pizza-widget-inline.html",
					"openai/widgetAccessible": true,
					"openai/toolInvocation/invoking": "Fetching menu…",
					"openai/toolInvocation/invoked": "Menu ready"
				},
			},
			async () => {
				return {
					structuredContent: {
						items: [
							{ id: "marg", name: "Margherita", price: "$12.00" },
							{ id: "pep", name: "Pepperoni", price: "$14.00" },
							{ id: "veg", name: "Veggie", price: "$13.00" }
						]
					},
					content: [{ type: "text", text: "Here is the pizza menu." }]
				};
			}
		);

		server.paidTool(
			"pizza.buy",
			"Use this to buy the selected pizza.",
			"$0.001",
			{ pizzaId: z.string(), size: z.enum(["small", "medium", "large"]) },
			{
				"openai/toolInvocation/invoking": "Placing pizza order…",
				"openai/toolInvocation/invoked": "Pizza order placed",
				readOnlyHint: true,
			},
			async ({ pizzaId, size }) => {
				const sizeLabel = size[0].toUpperCase() + size.slice(1);
				// Simple server-side price calculation (mirrors UI multipliers)
				const basePrices: Record<string, number> = { marg: 12, pep: 14, veg: 13 };
				const base = basePrices[pizzaId] ?? 12;
				const multipliers: Record<typeof size, number> = { small: 1.0, medium: 1.15, large: 1.3 };
				const total = base * (multipliers[size] ?? 1.15);
				return {
					content: [
						{ type: "text", text: `Order placed: ${sizeLabel} pizza (${pizzaId}) - $${total.toFixed(2)}. Enjoy!` },
					],
					structuredContent: { order: { pizzaId, size, total: `$${total.toFixed(2)}` } },
					_meta: {
						"openai/toolInvocation/invoking": "Placing pizza order…",
						"openai/toolInvocation/invoked": "Pizza order placed",
						readOnlyHint: true,
					},
				};
			}
		);

		// Free tool: present the widget with structured content
		server.registerTool(
			"report.show",
			{
				title: "Show Payment Report",
				description: "Use this when the user asks to view their payment report or dashboard.",
				inputSchema: {},
				outputSchema: {},
				annotations: { readOnlyHint: true },
				_meta: {
					"openai/outputTemplate": "ui://widget/chatgpt-mcpay-inline.html",
					"openai/widgetAccessible": true,
					"openai/toolInvocation/invoking": "Loading the report…",
					"openai/toolInvocation/invoked": "Report loaded"
				},
			},
			async () => {
				return {
					structuredContent: {
						cards: [
							{ id: "1", title: "Today", value: "$12.40" },
							{ id: "2", title: "Yesterday", value: "$9.10" }
						]
					},
					content: [{ type: "text", text: "Here is a quick snapshot." }]
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
					_meta: {
						"openai/toolInvocation/invoking": "Generating premium summary…",
						"openai/toolInvocation/invoked": "Premium summary ready",
						readOnlyHint: true,
					}
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
