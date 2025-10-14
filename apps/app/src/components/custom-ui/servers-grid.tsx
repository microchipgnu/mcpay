"use client"

import { McpServer } from "@/lib/client/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { urlUtils } from "@/lib/client/utils"
import { Check, Copy, Hammer } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

export default function ServersGrid({
  servers,
  loading = false,
  className = "", // NEW
}: {
  servers: McpServer[]
  loading?: boolean
  className?: string // NEW
}) {
  const skeletonCount = 6

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl px-4 md:px-6 mx-auto ${className}`}
    >
      <TooltipProvider>
        {loading
          ? Array.from({ length: skeletonCount }).map((_, idx) => (
              <ServerSkeletonCard key={idx} />
            ))
          : servers.map((server) => <ServerCard key={server.id} server={server} />)}
      </TooltipProvider>
    </div>
  )
}

function ServerCard({ server }: { server: McpServer }) {
  const [copied, setCopied] = useState(false)
  const url = urlUtils.getMcpUrl(server.origin)

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Copied MCP endpoint to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Link href={`/servers/${server.id}`} className="group">
      <Card className="border border-border bg-background hover:shadow-lg rounded-lg transition-all cursor-pointer group-hover:border-foreground gap-0">
        <CardHeader className="mb-4">
          <CardTitle className="text-lg">{server?.server?.info?.name || "Unknown Server"}</CardTitle>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {server?.server?.info?.description || "No description available"}
          </p>
        </CardHeader>

        <CardContent>
          {/* Pills with icons */}
          <div className="flex items-center gap-2 mb-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-sm border font-mono text-muted-foreground transition-colors bg-transparent hover:border-blue-400 border-foreground/20">
                  <Hammer className="text-blue-400 h-3 w-3 stroke-[2.5]" />
                  <span className="text-foreground font-semibold">{server.tools.length}</span> Tools
                </div>
              </TooltipTrigger>
              <TooltipContent>Number of tools</TooltipContent>
            </Tooltip>

            {/* 
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-sm border font-mono text-muted-foreground transition-colors bg-transparent hover:border-red-400 border-foreground/20">
                  <Activity className="text-red-400 h-3 w-3 stroke-[2.5]" />
                  <span className="text-foreground font-semibold">3M</span> Runs
                </div>
              </TooltipTrigger>
              <TooltipContent>Hardcoded run count</TooltipContent>
            </Tooltip>
            */}
          </div>

          {/* URL with label + copy */}
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground">
                Connection URL
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  handleCopy()
                }}
                className="h-6 w-6 rounded-sm cursor-pointer"
              >
                {copied ? <Check className="size-3 stroke-[2.5]" /> : <Copy className="size-3 stroke-[2.5]" />}
              </Button>
            </div>
            <code className="text-xs font-mono block p-2 px-3 rounded-md bg-muted/40 break-all w-full">
              {url}
            </code>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function ServerSkeletonCard() {
  return (
    <Card className="border border-border bg-background rounded-lg p-4 space-y-4">
      <div>
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full" />
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-sm" />
        <Skeleton className="h-5 w-16 rounded-sm" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-6 rounded-sm" />
        </div>
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
    </Card>
  )
}
