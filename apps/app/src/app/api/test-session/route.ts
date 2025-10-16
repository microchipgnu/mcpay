import { headers } from "next/headers"
import { serverAuth } from "@/lib/client/auth"

export async function GET() {
  const h = await headers()

  const session = await serverAuth.getSession({
    fetchOptions: {
      headers: {
        cookie: h.get('cookie') ?? '',
      },
      credentials: 'include',
    },
  })

  return Response.json(session)
}
