import { createAuthClient } from "better-auth/react";
import { createAuthClient as createClient } from "better-auth/client";

// This client is safe to use on the server as a thin HTTP caller to your auth server
export const serverAuth = createClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL!,
  fetchOptions: {
    credentials: "include",
    onError: (error) => {
      console.error("Auth error:", error) 
    }
  },
});

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
  fetchOptions: {
    credentials: "include",
    onError: (error) => {
      console.error("Auth error:", error) 
    }
  },
});

export const { useSession, signIn, signUp, signOut } = authClient;