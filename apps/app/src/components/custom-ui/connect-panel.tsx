"use client"

import { useTheme } from "@/components/providers/theme-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, ExternalLink, CheckCircle2, Code2, Settings } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

type ConnectPanelProps = {
  url: string
  originRaw?: string
  className?: string
  stickyTop?: string // e.g., 'top-4' for sticky desktop card
}

const CLIENTS = [
  { name: "ChatGPT", status: "popular", icon: "🤖" },
  { name: "Claude Desktop", status: "popular", icon: "🧠" },
  { name: "Cursor", status: "popular", icon: "⚡" },
  { name: "Poke", status: "beta", icon: "🔗" },
  { name: "Claude Code", status: "beta", icon: "💻" },
  { name: "Codex", status: "beta", icon: "📝" },
  { name: "Raycast", status: "beta", icon: "🚀" },
]

export function ConnectPanel({ url, originRaw, className, stickyTop = "top-4" }: ConnectPanelProps) {
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const effectiveUrl = String(url || originRaw || "")

  const handleCopy = async () => {
    if (!effectiveUrl) return
    try {
      await navigator.clipboard.writeText(effectiveUrl)
      setCopied(true)
      toast.success("Connection URL copied!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  const filteredClients = CLIENTS.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={className}>
      {/* Desktop sticky card with tabs */}
      <div className={`hidden lg:block sticky ${stickyTop}`}>
        <Card className="border bg-background rounded-md p-0 gap-0">
          <CardHeader className="px-6 py-6">
            <div>
              <CardTitle className="text-lg font-semibold font-host">Quick Connect</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Connect your AI client in seconds</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-6 py-6 space-y-6">
            {/* URL copy */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Connection URL</p>
                <div className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:hover:bg-teal-800/70 transition-all duration-300">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="relative group">
                <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/50 border-border group-hover:border-border transition-all duration-300">
                  <div className="flex-1 overflow-x-auto scrollbar-hide">
                    <code className="text-xs font-mono whitespace-nowrap text-muted-foreground">{effectiveUrl}</code>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    className={`group h-7 w-7 rounded-sm transition-all duration-300 ${copied ? "text-teal-600" : "text-muted-foreground/80 group-hover:text-foreground"}`}
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {copied && (
                  <div className="absolute -top-8 right-0 bg-teal-600 text-white text-xs px-2 py-1 rounded-md animate-in fade-in-0 zoom-in-95">
                    Copied!
                  </div>
                )}
              </div>
              {originRaw && (
                <div className="p-3 rounded-md border bg-muted/30 border-border">
                  <p className="text-xs text-muted-foreground">
                    <Settings className="h-3 w-3 inline mr-1" />
                    Need API keys? {" "}
                    <a className="text-foreground hover:text-teal-600 hover:underline hover:decoration-dotted underline-offset-2 transition-all duration-300" href={originRaw} target="_blank" rel="noreferrer">
                      Use direct connection
                    </a>
                  </p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="auto" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-muted border-border">
                <TabsTrigger value="auto" className="text-xs">Auto</TabsTrigger>
                <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
                <TabsTrigger value="ts" className="text-xs">TypeScript</TabsTrigger>
                <TabsTrigger value="py" className="text-xs">Python</TabsTrigger>
              </TabsList>

              <TabsContent value="auto" className="mt-4">
                <div className="space-y-4">
                  <div className="relative">
                    <Input 
                      placeholder="Search AI clients..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 bg-background border-border text-foreground placeholder:text-muted-foreground" 
                    />
                    <Code2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="max-h-72 overflow-auto rounded-md border border-border bg-background">
                    <div className="p-2">
                      {filteredClients.map((client) => (
                        <div key={client.name} className="group flex items-center justify-between p-3 rounded-md hover:bg-muted/40 transition-all duration-300">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{client.icon}</span>
                            <div>
                              <span className="text-sm font-medium text-foreground">{client.name}</span>
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded font-mono border ${
                                client.status === "popular" 
                                  ? "text-teal-700 bg-teal-500/10 border-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:border-teal-800/50" 
                                  : "text-muted-foreground bg-muted border-border"
                              }`}>
                                {client.status}
                              </span>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="text-xs opacity-0 group-hover:opacity-100 transition-all duration-300 h-7 w-7 rounded-sm">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {filteredClients.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No clients found matching &quot;{searchQuery}&quot;
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="json" className="mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Configuration</p>
                    <Button size="sm" variant="ghost" onClick={() => {
                      const config = `{
  "mcp": {
    "servers": [
      "${effectiveUrl}"
    ]
  }
}`
                      navigator.clipboard.writeText(config)
                      toast.success("Configuration copied!")
                    }} className="h-7 w-7 rounded-sm">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="rounded-md border border-border bg-muted/50">
                    <pre className="text-xs leading-relaxed p-4 overflow-x-auto text-muted-foreground font-mono"><code>{`{
  "mcp": {
    "servers": [
      "${effectiveUrl}"
    ]
  }
}`}</code></pre>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ts" className="mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">TypeScript SDK</p>
                    <Button size="sm" variant="ghost" onClick={() => {
                      const code = `import { Client } from '@modelcontextprotocol/sdk/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';

const client = new Client({ name: 'app', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL('${effectiveUrl}')));
const tools = await client.listTools();`
                      navigator.clipboard.writeText(code)
                      toast.success("Code copied!")
                    }} className="h-7 w-7 rounded-sm">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="rounded-md border border-border bg-muted/50">
                    <pre className="text-xs leading-relaxed p-4 overflow-x-auto text-muted-foreground font-mono"><code>{`import { Client } from '@modelcontextprotocol/sdk/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';

const client = new Client({ name: 'app', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL('${effectiveUrl}')));
const tools = await client.listTools();`}</code></pre>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="py" className="mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Python Client</p>
                    <Button size="sm" variant="ghost" onClick={() => {
                      const code = `import requests

url = '${effectiveUrl}'
print('Connect your MCP Python client to:', url)`
                      navigator.clipboard.writeText(code)
                      toast.success("Code copied!")
                    }} className="h-7 w-7 rounded-sm">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="rounded-md border border-border bg-muted/50">
                    <pre className="text-xs leading-relaxed p-4 overflow-x-auto text-muted-foreground font-mono"><code>{`import requests

url = '${effectiveUrl}'
print('Connect your MCP Python client to:', url)`}</code></pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Mobile card with same content */}
      <div className="lg:hidden">
        <Card className="border bg-background rounded-md p-0 gap-0">
          <CardHeader className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold font-host">Quick Connect</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">Connect your AI client in seconds</CardDescription>
              </div>
              <div className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:hover:bg-teal-800/70 transition-all duration-300">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 py-6 space-y-6">
                {/* URL copy */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Connection URL</p>
                  <div className="relative group">
                    <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/50 border-border group-hover:border-border transition-all duration-300">
                      <div className="flex-1 overflow-x-auto scrollbar-hide">
                        <code className="text-xs font-mono whitespace-nowrap text-muted-foreground">{effectiveUrl}</code>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopy}
                        className={`group h-7 w-7 rounded-sm transition-all duration-300 ${copied ? "text-teal-600" : "text-muted-foreground/80 group-hover:text-foreground"}`}
                      >
                        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    {copied && (
                      <div className="absolute -top-8 right-0 bg-teal-600 text-white text-xs px-2 py-1 rounded-md animate-in fade-in-0 zoom-in-95">
                        Copied!
                      </div>
                    )}
                  </div>
                  {originRaw && (
                    <div className="p-3 rounded-md border bg-muted/30 border-border">
                      <p className="text-xs text-muted-foreground">
                        <Settings className="h-3 w-3 inline mr-1" />
                        Need API keys? {" "}
                        <a className="text-foreground hover:text-teal-600 hover:underline hover:decoration-dotted underline-offset-2 transition-all duration-300" href={originRaw} target="_blank" rel="noreferrer">
                          Use direct connection
                        </a>
                      </p>
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <Tabs defaultValue="auto">
                  <TabsList className="grid w-full grid-cols-4 bg-muted border-border">
                    <TabsTrigger value="auto" className="text-xs">Auto</TabsTrigger>
                    <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
                    <TabsTrigger value="ts" className="text-xs">TS</TabsTrigger>
                    <TabsTrigger value="py" className="text-xs">Py</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="auto" className="mt-4">
                    <div className="space-y-4">
                      <div className="relative">
                        <Input 
                          placeholder="Search AI clients..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 bg-background border-border text-foreground placeholder:text-muted-foreground" 
                        />
                        <Code2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="max-h-60 overflow-auto rounded-md border border-border bg-background">
                        <div className="p-2">
                          {filteredClients.map((client) => (
                            <div key={client.name} className="group flex items-center justify-between p-3 rounded-md hover:bg-muted/40 transition-all duration-300">
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{client.icon}</span>
                                <div>
                                  <span className="text-sm font-medium text-foreground">{client.name}</span>
                                  <span className={`ml-2 text-xs px-2 py-0.5 rounded font-mono border ${
                                    client.status === "popular" 
                                      ? "text-teal-700 bg-teal-500/10 border-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:border-teal-800/50" 
                                      : "text-muted-foreground bg-muted border-border"
                                  }`}>
                                    {client.status}
                                  </span>
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" className="text-xs opacity-0 group-hover:opacity-100 transition-all duration-300 h-7 w-7 rounded-sm">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {filteredClients.length === 0 && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No clients found matching &quot;{searchQuery}&quot;
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="json" className="mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">Configuration</p>
                        <Button size="sm" variant="ghost" onClick={() => {
                          const config = `{"mcp":{"servers":["${effectiveUrl}"]}}`
                          navigator.clipboard.writeText(config)
                          toast.success("Configuration copied!")
                        }} className="h-7 w-7 rounded-sm">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="rounded-md border border-border bg-muted/50">
                        <pre className="text-xs leading-relaxed p-3 overflow-x-auto text-muted-foreground font-mono"><code>{`{"mcp":{"servers":["${effectiveUrl}"]}}`}</code></pre>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="ts" className="mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">TypeScript SDK</p>
                        <Button size="sm" variant="ghost" onClick={() => {
                          const code = `import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp'
await new Client({ name: 'app', version: '1.0.0' })
  .connect(new StreamableHTTPClientTransport(new URL('${effectiveUrl}')))`
                          navigator.clipboard.writeText(code)
                          toast.success("Code copied!")
                        }} className="h-7 w-7 rounded-sm">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="rounded-md border border-border bg-muted/50">
                        <pre className="text-xs leading-relaxed p-3 overflow-x-auto text-muted-foreground font-mono"><code>{`import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp'
await new Client({ name: 'app', version: '1.0.0' })
  .connect(new StreamableHTTPClientTransport(new URL('${effectiveUrl}')))`}</code></pre>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="py" className="mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">Python Client</p>
                        <Button size="sm" variant="ghost" onClick={() => {
                          const code = `url='${effectiveUrl}'
print('Connect your MCP Python client to:', url)`
                          navigator.clipboard.writeText(code)
                          toast.success("Code copied!")
                        }} className="h-7 w-7 rounded-sm">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="rounded-md border border-border bg-muted/50">
                        <pre className="text-xs leading-relaxed p-3 overflow-x-auto text-muted-foreground font-mono"><code>{`url='${effectiveUrl}'
print('Connect your MCP Python client to:', url)`}</code></pre>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ConnectPanel


