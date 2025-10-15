import { headers } from "next/headers"
import { env } from '@/env'
import { serverAuth } from "@/lib/client/auth"
// TODO: add withProxy and LoggingHook back in
// import { withProxy, LoggingHook } from 'mcpay/handler'

export async function POST(request: Request) {
  const h = await headers()
  const url = new URL(request.url)
  const targetUrl = url.searchParams.get('target-url')

  const session = await serverAuth.getSession({
    fetchOptions: {
      headers: {
        cookie: h.get('cookie') ?? '',
      },
      credentials: 'include',
    },
  })

  if (!session.data) {
    return new Response("Unauthorized", { status: 401 })
  }

  if (!targetUrl) {
    return new Response("target-url parameter is required", { status: 400 })
  }

  console.log('targetUrl', targetUrl)

  // Use the local MCP server instead of external proxy
  const mcpUrl = `${env.NEXT_PUBLIC_AUTH_URL}/mcp?target-url=${targetUrl}`

  console.log('mcpUrl', mcpUrl)
  
  // Forward the request to the local MCP server with session cookie
  const response = await fetch(mcpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Cookie': h.get('cookie') || '', // Forward the session cookie
      'X-Wallet-Type': h.get('x-wallet-type') || '',
      'X-Wallet-Address': h.get('x-wallet-address') || '',
      'X-Wallet-Provider': h.get('x-wallet-provider') || '',
    },
    body: request.body,
    credentials: 'include',
    // @ts-expect-error 
    duplex: 'half',
  })

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wallet-Type, X-Wallet-Address, X-Wallet-Provider',
    },
  })
}

export async function GET(request: Request) {
  const h = await headers()
  const url = new URL(request.url)
  const targetUrl = url.searchParams.get('target-url')

  const session = await serverAuth.getSession({
    fetchOptions: {
      headers: {
        cookie: h.get('cookie') ?? '',
      },
      credentials: 'include',
    },
  })

  if (!session.data) {
    return new Response("Unauthorized", { status: 401 })
  }
  
  if (!targetUrl) {
    return new Response("target-url parameter is required", { status: 400 })
  }


  // Use the local MCP server instead of external proxy
  const mcpUrl = `${env.NEXT_PUBLIC_AUTH_URL}/mcp?target-url=${targetUrl}`
  
  // Forward the request to the local MCP server with session cookie
  const response = await fetch(mcpUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json, text/event-stream',
      'Cookie': h.get('cookie') || '', // Forward the session cookie
      'X-Wallet-Type': h.get('x-wallet-type') || '',
      'X-Wallet-Address': h.get('x-wallet-address') || '',
      'X-Wallet-Provider': h.get('x-wallet-provider') || '',
    },
    credentials: 'include',
    // @ts-ignore
    duplex: 'half',
  })

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wallet-Type, X-Wallet-Address, X-Wallet-Provider',
    },
  })
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json, text/event-stream',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wallet-Type, X-Wallet-Address, X-Wallet-Provider',
    },
  })
}
