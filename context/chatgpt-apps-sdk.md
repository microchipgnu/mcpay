## Apps SDK Digest

### What it is
- **Apps SDK**: A framework to build apps for ChatGPT using the Model Context Protocol (MCP).
- **MCP server**: Exposes tools, returns structured results, and can reference UI components rendered inline in ChatGPT.
- **Component bridge**: Components run in an iframe and talk to ChatGPT via `window.openai`.

### Architecture overview
- **MCP building blocks**:
  - List tools (JSON Schema contracts, annotations)
  - Call tools (model invokes with args; server returns results)
  - Return components (tool metadata references an HTML template resource)
- **Tool results** include:
  - `structuredContent` (JSON the model and component see)
  - `content` (optional text/Content[] for transcript)
  - `_meta` (component-only data; hidden from model)
- **Component templates**:
  - Register with `mimeType: text/html+skybridge`
  - Link from tools via `_meta["openai/outputTemplate"]`

### Reference quick-look
- **`window.openai`** (in component iframe):
  - Read: `toolInput`, `toolOutput`, `widgetState`, `maxHeight`, `displayMode`, `locale`, `theme`
  - Write/act: `setWidgetState(state)`, `callTool(name, args)`, `sendFollowupTurn({ prompt })`, `requestDisplayMode({ mode })`
  - Events: `openai:set_globals`, `openai:tool_response`
- **Tool descriptor essentials**:
  - First-class `securitySchemes` (e.g., `noauth`, `oauth2` with scopes)
  - `_meta` additions: `openai/outputTemplate`, `openai/widgetAccessible`, `openai/toolInvocation/*` status strings
  - Annotation: `readOnlyHint: true` for non-mutating tools
- **Component resource `_meta`**:
  - `openai/widgetDescription` (reduce redundant assistant narration)
  - `openai/widgetPrefersBorder` (card framing hint)
  - `openai/widgetCSP` (CSP snapshot: `connect_domains`, `resource_domains`)
  - `openai/widgetDomain` (optional dedicated component origin)
- **Client-provided `_meta` hints**:
  - `openai/locale` (BCP 47), `openai/userAgent`, `openai/userLocation`

### Plan
- **Research use cases**:
  - Gather user jobs-to-be-done, prompt samples (direct/indirect/negative), constraints
  - Define success criteria per scenario; create a golden prompt set
- **Define tools**:
  - One job per tool; explicit `inputSchema`; predictable outputs with IDs/timestamps/status
  - Metadata: action-oriented names, "Use this when…" descriptions, parameter docs, read-only hints
- **Design components**:
  - Decide viewer vs editor, single-shot vs multi‑turn, inline vs fullscreen/PiP
  - Specify structured content payload, initial state via `toolOutput`, persisted UI via `widgetState`
  - Plan responsive behavior, accessibility, navigation, telemetry, and fallbacks

### Build
- **Set up your MCP server**:
  - Choose SDK (Python FastMCP or TypeScript)
  - Register a component HTML resource and reference it from tools via `_meta["openai/outputTemplate"]`
  - Return `structuredContent`, optional `content`, and component‑only `_meta`
  - Advanced: `openai/widgetAccessible: true`, status strings, localization echoing `openai/locale`, CSP, custom domain
- **Build a custom UX**:
  - Understand `window.openai` data flow and events
  - Persist user UI decisions with `setWidgetState`; hydrate from `widgetState` or `toolOutput`
  - Trigger server actions with `callTool`; use `sendFollowupTurn` for transcript updates
  - Request `displayMode` changes (inline, PiP, fullscreen); subscribe to `openai:tool_response`
- **Authentication**:
  - OAuth 2.1 flow that conforms to MCP authorization: dynamic client registration + PKCE
  - Required endpoints: `/.well-known/oauth-protected-resource`, `/.well-known/openid-configuration`, `token_endpoint`, `registration_endpoint`
  - Flow: discover → register → user auth/consent → code+PKCE → access token → verify per request (issuer/audience/exp/scopes)
  - Per‑tool `securitySchemes` to declare auth needs; enforce server‑side regardless of client hints
- **Storage**:
  - BYO backend for durable data; keep latency low; version schemas
  - Use `widgetState` for ephemeral UI; store durable artifacts in backend
  - Plan retention, backups, monitoring, and conflict resolution

