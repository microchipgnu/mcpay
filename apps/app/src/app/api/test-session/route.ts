import { headers } from "next/headers"
import { serverAuth } from "@/lib/client/auth"
import { env } from '@/env'

export async function GET() {
  const h = await headers()
  const cookies = h.get('cookie') ?? ''

  console.log('=== Test Session Debug ===')
  console.log('Auth URL:', env.NEXT_PUBLIC_AUTH_URL)
  console.log('Cookies received:', cookies)
  console.log('Cookie count:', cookies.split(';').length)
  
  // Log individual cookies for debugging
  if (cookies) {
    cookies.split(';').forEach((cookie, index) => {
      console.log(`Cookie ${index + 1}:`, cookie.trim())
    })
  }

  const session = await serverAuth.getSession({
    fetchOptions: {
      headers: {
        cookie: cookies,
      },
      credentials: 'include',
    },
  })

  console.log('Session result:', {
    hasData: !!session.data,
    hasUser: !!session.data?.user,
    userId: session.data?.user?.id,
    sessionId: session.data?.session?.id,
    error: session.error
  })

  return Response.json({
    session,
    debug: {
      authUrl: env.NEXT_PUBLIC_AUTH_URL,
      cookieCount: cookies.split(';').length,
      hasCookies: !!cookies,
      cookies: cookies.split(';').map(c => c.trim()),
    }
  })
}
