"use client"

import { useEffect, useMemo, useState } from "react"
import { useTheme } from "@/components/providers/theme-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader } from "@/components/ui/drawer"
import { AlertCircle, Github, Loader2 } from "lucide-react"
import { signIn, useSession } from "@/lib/client/auth"

// Keep the same external API
type AccountModalProps = {
  isOpen: boolean
  onClose: (open: boolean) => void
  defaultTab?: "funds" | "wallets" | "settings" | "developer"
}

type IframeMessage = { type?: string; payload?: unknown }

export function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const { isDark } = useTheme()
  const { data: session, isPending: sessionLoading } = useSession()

  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string>("")
  const [isMobile, setIsMobile] = useState(false)

  const iframeOrigin = "http://localhost:3005"
  const iframeUrl = useMemo(() => {
    const theme = isDark ? "dark" : "light"
    return `${iframeOrigin}?theme=${theme}`
  }, [isDark])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== iframeOrigin) return
      const data = event.data as IframeMessage
      if (data && typeof data === "object" && (data as IframeMessage).type === "mcpay:close") {
        onClose(false)
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [onClose])

  const handleGitHubSignIn = async () => {
    setIsAuthenticating(true)
    setIsLoading(true)
    setError("")
    try {
      await signIn.social({ provider: "github", callbackURL: window.location.href })
      // keep loading state until session loads
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with GitHub")
      setIsAuthenticating(false)
      setIsLoading(false)
    }
  }

  // Clear authenticating state when session status resolves
  useEffect(() => {
    if (session?.user && isAuthenticating) {
      setIsAuthenticating(false)
      setIsLoading(false)
    }
    if (!sessionLoading && isAuthenticating && !session?.user) {
      setIsAuthenticating(false)
      setIsLoading(false)
    }
  }, [session, sessionLoading, isAuthenticating])

  const LoadingSpinner = ({ message }: { message?: string }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[280px] space-y-3">
      <Loader2 className="h-6 w-6 animate-spin" />
      {message && (
        <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          {message}
        </p>
      )}
    </div>
  )

  const ModalHeader = ({ Component }: { Component: React.ComponentType<{ children: React.ReactNode }> }) => (
    <Component>
      <div className="text-lg font-semibold">
        {session?.user ? "Account" : "Sign In"}
      </div>
    </Component>
  )

  const GitHubSignIn = () => (
    <div className="flex flex-col justify-center min-h-[360px] space-y-5 p-3">
      <div className="text-center">
        <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? "bg-gray-800/50" : "bg-gray-50"}`}>
          <Github className={`h-6 w-6 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
        </div>
        <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Sign in to MCPay</h2>
        <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Connect with your GitHub account</p>
      </div>

      {error && (
        <div className={`p-3 rounded-lg border ${isDark ? "bg-red-950/50 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-700"}`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={handleGitHubSignIn}
        disabled={isLoading || isAuthenticating}
        className="w-full h-11 text-[15px] font-medium"
        size="lg"
      >
        {isLoading || isAuthenticating ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Github className="h-4 w-4 mr-3" />}
        {isLoading || isAuthenticating ? "Signing you in..." : "Continue with GitHub"}
      </Button>

      <div className={`text-center text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </div>
    </div>
  )

  const Frame = () => {
    const [ready, setReady] = useState(false)
    const [slow, setSlow] = useState(false)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
      setReady(false)
      setFailed(false)
      setSlow(false)
      const t = setTimeout(() => setSlow(true), 6000)
      return () => clearTimeout(t)
    }, [iframeUrl])

    return (
      <div className="relative w-full h-full">
        {!ready && !failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            {slow && (
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Still loading…</p>
            )}
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>Failed to load content</p>
            <Button size="sm" variant="outline" onClick={() => { setFailed(false); setReady(false); }}>
              Retry
            </Button>
          </div>
        )}
        <iframe
          key={iframeUrl}
          src={iframeUrl}
          className={`w-full h-full ${ready ? "opacity-100" : "opacity-0"} transition-opacity duration-200`}
          style={{ border: 0 }}
          loading="eager"
          allow="clipboard-write; clipboard-read; autoplay; payment"
          onLoad={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      </div>
    )
  }

  // Show loading during session loading or authentication flow
  if (sessionLoading || isAuthenticating) {
    const loadingMessage = isAuthenticating ? "Signing you in..." : sessionLoading ? "Loading your account..." : undefined

    if (isMobile) {
      return (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className={`h-[72vh] flex flex-col p-0 ${isDark ? "bg-gray-900 border-gray-800" : ""}`}>
            <LoadingSpinner message={loadingMessage} />
          </DrawerContent>
        </Drawer>
      )
    }

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-xl h-[72vh] flex flex-col p-0 ${isDark ? "bg-gray-900 border-gray-800" : ""}`}>
          <LoadingSpinner message={loadingMessage} />
        </DialogContent>
      </Dialog>
    )
  }

  // Mobile drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className={`h-[72vh] flex flex-col p-0 ${isDark ? "bg-gray-900 border-gray-800" : ""}`}>
          {!session?.user ? <DrawerHeader /> : null}
          <div className="flex-1 overflow-hidden">
            {session?.user ? <Frame /> : <GitHubSignIn />}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  // Desktop dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-xl h-[72vh] flex flex-col p-0 ${isDark ? "bg-gray-900 border-gray-800" : ""}`}>
        {!session?.user ? (
          <DialogHeader />
        ) : null}
        <div className="flex-1 overflow-hidden">
          {session?.user ? <Frame /> : <GitHubSignIn />}
        </div>
      </DialogContent>
    </Dialog>
  )
}