### Examples
- The “Pizzaz” demo shows multiple tools mapped to prebuilt UI resources (map, list, carousel, video) with status strings and consistent component wiring. Treat as blueprints; adapt data layer to your tools.

### Deploy
- **Options**: Managed containers (Fly/Render/Railway), Cloud Run/Azure Container Apps (beware cold starts), Kubernetes (SSE-compatible ingress)
- **Local dev**: expose via `ngrok http <port>` and point to `/mcp`
- **Environment**: secrets via env vars; log tool-call IDs, latency, errors; monitor resources
- **Rollout**: gate access (developer mode/flags), run golden prompts, capture artifacts (screens/screencasts)

### Connect from ChatGPT
- Enable developer mode in Settings → Connectors
- Create a connector: name, description (used for discovery), public `/mcp` URL
- Toggle the connector on in a conversation; validate via explicit prompts; test mobile
- Refresh metadata after server changes; also connect via API Playground for raw request/response

### Testing
- Unit test tool handlers (schema validation, edge cases, auth)
- Use MCP Inspector locally to list tools, call tools, and render components
- Validate discovery in ChatGPT developer mode with golden prompt set
- Regression checklist: tool list, `outputSchema` conformance, error-free widgets, auth flows, discovery precision/recall

### Troubleshooting (triage by layer)
- **Server**: tools not listed; missing `_meta["openai/outputTemplate"]`; schema mismatches; slow responses
- **Widget**: load failures (CSP/bundles); state not persisting (missing `setWidgetState`); mobile layout issues (`displayMode`, `maxHeight`)
- **Discovery**: never triggers (rewrite descriptions with “Use this when…”); wrong tool (narrow scope or split tools); launcher ranking drift
- **Auth**: 401s (return `WWW-Authenticate`); dynamic client registration issues
- **Deployment**: ngrok timeouts; proxies breaking streaming/SSE

### Design guidelines (build native-feeling experiences)
- **Principles**: Conversational, Intelligent, Simple, Responsive, Accessible
- **Good use cases**: clear, time‑bound, action‑oriented tasks with concise visual summaries
- **Avoid**: long‑form/static content, deep multi‑step flows, ads/irrelevant messaging, sensitive data exposure, duplicating system functions
- **Display modes**:
  - Inline (cards/carousels): quick confirmations, small structured datasets, max two CTAs, no deep nav/nested scrolling
  - Fullscreen: immersive tasks (maps, editors); composer remains available
  - PiP: persistent/live sessions (video, games); keep reactive to chat; auto-close when session ends
- **Visuals**: system colors/typography, consistent spacing, outlined icons; meet accessibility (contrast, alt text, text resizing)
- **Tone & proactivity**: concise, context-driven, no promotions; proactive nudges only when relevant and transparent

### User interaction (discovery & entry points)
- **Discovery** sources: named mention, in‑conversation ranking (context, citations, metadata, linking), directory listing
- **Improve discovery**: action-led tool descriptions; clear component descriptions; test precision/recall regularly
- **Entry points**: in‑conversation (linked tools auto-available), launcher (+ button with deep links/starter prompts)

### App developer guidelines (policy & quality)
- **Fundamentals**: clear purpose, originality/IP compliance, predictable quality, real functionality, not implied OpenAI endorsement
- **Metadata**: clear names/descriptions; accurate screenshots; explicit tool semantics (read-only vs write)
- **Auth & permissions**: transparent flows; minimal, necessary scopes; provide demo credentials
- **Safety**: comply with usage policies; appropriate for general audiences; respect user intent; fair play (no model-readable steering against others)
- **Privacy**: publish policy; minimize collection; avoid sensitive data; avoid raw location in schemas; don’t reconstruct full chat logs; transparent data practices; mark write actions; prevent exfiltration by surfacing writes as writes
- **Verification & support**: verified developer; keep contact up to date
- **After submission**: reviews may occur; inactive/noncompliant apps may be removed; tool signatures/descriptions are locked post‑listing; changes require resubmission

### Security & privacy (operational)
- Least privilege, explicit consent, defense in depth
- Structured content should be minimal; redact PII in logs; define retention; monitor and patch dependencies
- Prompt injection mitigation; validate inputs; require confirmation for destructive actions
- Widgets run under strict CSP; server follows standard network security; verify tokens and scopes on every call

