"use client"

import { useEffect, useState } from "react"
import { useTheme } from "@/components/providers/theme-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader } from "@/components/ui/drawer"
import { AlertCircle, Github, Loader2 } from "lucide-react"
import Image from "next/image"
import { signIn, useSession } from "@/lib/client/auth"
import { UserAccountPanel } from "@/components/custom-ui/user-modal"

// Keep the same external API
type AccountModalProps = {
  isOpen: boolean
  onClose: (open: boolean) => void
  defaultTab?: "funds" | "wallets" | "developer"
}

export function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const { data: session, isPending: sessionLoading } = useSession()
  const { isDark } = useTheme()

  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string>("")
  const [isMobile, setIsMobile] = useState(false)

  // Deprecated iframe approach removed in favor of in-app panel

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Legacy iframe message listener no longer needed

  const handleGitHubSignIn = async () => {
    setIsAuthenticating(true)
    setIsLoading(true)
    setError("")
    try {
      await signIn.social({ provider: "github", callbackURL: window.location.href })
      // Keep loading state - page will reload after successful authentication
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with GitHub")
      setIsAuthenticating(false)
      setIsLoading(false)
    }
  }

  // Keep loading state until page reloads after successful authentication

  const LoadingSpinner = ({ message }: { message?: string }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[280px] space-y-6 p-6">
      {/* Enhanced loading spinner */}
      <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${isDark ? "bg-gradient-to-br from-gray-800/80 to-gray-900/80 shadow-lg" : "bg-gradient-to-br from-gray-100 to-gray-50 shadow-md"}`}>
        <Loader2 className={`h-8 w-8 sm:h-10 sm:w-10 animate-spin ${isDark ? "text-gray-200" : "text-gray-700"}`} style={{ animationDuration: '0.5s' }} />
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse`} />
      </div>
      
      {message && (
        <div className="text-center space-y-3">
          <h2 className={`text-xl sm:text-2xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            {message}
          </h2>
          <p className={`text-sm sm:text-base max-w-md mx-auto leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            Please wait while we authenticate your account...
          </p>
        </div>
      )}
    </div>
  )


  const GitHubSignIn = () => (
    <div className="flex flex-col h-full p-6 sm:p-8">
      {/* Header Section - Top */}
      <div className="text-center space-y-6">
        {/* Enhanced MCPay Symbol Icon */}
        <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto flex items-center justify-center transition-all duration-300 ${isDark ? "bg-gradient-to-br from-gray-800/80 to-gray-900/80 shadow-lg" : "bg-gradient-to-br from-gray-100 to-gray-50 shadow-md"}`}>
          <div className={`relative w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300 ${isDark ? "opacity-90" : "opacity-100"}`}>
            <Image
              src={isDark ? "/MCPay-symbol-light.svg" : "/MCPay-symbol-dark.svg"}
              alt="MCPay Symbol"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse`} />
        </div>
        
        {/* Title and Description */}
        <div className="space-y-3">
          <h2 className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Welcome to MCPay</h2>
          <p className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Sign in with GitHub to access your account dashboard and manage your wallets & API keys.
          </p>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Login Section - Bottom */}
      <div className="space-y-6">
        {/* Error State */}
        {error && (
          <div className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${isDark ? "bg-red-950/50 border-red-800/50 shadow-lg" : "bg-red-50 border-red-200 shadow-md"}`}>
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg ${isDark ? "bg-red-800/50 text-red-400" : "bg-red-500/10 text-red-600"}`}>
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Authentication Error</h4>
                  <p className={`text-sm mt-2 leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Login Button */}
        <Button
          type="button"
          onClick={handleGitHubSignIn}
          disabled={isLoading || isAuthenticating}
          className={`group relative overflow-hidden w-full h-12 sm:h-14 text-base font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 ${
            isDark 
              ? "bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white border border-gray-600 hover:border-gray-500" 
              : "bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white border border-gray-800 hover:border-gray-700"
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            {isLoading || isAuthenticating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Github className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
            )}
            <span className="transition-all duration-300">
              {isLoading || isAuthenticating ? "Signing you in..." : "Continue with GitHub"}
            </span>
          </div>
          
          {/* Button shimmer effect */}
          <div className={`absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ${
            isDark ? "bg-gradient-to-r from-transparent via-white/10 to-transparent" : "bg-gradient-to-r from-transparent via-white/20 to-transparent"
          }`} />
        </Button>

        {/* Footer */}
        <div className={`text-center space-y-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          <p className="text-sm leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )

  const Frame = () => <UserAccountPanel isActive={true} />

  // Show loading during session loading or authentication flow
  if (sessionLoading || isAuthenticating) {
    const loadingMessage = isAuthenticating ? "Signing you in..." : sessionLoading ? "Loading your account..." : undefined

    if (isMobile) {
      return (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className={`h-[72vh] flex flex-col p-0 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
            <LoadingSpinner message={loadingMessage} />
          </DrawerContent>
        </Drawer>
      )
    }

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-xl h-[72vh] flex flex-col p-0 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
          <LoadingSpinner message={loadingMessage} />
        </DialogContent>
      </Dialog>
    )
  }

  // Mobile drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className={`h-[72vh] flex flex-col p-0 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
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
      <DialogContent className={`max-w-xl h-[72vh] flex flex-col p-0 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
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