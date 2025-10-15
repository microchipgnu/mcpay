"use client"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, CheckCircle2, Loader2, AlertTriangle } from "lucide-react"
import { useSession } from "@/lib/client/auth"
import { authApi } from "@/lib/client/utils"
import { toast } from "sonner"
import { useTheme } from "@/components/providers/theme-context"

type ApiKeyModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApiKeyCreated: (apiKey: string) => void
  serverName?: string
  baseUrl?: string
}

export function ApiKeyModal({ 
  open, 
  onOpenChange, 
  onApiKeyCreated,
  serverName = "MCP Server",
  baseUrl = ""
}: ApiKeyModalProps) {
  const { data: session } = useSession()
  const { isDark } = useTheme()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [apiKeyName, setApiKeyName] = useState("")
  const [createdApiKey, setCreatedApiKey] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [finalUrl, setFinalUrl] = useState<string>("")

  const handleCreateApiKey = useCallback(async () => {
    if (!session?.user) {
      setError("Please sign in to create an API key")
      return
    }

    setLoading(true)
    setError("")
    
    try {
      const response = await authApi.createApiKey()
      
      if (response && typeof response === 'object' && 'key' in response) {
        const apiKey = response.key as string
        setCreatedApiKey(apiKey)
        
        // Build the final URL with the API key parameter
        if (baseUrl) {
          const url = new URL(baseUrl)
          url.searchParams.set('api_key', apiKey)
          setFinalUrl(url.toString())
        }
        
        toast.success("API key created successfully!")
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create API key"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [session?.user, onApiKeyCreated])

  const handleCopyUrl = useCallback(async () => {
    if (!finalUrl) return
    
    try {
      await navigator.clipboard.writeText(finalUrl)
      setCopied(true)
      toast.success("Connection URL copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy connection URL")
    }
  }, [finalUrl])

  const handleClose = useCallback(() => {
    setCreatedApiKey("")
    setApiKeyName("")
    setError("")
    setCopied(false)
    setFinalUrl("")
    onOpenChange(false)
  }, [onOpenChange])

  const handleContinue = useCallback(() => {
    // Call the callback to update the parent component's state
    if (createdApiKey) {
      onApiKeyCreated(createdApiKey)
    }
    handleClose()
  }, [handleClose, createdApiKey, onApiKeyCreated])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md max-h-[90vh] overflow-hidden ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>
            Create API Key
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className={`p-3 rounded-md border ${isDark ? "bg-red-950/50 border-red-800/50" : "bg-red-50 border-red-200"}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-md ${isDark ? "bg-red-800/50 text-red-400" : "bg-red-500/10 text-red-600"}`}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Error</h4>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{error}</p>
                </div>
              </div>
            </div>
          )}

          {!session?.user ? (
            <div className={`p-3 rounded-md border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                Please sign in to create an API key
              </div>
            </div>
          ) : !createdApiKey ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key-name" className="text-sm font-medium">
                  API Key Name (Optional)
                </Label>
                <Input
                  id="api-key-name"
                  placeholder={`${serverName} API Key`}
                  value={apiKeyName}
                  onChange={(e) => setApiKeyName(e.target.value)}
                  className="text-sm"
                />
              </div>
              
              <div className={`p-3 rounded-md border ${isDark ? "bg-blue-950/50 border-blue-800/50" : "bg-blue-50 border-blue-200"}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-md ${isDark ? "bg-blue-800/50 text-blue-400" : "bg-blue-500/10 text-blue-600"}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Important</h4>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      This API key will be used to authenticate with the MCP server. Keep it secure and don't share it with others.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateApiKey}
                  disabled={loading}
                  className="flex-1 gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create API Key"
                  )}
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-3 rounded-md border ${isDark ? "bg-teal-950/50 border-teal-800/50" : "bg-teal-50 border-teal-200"}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-md ${isDark ? "bg-teal-800/50 text-teal-400" : "bg-teal-500/10 text-teal-600"}`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Connection URL Ready</h4>
                    <div className="space-y-2 min-w-0">
                      <div className={`p-2 rounded-md border ${isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"} overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 max-w-full`}>
                        <code className={`text-xs font-mono whitespace-nowrap block ${isDark ? "text-white" : "text-gray-900"}`}>
                          {finalUrl}
                        </code>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleCopyUrl}
                          className="gap-2"
                        >
                          {copied ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy URL
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-md border ${isDark ? "bg-amber-950/50 border-amber-800/50" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-md ${isDark ? "bg-amber-800/50 text-amber-400" : "bg-amber-500/10 text-amber-600"}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Security Notice</h4>
                    <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      This connection URL contains your API key. Keep it secure and don't share it with others.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleContinue} className="flex-1">
                  Continue
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ApiKeyModal
