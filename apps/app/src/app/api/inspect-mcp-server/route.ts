import { NextResponse, type NextRequest } from "next/server"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { experimental_createMCPClient as createMCPClient } from "ai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type IncludeParam = Array<"tools" | "prompts"> | undefined

function parseIncludeParam(value: string | null): IncludeParam {
  if (!value) return undefined
  const parts = value.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean)
  const include = parts.filter((p): p is "tools" | "prompts" => p === "tools" || p === "prompts")
  return include.length ? include : undefined
}

function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

async function inspect(url: string, include?: IncludeParam, authHeaders?: Record<string, string>) {
  const doTools = !include || include.includes("tools")
  const doPrompts = !include || include.includes("prompts")

  const [tools, prompts] = await Promise.all([
    doTools ? getToolsFromMCP(url, authHeaders).catch((err) => { console.warn('tools fetch failed', err); return [] }) : Promise.resolve(undefined),
    doPrompts ? getPromptsFromMCP(url, authHeaders).catch((err) => { console.warn('prompts fetch failed', err); return [] }) : Promise.resolve(undefined),
  ])

  return { url, tools, prompts }
}

async function getToolsFromMCP(url: string, authHeaders?: Record<string, string>) {
  try {
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: {
        headers: authHeaders
      }
    })
    const client = await createMCPClient({ transport })
    const tools = await client.tools()
    if (!tools) {
      throw new Error("No tools found")
    }
    const toolNames = Object.keys(tools)
    return toolNames.map((name) => ({
      name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      description: (tools as any)[name]?.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema: (tools as any)[name]?.inputSchema,
    }))
  } catch (error) {
    // Keep behavior resilient: return empty on failure
    console.warn("Warning: MCP tools unavailable (returning empty set):", error)
    return []
  }
}

async function getPromptsFromMCP(url: string, authHeaders?: Record<string, string>) {
  try {
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: {
        headers: authHeaders
      }
    })
    const client = new Client({ name: "mcpay-inspect", version: "1.0.0" })
    await client.connect(transport)
    const prompts = await client.listPrompts()

    const enriched: Array<{ name: string; description?: string; content: string; messages: unknown[] }> = []

    // Type helpers to avoid explicit "any"
    type PromptDetail = { description?: string; messages?: unknown[] }
    type PromptMessage = { content?: unknown }
    const isTextContent = (value: unknown): value is { type: "text"; text: string } => {
      return (
        typeof value === "object" &&
        value !== null &&
        "type" in value &&
        "text" in value &&
        (value as { type: unknown }).type === "text" &&
        typeof (value as { text: unknown }).text === "string"
      )
    }

    for (const prompt of prompts.prompts) {
      const promptDetail = await client.getPrompt({ name: prompt.name })
      const { description, messages } = (promptDetail as PromptDetail)
      const messageArray: unknown[] = Array.isArray(messages) ? messages : []

      const textContent = messageArray
        .map((message) => {
          const content = (message as PromptMessage)?.content
          if (typeof content === "string") return content
          if (isTextContent(content)) return content.text
          return ""
        })
        .filter((text) => text.length > 0)
        .join("\n\n") || ""

      enriched.push({
        name: prompt.name,
        description: prompt.description || description,
        content: textContent,
        messages: messageArray,
      })
    }

    return enriched
  } catch (error) {
    console.warn("Warning: MCP prompts unavailable (returning empty set):", error)
    return []
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get("url")?.trim()
    const include = parseIncludeParam(searchParams.get("include"))
    const authHeadersParam = searchParams.get("authHeaders")

    if (!url || !isValidHttpUrl(url)) {
      return NextResponse.json({ ok: false, error: "Missing or invalid 'url' query param" }, { status: 400 })
    }

    let authHeaders: Record<string, string> | undefined
    if (authHeadersParam) {
      try {
        authHeaders = JSON.parse(authHeadersParam)
      } catch {
        return NextResponse.json({ ok: false, error: "Invalid authHeaders JSON" }, { status: 400 })
      }
    }

    const result = await inspect(url, include, authHeaders)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { url?: string; include?: string | string[]; authHeaders?: Record<string, string> }
    const url = (body.url || "").trim()
    const include = Array.isArray(body.include)
      ? (body.include as string[]).map((p) => p.toLowerCase()).filter((p): p is "tools" | "prompts" => p === "tools" || p === "prompts")
      : parseIncludeParam(typeof body.include === "string" ? body.include : null)
    const authHeaders = body.authHeaders

    if (!url || !isValidHttpUrl(url)) {
      return NextResponse.json({ ok: false, error: "Missing or invalid 'url' in request body" }, { status: 400 })
    }

    const result = await inspect(url, include, authHeaders)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}