### Metadata optimization (for discovery)
- Maintain golden prompt set (direct/indirect/negative)
- Metadata drafting: action-oriented names, “Use this when…”, parameter docs with examples/enums, `readOnlyHint`
- Evaluate in developer mode; log precision/recall; iterate one change at a time; monitor production analytics

### Practical checklist (from zero to live)
1) Plan: use cases → tools → components → golden prompts
2) Build: MCP server → register resources → link `_meta["openai/outputTemplate"]` → return `structuredContent` (+ optional `content`, `_meta`)
3) UX: component reads via `window.openai`, persists via `widgetState`, can `callTool` and `sendFollowupTurn`
4) Auth/Storage: OAuth 2.1 + per‑tool `securitySchemes`; define data contracts and retention
5) Test: unit tests → MCP Inspector → ChatGPT developer mode → API Playground
6) Deploy: HTTPS endpoint; env/secrets/logging/observability; ngrok for dev
7) Connect: create connector, enable in chat, refresh metadata on changes
8) Iterate: optimize metadata, monitor discovery, address troubleshooting cues

### End-to-end code examples

#### Project skeleton
```bash
mkdir -p app/{server,web}
cd app/web && npm init -y && npm install react@^18 react-dom@^18 && npm install -D typescript esbuild && cd -
```

```bash
# web/package.json (add build script)
{
  "scripts": {
    "build": "esbuild src/component.tsx --bundle --format=esm --outfile=dist/component.js"
  }
}
```

#### React component (web/src/component.tsx)
```tsx
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

type Task = { id: string; title: string; status: "todo" | "doing" | "done" };
type Board = { columns: { id: string; title: string; tasks: Task[] }[] };

function App() {
  const toolOutput = (window as any)?.openai?.toolOutput as Board | undefined;
  const initial = toolOutput ?? { columns: [] };
  const [board, setBoard] = useState<Board>(initial);

  useEffect(() => {
    const updated = (window as any)?.openai?.toolOutput as Board | undefined;
    if (updated) setBoard(updated);
  }, [(window as any)?.openai?.toolOutput]);

  async function refresh() {
    await (window as any)?.openai?.callTool?.("kanban.refresh", {});
  }

  async function persistSelection(taskId: string) {
    const state = { __v: 1, selectedTaskId: taskId };
    await (window as any)?.openai?.setWidgetState?.(state);
  }

  const allTasks = useMemo(
    () => board.columns.flatMap((c) => c.tasks),
    [board.columns]
  );

  return (
    <div className="antialiased w-full text-black">
      <div className="flex gap-4">
        {board.columns.map((col) => (
          <div key={col.id} className="flex-1 border rounded-2xl p-3">
            <div className="font-medium mb-2">{col.title}</div>
            <div className="space-y-2">
              {col.tasks.map((t) => (
                <button
                  key={t.id}
                  className="w-full text-left px-3 py-2 rounded-xl bg-black/5 hover:bg-black/10"
                  onClick={() => persistSelection(t.id)}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          className="rounded-full bg-black text-white px-3 py-1.5"
          onClick={refresh}
        >
          Refresh
        </button>
        <div className="text-sm text-black/60">
          {allTasks.length} tasks
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("kanban-root")!).render(<App />);
```

#### TypeScript MCP server (server/index.ts)
```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFileSync } from "node:fs";

type Task = { id: string; title: string; status: "todo" | "doing" | "done" };
type Column = { id: string; title: string; tasks: Task[] };
type Board = { columns: Column[] };

const server = new McpServer({ name: "kanban-server", version: "1.0.0" });

const KANBAN_JS = readFileSync("web/dist/component.js", "utf8");
const KANBAN_CSS = "";

server.registerResource(
  "kanban-widget",
  "ui://widget/kanban-board.html",
  {},
  async () => ({
    contents: [
      {
        uri: "ui://widget/kanban-board.html",
        mimeType: "text/html+skybridge",
        text: `
