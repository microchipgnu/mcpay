import { headers } from "next/headers"
import { env } from '@/env'
import { serverAuth } from "@/lib/client/auth"
// TODO: add withProxy and LoggingHook back in
// import { withProxy, LoggingHook } from 'mcpay/handler'

// Helper function to validate and extract origin
function getValidOrigin(request: Request): string | null {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  // Extract origin from referer if origin header is missing
  const extractedOrigin = origin || (referer ? new URL(referer).origin : null)
  
  // In production, only allow specific domains
  if (env.NODE_ENV === 'production') {
    const allowedOrigins = [
      'https://v2.mcpay.tech',
      'https://mcpay.tech',
      'https://www.mcpay.tech',
    ]
    
    if (extractedOrigin && allowedOrigins.includes(extractedOrigin)) {
      return extractedOrigin
    }
    
    return null
  }
  
  // In development, allow localhost and local IPs
  if (extractedOrigin && (
    extractedOrigin.startsWith('http://localhost:') ||
    extractedOrigin.startsWith('http://127.0.0.1:') ||
    extractedOrigin.startsWith('https://localhost:') ||
    extractedOrigin.startsWith('https://127.0.0.1:')
  )) {
    return extractedOrigin
  }
  
  return extractedOrigin
}

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
    // @ts-expect-error this is valid and needed
    duplex: 'half',
  })

  // Get the validated origin for CORS
  const validOrigin = getValidOrigin(request)
  
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': validOrigin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wallet-Type, X-Wallet-Address, X-Wallet-Provider',
      'Access-Control-Allow-Credentials': validOrigin ? 'true' : 'false',
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
    // @ts-expect-error this is valid and needed
    duplex: 'half',
  })

  // Get the validated origin for CORS
  const validOrigin = getValidOrigin(request)
  
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': validOrigin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wallet-Type, X-Wallet-Address, X-Wallet-Provider',
      'Access-Control-Allow-Credentials': validOrigin ? 'true' : 'false',
    },
  })
}

export async function OPTIONS(request: Request) {
  // Get the validated origin for CORS
  const validOrigin = getValidOrigin(request)
  
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/json, text/event-stream',
      'Access-Control-Allow-Origin': validOrigin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wallet-Type, X-Wallet-Address, X-Wallet-Provider',
      'Access-Control-Allow-Credentials': validOrigin ? 'true' : 'false',
    },
  })
}
