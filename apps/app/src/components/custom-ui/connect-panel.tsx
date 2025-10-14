"use client"

import { useTheme } from "@/components/providers/theme-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Copy } from "lucide-react"
import { toast } from "sonner"

type ConnectPanelProps = {
  url: string
  originRaw?: string
  className?: string
  stickyTop?: string // e.g., 'top-4' for sticky desktop card
}

const CLIENTS = [
  "ChatGPT",
  "Poke",
  "Claude Desktop",
  "Claude Code",
  "Cursor",
  "Codex",
  "Raycast",
]

export function ConnectPanel({ url, originRaw, className, stickyTop = "top-4" }: ConnectPanelProps) {
  const { isDark } = useTheme()

  const effectiveUrl = String(url || originRaw || "")

  return (
    <div className={className}>
      {/* Desktop sticky card with tabs */}
      <div className={`hidden lg:block sticky ${stickyTop}`}>
        <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
          <CardHeader>
            <CardTitle className="text-base">Connect</CardTitle>
            <CardDescription>Get connection URL and client setup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* URL copy */}
            <div>
              <p className={`text-xs mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Get connection URL</p>
              <div className="flex items-start gap-2">
                <code className={`flex-1 block text-xs p-3 rounded-md font-mono break-all ${isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-800"}`}>{effectiveUrl}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!effectiveUrl) return
                    navigator.clipboard.writeText(effectiveUrl)
                    toast.success("Copied")
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {originRaw && (
                <p className={`mt-2 text-[11px] ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Client doesn&apos;t support OAuth yet or link isn&apos;t working? {" "}
                  <a className="underline" href={originRaw} target="_blank" rel="noreferrer">
                    Get URL with keys instead
                  </a>
                </p>
              )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="auto" className="w-full">
              <TabsList className={`grid w-full grid-cols-4 ${isDark ? "bg-gray-700" : ""}`}>
                <TabsTrigger value="auto">Auto</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
                <TabsTrigger value="ts">TypeScript</TabsTrigger>
                <TabsTrigger value="py">Python</TabsTrigger>
              </TabsList>

              <TabsContent value="auto" className="mt-4">
                <div className="space-y-3">
                  <Input placeholder="Search clients" className={isDark ? "bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400" : ""} />
                  <div className={`max-h-72 overflow-auto rounded-md border ${isDark ? "border-gray-700" : ""}`}>
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {CLIENTS.map((client) => (
                        <li key={client} className={`px-3 py-2 text-sm flex items-center justify-between ${isDark ? "hover:bg-gray-700/60" : "hover:bg-gray-50"}`}>
                          <span>{client}</span>
                          <Button size="sm" variant="outline" className="text-xs">Guide</Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="json" className="mt-4">
                <div className={`rounded-md border ${isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50"}`}>
                  <pre className="text-[11px] leading-snug p-3 overflow-x-auto"><code>{`{
  "mcp": {
    "servers": [
      "${effectiveUrl}"
    ]
  }
}`}</code></pre>
                </div>
              </TabsContent>

              <TabsContent value="ts" className="mt-4">
                <div className={`rounded-md border ${isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50"}`}>
                  <pre className="text-[11px] leading-snug p-3 overflow-x-auto"><code>{`import { Client } from '@modelcontextprotocol/sdk/client';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';

const client = new Client({ name: 'app', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(new URL('${effectiveUrl}')));
const tools = await client.listTools();`}</code></pre>
                </div>
              </TabsContent>

              <TabsContent value="py" className="mt-4">
                <div className={`rounded-md border ${isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50"}`}>
                  <pre className="text-[11px] leading-snug p-3 overflow-x-auto"><code>{`import requests

url = '${effectiveUrl}'
print('Connect your MCP Python client to:', url)`}</code></pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Mobile accordion with same content */}
      <div className="lg:hidden">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="install">
            <AccordionTrigger>
              <span className="text-sm font-medium">Connect</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <p className={`text-xs mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>Get connection URL</p>
                  <div className="flex items-start gap-2">
                    <code className={`flex-1 block text-xs p-3 rounded-md font-mono break-all ${isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-800"}`}>{effectiveUrl}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!effectiveUrl) return
                        navigator.clipboard.writeText(effectiveUrl)
                        toast.success("Copied")
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Tabs defaultValue="auto">
                  <TabsList className={`grid w-full grid-cols-4 ${isDark ? "bg-gray-700" : ""}`}>
                    <TabsTrigger value="auto">Auto</TabsTrigger>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                    <TabsTrigger value="ts">TS</TabsTrigger>
                    <TabsTrigger value="py">Py</TabsTrigger>
                  </TabsList>
                  <TabsContent value="auto" className="mt-3">
                    <Input placeholder="Search clients" className={isDark ? "bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400" : ""} />
                    <div className={`max-h-60 overflow-auto mt-2 rounded-md border ${isDark ? "border-gray-700" : ""}`}>
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {CLIENTS.map((client) => (
                          <li key={client} className={`px-3 py-2 text-sm flex items-center justify-between ${isDark ? "hover:bg-gray-700/60" : "hover:bg-gray-50"}`}>
                            <span>{client}</span>
                            <Button size="sm" variant="outline" className="text-xs">Guide</Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>
                  <TabsContent value="json" className="mt-3">
                    <div className={`rounded-md border ${isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50"}`}>
                      <pre className="text-[11px] leading-snug p-3 overflow-x-auto"><code>{`{"mcp":{"servers":["${effectiveUrl}"]}}`}</code></pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="ts" className="mt-3">
                    <div className={`rounded-md border ${isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50"}`}>
                      <pre className="text-[11px] leading-snug p-3 overflow-x-auto"><code>{`import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp'
await new Client({ name: 'app', version: '1.0.0' })
  .connect(new StreamableHTTPClientTransport(new URL('${effectiveUrl}')))`}</code></pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="py" className="mt-3">
                    <div className={`rounded-md border ${isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50"}`}>
                      <pre className="text-[11px] leading-snug p-3 overflow-x-auto"><code>{`url='${effectiveUrl}'
print('Connect your MCP Python client to:', url)`}</code></pre>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}

export default ConnectPanel