<div id="kanban-root"></div>
${KANBAN_CSS ? `<style>${KANBAN_CSS}</style>` : ""}
<script type="module">${KANBAN_JS}</script>
        `.trim(),
      },
    ],
  })
);

function loadBoard(): Board {
  const tasks: Task[] = [
    { id: "t1", title: "Design empty states", status: "todo" },
    { id: "t2", title: "Wireframe admin panel", status: "doing" },
    { id: "t3", title: "QA onboarding flow", status: "done" },
  ];
  return {
    columns: [
      { id: "todo", title: "To do", tasks: tasks.filter((t) => t.status === "todo") },
      { id: "doing", title: "In progress", tasks: tasks.filter((t) => t.status === "doing") },
      { id: "done", title: "Done", tasks: tasks.filter((t) => t.status === "done") },
    ],
  };
}

server.registerTool(
  "kanban.refresh",
  {
    title: "Show Kanban Board",
    description: "Use this when the user wants to view their kanban board.",
    inputSchema: { type: "object", properties: {} },
    _meta: {
      "openai/outputTemplate": "ui://widget/kanban-board.html",
      "openai/toolInvocation/invoking": "Displaying the board…",
      "openai/toolInvocation/invoked": "Displayed the board",
      "openai/widgetAccessible": true,
    },
  },
  async () => {
    const board = loadBoard();
    return {
      structuredContent: {
        columns: board.columns.map((c) => ({
          id: c.id,
          title: c.title,
          tasks: c.tasks.slice(0, 10),
        })),
      },
      content: [{ type: "text", text: "Here is your latest board." }],
      _meta: {},
    };
  }
);

export default server;
```

#### Python FastMCP with OAuth token verification (server.py)
```python
from mcp.server.fastmcp import FastMCP
from mcp.server.auth.settings import AuthSettings
from mcp.server.auth.provider import TokenVerifier, AccessToken

class MyVerifier(TokenVerifier):
    async def verify_token(self, token: str) -> AccessToken | None:
        payload = validate_jwt(token, jwks_url)  # implement validate_jwt
        if "user" not in payload.get("permissions", []):
            return None
        return AccessToken(
            token=token,
            client_id=payload["azp"],
            subject=payload["sub"],
            scopes=payload.get("permissions", []),
            claims=payload,
        )

mcp = FastMCP(
    name="kanban-mcp",
    stateless_http=True,
    token_verifier=MyVerifier(),
    auth=AuthSettings(
        issuer_url="https://your-tenant.us.auth0.com",
        resource_server_url="https://example.com/mcp",
        required_scopes=["user"],
    ),
)
```

#### Tool auth declarations (TypeScript)
```ts
server.registerTool(
  "kanban.create_task",
  {
    title: "Create Task",
    description: "Use this when the user wants to create a new task.",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string" } },
      required: ["title"],
    },
    securitySchemes: [{ type: "oauth2", scopes: ["tasks.write"] }],
    _meta: { "openai/outputTemplate": "ui://widget/kanban-board.html" },
  },
  async ({ title }) => ({
    content: [{ type: "text", text: `Created task: ${title}` }],
    structuredContent: {},
  })
);
```

#### Storage patterns
```ts
// Ephemeral UI: use widgetState from the iframe
await (window as any).openai.setWidgetState?.({ __v: 1, selectedTaskId: "t2" });

// Durable data: store in your backend
type CreateTaskBody = { title: string };
async function createTask(apiBase: string, body: CreateTaskBody): Promise<{ id: string }> {
  const res = await fetch(`${apiBase}/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
}
```

### Prompt pack: generate an end-to-end ChatGPT app

Copy/paste and fill bracketed values.

```text
Goal: Build a ChatGPT app for [domain], with tools for [primary actions].

Use cases (golden prompts):
- Direct: "[app name]: [explicit action]"
- Indirect: "I need to [goal] using my [data source]"
- Negative: "[similar ask]" (should not trigger)

Tools:
- Name: [domain.action]
- Description: "Use this when [clear scenario]. Do not use for [excluded]."
- inputSchema: { [parameters with types and enums] }
- outputSchema: { [machine-readable fields with IDs/timestamps/status] }
- securitySchemes: [noauth|oauth2 with scopes]
- _meta: { "openai/outputTemplate": "ui://widget/[component].html" }

Component:
- Inline card shows [key fields]; fullscreen supports [deeper workflow].
- Reads from toolOutput; persists UI with widgetState; can callTool for [actions].
- requestDisplayMode: [inline|pip|fullscreen] when [condition].

Server:
- Register resource: text/html+skybridge loading built JS/CSS.
- Return structuredContent + optional content; keep _meta for component-only data.
- Enforce auth per tool; verify scopes on every request.

Deploy & Connect:
- Expose /mcp over HTTPS (ngrok for dev). Create connector in ChatGPT, enable in conversation.
- Test with MCP Inspector and developer mode; iterate metadata for precision/recall.
```