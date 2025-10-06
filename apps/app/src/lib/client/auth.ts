import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: "http://localhost:3050",
  fetchOptions: {
    credentials: "include",
    onError: (error) => {
      console.error("Auth error:", error) 
    }
  },
})

// Export hooks for easy use throughout the app
export const { 
  useSession, 
  signIn, 
  signUp, 
  signOut
} = authClient

