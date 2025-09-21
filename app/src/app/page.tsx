"use client"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/providers/theme-context"
import { urlUtils } from "@/lib/client/utils"
import { ArrowRight, Rocket, TrendingUp } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import Hero from "@/components/custom-ui/hero"
import ServersGrid from "@/components/custom-ui/servers-grid"
import ContentCards from "@/components/custom-ui/content-cards"
import Footer from "@/components/custom-ui/footer"
import MinimalExplorer from "@/components/custom-ui/minimal-explorer"
import BuiltWithSection from "@/components/custom-ui/built-with-section"
import FAQSection from "@/components/custom-ui/faq-section"

interface APITool {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  isMonetized: boolean;
  payment: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface MCPTool {
  name: string
  description?: string
  inputSchema: {
    type: string
    properties: Record<string, MCPInputPropertySchema>
  }
  annotations?: {
    title?: string
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
}

interface MCPInputPropertySchema {
  type: string;
  description?: string;
  [key: string]: unknown;
}

export interface MCPServer {
  id: string
  name: string
  description: string
  url: string
  category: string
  tools: MCPTool[]
  icon: React.ReactNode
  verified?: boolean
}

interface APIServer {
  id: string;
  serverId: string;
  name: string;
  receiverAddress: string;
  description: string;
  metadata?: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  tools: APITool[];
}

const transformServerData = (apiServer: APIServer): MCPServer => ({
  id: apiServer.serverId,
  name: apiServer.name || 'Unknown Server',
  description: apiServer.description || 'No description available',
  url: apiServer.receiverAddress,
  category: (apiServer.metadata as Record<string, unknown>)?.category as string || 'General',
  icon: <TrendingUp className="h-6 w-6" />,
  verified: apiServer.status === 'active',
  tools: apiServer.tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: (tool.inputSchema as Record<string, unknown>)?.type as string || "object",
      properties: (tool.inputSchema as Record<string, unknown>)?.properties as Record<string, MCPInputPropertySchema> || {}
    },
    annotations: {
      title: tool.name,
      readOnlyHint: !tool.isMonetized,
      destructiveHint: false,
    },
  })),
});

export default function MCPBrowser() {
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { isDark } = useTheme()

  const getFriendlyErrorMessage = (error: string) => {
    if (error.includes('404')) {
      return {
        title: "Welcome to MCPay!",
        message: "We're setting up the server directory. Be the first to register your MCP server and start earning!",
        actionText: "Register your server",
        actionHref: "/register",
        showRetry: false
      }
    }
    if (error.includes('500') || error.includes('502') || error.includes('503')) {
      return {
        title: "Server maintenance",
        message: "We're performing some quick maintenance. Please try again in a few moments.",
        actionText: "Try again",
        actionHref: null,
        showRetry: true
      }
    }
    if (error.includes('Network') || error.includes('fetch')) {
      return {
        title: "Connection issue",
        message: "Please check your internet connection and try again.",
        actionText: "Try again",
        actionHref: null,
        showRetry: true
      }
    }
    return {
      title: "Something went wrong",
      message: "We're working to fix this issue. In the meantime, you can register your MCP server.",
      actionText: "Register your server",
      actionHref: "/register",
      showRetry: true
    }
  }

  useEffect(() => {
    const fetchServers = async () => {
      try {
        setLoading(true)
        setError(null)

        const serversResponse = await fetch(urlUtils.getApiUrl('/servers?limit=6&type=trending'))
        if (!serversResponse.ok) {
          throw new Error(`Failed to fetch servers: ${serversResponse.status}`)
        }

        const servers: APIServer[] = await serversResponse.json()
        setMcpServers(servers.map(transformServerData))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch servers')
      } finally {
        setLoading(false)
      }
    }
    fetchServers()
  }, [])

  if (error) {
    const errorInfo = getFriendlyErrorMessage(error)
    return (
      <div className="min-h-screen bg-background">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-16 relative">
            <div className="mb-[100px]"></div>
            <h1 className={`text-5xl font-extrabold tracking-tight mb-6 animate-fade-in-up ${isDark ? "text-white" : "text-gray-900"}`}>
              {errorInfo.title}
            </h1>
            <p className={`text-lg max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-300 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {errorInfo.message}
            </p>
            <div className="flex items-center justify-center gap-6 mt-8 animate-fade-in-up animation-delay-500">
              {errorInfo.actionHref && (
                <Link href={errorInfo.actionHref}>
                  <Button size="lg" className="bg-[#0052FF] hover:bg-[#0052FF]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                    <Rocket className="h-5 w-5 mr-2" />
                    {errorInfo.actionText}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
              {errorInfo.showRetry && (
                <Button
                  onClick={() => window.location.reload()}
                  size="lg"
                  variant="outline"
                  className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  {errorInfo.actionHref ? "Try Again" : errorInfo.actionText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <section className="mb-16 md:mb-40">
          <Hero />
        </section>

        <section className="mb-40">
          <MinimalExplorer />
        </section>

        <section className="mb-40">
          <div className="max-w-6xl px-4 md:px-6 mx-auto">
            <h2 className="text-3xl font-semibold font-host mb-10">Featured Servers</h2>
          </div>
          <ServersGrid servers={mcpServers} loading={loading} />
          <div className="text-center mt-10">
            <div className="inline-flex gap-4">
              <Link href="/servers">
                <Button variant="ghostCustom" className="min-w-[10rem]">Browse Servers</Button>
              </Link>
              <Link href="/explorer">
                <Button variant="ghostCustomSecondary" className="min-w-[10rem]">Explorer</Button>
              </Link>
            </div>
          </div>
        </section>


        <section className="mb-40">
          <div className="max-w-6xl px-4 md:px-6 mx-auto">
            <h2 className="text-3xl font-semibold font-host mb-10">How it works</h2>
          </div>
          <ContentCards />
        </section>

        <section className="mb-40">
          <BuiltWithSection />
        </section>

        <section className="mb-40">
          <FAQSection />
        </section>
      </div>
      <Footer />
    </div>
  )
}
