"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Github, Loader2 } from "lucide-react"
import { signIn } from "@/lib/client/auth"

type ConnectModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectModal({ open, onOpenChange }: ConnectModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")

  async function handleGitHubSignIn() {
    setError("")
    setIsLoading(true)
    try {
      await signIn.social({ provider: "github", callbackURL: window.location.href })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with GitHub")
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center text-center space-y-5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-muted">
            <Github className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Sign in to authorize the application</h2>
            <p className="text-sm text-muted-foreground mt-1">Use your GitHub account</p>
          </div>
          {error ? (
            <div className="w-full text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </div>
          ) : null}
          <Button
            type="button"
            onClick={handleGitHubSignIn}
            disabled={isLoading}
            className="w-full h-11 text-[15px] font-medium"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Github className="h-4 w-4 mr-3" />}
            {isLoading ? "Signing you in..." : "Sign in with GitHub"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ConnectModal


