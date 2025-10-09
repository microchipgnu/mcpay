// app/api/secret/route.ts
import { headers } from "next/headers";
import { serverAuth } from "@/auth-client";

export async function GET() {
  const h = await headers();

  // forward the incoming cookies/headers so Better Auth can find the session cookie
  const session = await serverAuth.getSession({
    fetchOptions: {
      // Next injects the user's cookies here
      headers: {
        cookie: h.get("cookie") ?? "",
      },
      credentials: "include",
    },
  });

  if (session.data === null) return new Response("Unauthorized", { status: 401 });
  return Response.json({ ok: true, user: session.data?.user });
}
