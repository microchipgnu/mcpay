import { NextResponse, type NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

async function inspectOpenAPI(url: string) {
  try {
    // Use api2 to inspect OpenAPI specification
    const response = await fetch(`https://api2.mcpay.tech/inspect-mcp?url=${encodeURIComponent(url)}`)
    
    if (!response.ok) {
      throw new Error(`Failed to inspect OpenAPI: ${response.status}`)
    }

    const data = await response.json()
    
    if (Array.isArray(data.tools)) {
      return {
        url,
        tools: data.tools.map((tool: { name: string; description?: string }) => ({
          name: tool.name,
          description: tool.description
        }))
      }
    } else {
      throw new Error("Invalid response format from api2")
    }
  } catch (error) {
    console.warn("Warning: OpenAPI inspection failed:", error)
    throw error
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get("url")?.trim()

    if (!url || !isValidHttpUrl(url)) {
      return NextResponse.json({ ok: false, error: "Missing or invalid 'url' query param" }, { status: 400 })
    }

    const result = await inspectOpenAPI(url)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { url?: string }
    const url = (body.url || "").trim()

    if (!url || !isValidHttpUrl(url)) {
      return NextResponse.json({ ok: false, error: "Missing or invalid 'url' in request body" }, { status: 400 })
    }

    const result = await inspectOpenAPI(url)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
