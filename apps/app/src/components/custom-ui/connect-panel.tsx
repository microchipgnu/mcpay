"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, CheckCircle2, Code2, AlertTriangle, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { useState, useCallback, useEffect } from "react"
import { useTheme } from "@/components/providers/theme-context"
import { ApiKeyModal } from "./api-key-modal"
import Prism from 'prismjs'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import '@/styles/prism-theme.css'

// Types
type AuthMode = 'oauth' | 'api_key' | 'private_key'

type ServerInfo = {
  id: string
  displayName: string
  baseUrl: string
  oauthSupported: boolean
}

type ClientDescriptor = {
  id: string
  name: string
  logoUrl?: string
  oneClickUrl?: string
  command?: string
  steps?: { n: number; text: string | React.ReactNode }[]
  tags?: string[]
  supportsOAuth?: boolean
  status?: 'popular' | 'beta'
  icon?: string
  generateDeepLink?: (server: ServerInfo, apiKey?: string) => string
  generateCommand?: (server: ServerInfo, apiKey?: string) => string
}

type Templates = {
  json: (ctx: { baseUrl: string; apiKey?: string; serverId: string }, authMode?: AuthMode, platform?: 'mac' | 'win' | 'wsl') => string
  ts: (ctx: { baseUrl: string; apiKey?: string }, authMode?: AuthMode) => string
  py: (ctx: { baseUrl: string; apiKey?: string }, authMode?: AuthMode) => string
}

type KeyInfo = {
  full?: string
  masked?: string
}

type ConnectState = {
  authMode: AuthMode
  key: KeyInfo | null
  selectedTab: 'auto' | 'json' | 'code'
  selectedClientId?: string
  platform: 'mac' | 'win' | 'wsl'
  copied: { target?: string; at?: number }
  showApiKeyModal: boolean
  jsonAuthMode: AuthMode
  codeLanguage: 'ts' | 'py'
  codeAuthMode: AuthMode
}

type ConnectPanelProps = {
  server: ServerInfo
  initialAuthMode?: AuthMode
  clients?: ClientDescriptor[]
  templates?: Templates
  className?: string
  stickyTop?: string
}

// Utility functions
const buildUrl = (baseUrl: string, authMode: AuthMode, key?: string) => {
  if (authMode === 'api_key' && key) {
    const u = new URL(baseUrl)
    u.searchParams.set('api_key', key)
    return u.toString()
  }
  return baseUrl
}

const maskKey = (key: string) =>
  key.length <= 8 ? '••••' : `${key.slice(0,3)}••••••••${key.slice(-4)}`

const copy = async (text: string) => {
  await navigator.clipboard.writeText(text)
}

// Default templates
const defaultTemplates: Templates = {
  json: ({ baseUrl, apiKey, serverId }, authMode = 'api_key', platform = 'mac') => {
    const getCommand = () => {
      if (platform === 'win') return 'cmd'
      if (platform === 'wsl') return 'wsl'
      return 'npx'
    }
    
    const getArgs = () => {
      if (platform === 'win') {
        return ['/c', 'mcpay', 'connect', '--urls', baseUrl]
      }
      if (platform === 'wsl') {
        return ['mcpay', 'connect', '--urls', baseUrl]
      }
      return ['mcpay', 'connect', '--urls', baseUrl]
    }
    
    const baseArgs = getArgs()
    
    if (authMode === 'oauth') {
      return `{
  "mcpServers": {
    "${serverId}": {
      "url": "${baseUrl}"
    }
  }
}`
    } else if (authMode === 'private_key') {
      const args = [...baseArgs, '--evm', '<PRIVATE_KEY>', '--evm-network', 'base-sepolia']
      return `{
  "mcpServers": {
    "${serverId}": {
      "command": "${getCommand()}",
      "args": ${JSON.stringify(args)}
    }
  }
}`
    } else {
      const args = [...baseArgs, '--api-key', apiKey ?? '<API_KEY>']
      return `{
  "mcpServers": {
    "${serverId}": {
      "command": "${getCommand()}",
      "args": ${JSON.stringify(args)}
    }
  }
}`
    }
  },

  ts: ({ baseUrl, apiKey }, authMode = 'api_key') => {
    if (authMode === 'oauth') {
      return `import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/transport/streamable-http";
import { Client } from "@modelcontextprotocol/sdk/client/index";

const url = new URL("${baseUrl}");
const transport = new StreamableHTTPClientTransport(url.toString());

const client = new Client({ name: "My App", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("Available tools:", tools.map(t => t.name).join(", "));`
    } else if (authMode === 'private_key') {
      return `import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { withX402Client } from 'mcpay/client'
import { createSigner } from 'x402/types'

// Create signer for EVM network
const evmSigner = await createSigner('base-sepolia', process.env.EVM_PRIVATE_KEY!) // dev only; secure in prod
const url = new URL("${baseUrl}")

// Create transport
const transport = new StreamableHTTPClientTransport(url)

// Initialize MCP client
const client = new Client({ name: 'my-mcp-client', version: '1.0.0' }, { capabilities: {} })
await client.connect(transport)

// Wrap client with X402 payment capabilities
const paymentClient = withX402Client(client, {
  wallet: { evm: evmSigner },
  maxPaymentValue: BigInt(0.1 * 10 ** 6) // limit max on‑chain value (base units, e.g. 6‑decimals for USDC)
})

const tools = await paymentClient.listTools()
console.log('Available tools:', tools)`
    } else {
      return `import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/transport/streamable-http";
import { Client } from "@modelcontextprotocol/sdk/client/index";

const url = new URL("${baseUrl}");
${apiKey ? `url.searchParams.set("api_key", "${apiKey}");` : `// url.searchParams.set("api_key", "<API_KEY>");`}
const transport = new StreamableHTTPClientTransport(url.toString());

const client = new Client({ name: "My App", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("Available tools:", tools.map(t => t.name).join(", "));`
    }
  },

  py: ({ baseUrl, apiKey }, authMode = 'api_key') => {
    if (authMode === 'oauth') {
      return `from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

base_url = "${baseUrl}"

async def main():
    async with streamablehttp_client(base_url) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            print("Available tools:", ", ".join([t.name for t in tools.tools]))`
    } else if (authMode === 'private_key') {
      return `from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from urllib.parse import urlencode

base_url = "${baseUrl}"
with open("<PRIVATE_KEY_PATH>", "r") as f:
    private_key = f.read().strip()
params = { "private_key": private_key }
url = f"{base_url}?{urlencode(params)}"

async def main():
    async with streamablehttp_client(url) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            print("Available tools:", ", ".join([t.name for t in tools.tools]))`
    } else {
      return `from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from urllib.parse import urlencode

base_url = "${baseUrl}"
params = ${apiKey ? `{ "api_key": "${apiKey}" }` : `{}`}
url = f"{base_url}?{urlencode(params)}" if params else base_url

async def main():
    async with streamablehttp_client(url) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            print("Available tools:", ", ".join([t.name for t in tools.tools]))`
    }
  }
}

// Client-specific integration functions
const generateCursorDeepLink = (server: ServerInfo) => {
  const config = { 
    url: server.baseUrl
  }
  const encodedConfig = btoa(JSON.stringify(config))
  const serverName = (server.displayName || 'mcp-server').toLowerCase().replace(/[^a-z0-9-]/g, '-')
  
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${serverName}&config=${encodedConfig}`
}

const generateClaudeDesktopCommand = (server: ServerInfo) => {
  return `npx -y @smithery/cli@latest run @upstash/${server.id}`
}

const generateCursorCommand = (server: ServerInfo) => {
  return `npx -y @smithery/cli@latest install @upstash/${server.id}`
}

const generateRaycastDeepLink = (server: ServerInfo, apiKey?: string) => {
  const config = {
    name: server.displayName || server.id,
    type: "stdio",
    command: "npx",
    args: ["mcpay", "connect", "--urls", server.baseUrl]
  }
  
  // Add API key if provided
  if (apiKey) {
    config.args.push("--api-key", apiKey)
  }

  console.log(config)
  
  const encodedConfig = encodeURIComponent(JSON.stringify(config))
  console.log(`raycast://mcp/install?${encodedConfig}`)
  return `raycast://mcp/install?${encodedConfig}`
}

// Default clients
const defaultClients: ClientDescriptor[] = [
  { 
    id: "chatgpt", 
    name: "ChatGPT", 
    steps: [
      { 
        n: 1, 
        text: (
          <>
            Enable Developer Mode in{" "}
            <a 
              href="https://chatgpt.com/#settings/Connectors/Advanced" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700 hover:underline dark:text-teal-400 dark:hover:text-teal-300"
            >
              settings
            </a>
            {" "}if not already enabled
          </>
        )
      },
      { 
        n: 2, 
        text: (
          <>
            Go to{" "}
            <a 
              href="https://chatgpt.com/#settings/Connectors" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700 hover:underline dark:text-teal-400 dark:hover:text-teal-300"
            >
              ChatGPT Settings {'>'} Connectors
            </a>
            {" "}and click Create to add your server URL:
          </>
        )
      },
    ]
  },
  { 
    id: "poke", 
    name: "Poke",
    steps: [
      { 
        n: 1, 
        text: (
          <>
            Go to{" "}
            <a 
              href="https://poke.com/settings/connections/integrations/new" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700 hover:underline dark:text-teal-400 dark:hover:text-teal-300"
            >
              Poke Settings {'>'} Connections {'>'} Integrations
            </a>
            {" "}and add your server URL.
          </>
        )
      },
    ]
  },
  { 
    id: "cursor", 
    name: "Cursor", 
    generateDeepLink: generateCursorDeepLink,
    generateCommand: generateCursorCommand
  },
  { 
    id: "raycast", 
    name: "Raycast",
    generateDeepLink: generateRaycastDeepLink
  },
  { 
    id: "claude-code", 
    name: "Claude Code",
    generateCommand: (server: ServerInfo) => `claude mcp add --transport http ${server.id} "${server.baseUrl}"`
  },
  { 
    id: "claude-desktop", 
    name: "Claude Desktop", 
  },
  { 
    id: "codex", 
    name: "Codex"
  },
]

// Component: CodeBlock
function CodeBlock({
  language,
  children,
  copyText,
  className = "",
  showAuthDropdown = false,
  authMode,
  onAuthModeChange
}: {
  language: string
  children: string
  copyText?: string
  className?: string
  showAuthDropdown?: boolean
  authMode?: AuthMode
  onAuthModeChange?: (mode: AuthMode) => void
}) {
  const [copied, setCopied] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [highlightedCode, setHighlightedCode] = useState(children)
  const { isDark } = useTheme()

  useEffect(() => {
    const highlightCode = () => {
      try {
        const highlighted = Prism.highlight(children, Prism.languages[language] || Prism.languages.text, language)
        setHighlightedCode(highlighted)
      } catch (error) {
        console.warn('Prism highlighting failed:', error)
        setHighlightedCode(children)
      }
    }

    highlightCode()
  }, [children, language])

  const handleCopy = async () => {
    try {
      await copy(copyText ?? children)
      setCopied(true)
      toast.success("Copied!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  const authOptions = [
    { key: 'oauth', label: 'OAuth' },
    { key: 'api_key', label: 'API Key' },
    { key: 'private_key', label: 'Private Key' }
  ]

  return (
    <div className={`relative code-block p-3 ${className}`}>
      <div className="overflow-x-auto" style={{ paddingTop: showAuthDropdown ? '28px' : '0' }}>
        <pre className={`language-${language} whitespace-pre`}>
          <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </pre>
      </div>
      
      {/* Auth Dropdown */}
      {showAuthDropdown && authMode && onAuthModeChange && (
        <div className="absolute top-2 left-2">
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="h-7 px-2 text-xs bg-muted/50 hover:bg-muted border"
              aria-label="Select authentication method"
            >
              {authOptions.find(opt => opt.key === authMode)?.label}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-32 rounded-md border bg-background shadow-lg z-20">
                {authOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => {
                      onAuthModeChange(option.key as AuthMode)
                      setIsDropdownOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                      authMode === option.key ? 'bg-muted font-medium' : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Copy Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleCopy}
        className="absolute top-2 right-2 h-7 w-7 rounded-sm"
        aria-label="Copy code"
        tabIndex={0}
      >
        {copied ? <CheckCircle2 className="h-4 w-4 text-teal-600" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}

// Component: ClientDetails
function ClientDetails({ client, server, apiKey, onApiKeyNeeded }: { 
  client: ClientDescriptor; 
  server: ServerInfo; 
  apiKey?: string;
  onApiKeyNeeded?: () => void;
}) {
  const { isDark } = useTheme()
  
  // Generate dynamic URLs and commands
  const deepLink = client.generateDeepLink?.(server, apiKey)
  const command = client.generateCommand?.(server, apiKey) || client.command
  
  if (deepLink) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Connect this server to {client.name} with one click.
        </div>
        <Button 
          className="w-full"
          onClick={async () => {
            if (!apiKey && client.id === 'raycast') {
              // For Raycast, we need an API key for the deep link to work
              onApiKeyNeeded?.()
              return
            }
            window.open(deepLink, '_blank')
          }}
          aria-label={`One-click install for ${client.name}`}
        >
          One-Click Install
        </Button>
        {!apiKey && client.id === 'raycast' && (
          <div className="text-xs text-amber-300/90 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            API key required for Raycast integration
          </div>
        )}
      </div>
    )
  }

  if (command) {
    return (
      <CodeBlock language="bash" copyText={command}>
        {command}
      </CodeBlock>
    )
  }

  if (client.steps?.length) {
    return (
      <div className="space-y-3">
        <ol className="space-y-3">
          {client.steps.map(step => (
            <li key={step.n} className="text-sm text-foreground">
              <span className="font-medium">{step.n}.</span> {step.text}
            </li>
          ))}
        </ol>
        
        {/* Connection URL Display */}
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Server URL:</div>
          <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/50">
            <div className="flex-1 overflow-x-auto">
              <code className="text-xs font-mono whitespace-nowrap text-muted-foreground">
                {server?.baseUrl || "https://server.smithery.ai/@upstash/context7-mcp/mcp"}
              </code>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await copy(server?.baseUrl || "")
                  toast.success("Server URL copied!")
                } catch {
                  toast.error("Failed to copy")
                }
              }}
              className="h-7 w-7 rounded-sm flex-shrink-0"
              aria-label="Copy server URL"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="text-sm text-muted-foreground">
      No instructions available yet.
    </div>
  )
}

// Component: ConnectionUrlCard
function ConnectionUrlCard({
  server,
  authMode,
  keyInfo,
  onToggleAuth,
  onCopy,
}: {
  server: ServerInfo
  authMode: AuthMode
  keyInfo: KeyInfo | null
  onToggleAuth: () => void
  onCopy: (value: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const { isDark } = useTheme()
  
  const url = buildUrl(server.baseUrl, authMode, keyInfo?.full)
  const visibleUrl = buildUrl(server.baseUrl, authMode, keyInfo?.full ?? keyInfo?.masked)

  const handleCopy = async () => {
    try {
      await copy(url)
      setCopied(true)
      onCopy(url)
      toast.success("Connection URL copied!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Get connection URL</p>
        <div className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:hover:bg-teal-800/70 transition-all duration-300">
          <CheckCircle2 className="h-4 w-4" />
        </div>
      </div>
      
      <div className="relative group">
        <div className={`flex items-center gap-2 p-3 rounded-md border ${isDark ? "bg-gray-800 border-gray-700" : "bg-background"} group-hover:border-border transition-all duration-300`}>
          <div className="flex-1 overflow-x-auto">
            <code className="text-xs font-mono whitespace-nowrap text-muted-foreground">{visibleUrl}</code>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className={`group h-7 w-7 rounded-sm transition-all duration-300 flex-shrink-0 ${copied ? "text-teal-600" : "text-muted-foreground/80 group-hover:text-foreground"}`}
            aria-label="Copy connection URL"
          >
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        {copied && (
          <div 
            className="absolute -top-8 right-0 bg-teal-600 text-white text-xs px-2 py-1 rounded-md animate-in fade-in-0 zoom-in-95"
            role="status"
            aria-live="polite"
          >
            Copied!
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Client doesn&apos;t support OAuth yet or link isn&apos;t working?{" "}
        <button 
          className="text-foreground hover:text-teal-600 hover:underline hover:decoration-dotted underline-offset-2 transition-all duration-300"
          onClick={onToggleAuth}
        >
          Get URL with keys instead
        </button>
      </div>

      {authMode === 'api_key' && (
        <div className="flex items-center gap-2 text-xs text-amber-300/90">
          <AlertTriangle className="h-3 w-3" />
          Your key is sensitive. Please don&apos;t share it with anyone.
        </div>
      )}
    </div>
  )
}


// Main Component
export function ConnectPanel({ 
  server, 
  initialAuthMode = 'oauth', 
  clients = defaultClients, 
  templates = defaultTemplates,
  className, 
}: ConnectPanelProps) {
  const { isDark } = useTheme()
  const [state, setState] = useState<ConnectState>({
    authMode: initialAuthMode,
    key: null,
    selectedTab: 'auto',
    platform: 'mac',
    copied: {},
    showApiKeyModal: false,
    jsonAuthMode: 'oauth',
    codeLanguage: 'ts',
    codeAuthMode: 'api_key'
  })
  
  const [searchQuery, setSearchQuery] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleToggleAuth = () => {
    if (state.authMode === 'oauth') {
      // Show API key modal to create a new key
      setState(prev => ({
        ...prev,
        showApiKeyModal: true
      }))
    } else {
      // Switch back to OAuth
      setState(prev => ({
        ...prev,
        authMode: 'oauth',
        key: null
      }))
    }
  }

  const handleApiKeyCreated = useCallback((apiKey: string) => {
    setState(prev => ({
      ...prev,
      authMode: 'api_key',
      key: {
        full: apiKey,
        masked: maskKey(apiKey)
      },
      showApiKeyModal: false
    }))
  }, [])

  const handleCopy = (value: string) => {
    setState(prev => ({
      ...prev,
      copied: { target: value, at: Date.now() }
    }))
  }

  const selectedClient = clients.find(c => c.id === state.selectedClientId)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection URL Card */}
      <div className={`rounded-md border ${isDark ? "bg-gray-800 border-gray-700" : "bg-background"}`}>
        <div className="px-4 py-3 border-b text-sm font-medium">
          Connect
        </div>
        <div className="px-4 py-4">
          <ConnectionUrlCard
            server={server}
            authMode={state.authMode}
            keyInfo={state.key}
            onToggleAuth={handleToggleAuth}
            onCopy={handleCopy}
          />
        </div>
      </div>

      {/* Integration Tabs */}
      <div className={`rounded-md border ${isDark ? "bg-gray-800 border-gray-700" : "bg-background"}`}>
        <div className="px-4 py-3 border-b text-sm font-medium">
          Integration
        </div>
        <div className="px-4 py-4">
          <Tabs 
            value={state.selectedTab} 
            onValueChange={(value) => setState(prev => ({ ...prev, selectedTab: value as 'auto' | 'json' | 'code' }))}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="auto" className="text-xs">Auto</TabsTrigger>
              <TabsTrigger value="json" className="text-xs">JSON</TabsTrigger>
              <TabsTrigger value="code" className="text-xs">Code</TabsTrigger>
            </TabsList>

            {/* Auto Tab */}
            <TabsContent value="auto" className="mt-4">
              <div className="space-y-4">
                {/* Client Dropdown */}
                <div className="relative">
                  <div 
                    className="flex items-center justify-between p-3 rounded-md border bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground">
                        {selectedClient?.name || "Select a client"}
                      </span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {/* Client List Dropdown */}
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-72 overflow-hidden rounded-md border bg-background shadow-lg z-10">
                      <div className="sticky top-0 p-2 bg-background border-b">
                        <div className="relative">
                          <Input 
                            placeholder="Search clients..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8"
                            aria-label="Search AI clients" 
                          />
                          <Code2 className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="max-h-56 overflow-auto p-2">
                        {filteredClients.map((client) => (
                        <div 
                          key={client.id} 
                          className={`group flex items-center justify-between p-2 rounded-md hover:bg-muted/40 transition-all duration-300 cursor-pointer ${
                            state.selectedClientId === client.id ? 'bg-muted/60' : ''
                          }`}
                          onClick={() => {
                            setState(prev => ({ ...prev, selectedClientId: client.id }))
                            setIsDropdownOpen(false)
                          }}
                          role="button"
                          tabIndex={0}
                            onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setState(prev => ({ ...prev, selectedClientId: client.id }))
                              setIsDropdownOpen(false)
                            }
                          }}
                          aria-label={`Select ${client.name} client`}
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <span className="text-sm font-medium text-foreground">{client.name}</span>
                            </div>
                          </div>
                          {state.selectedClientId === client.id && (
                            <CheckCircle2 className="h-4 w-4 text-teal-600" />
                          )}
                        </div>
                      ))}
                        {filteredClients.length === 0 && (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No clients found matching &quot;{searchQuery}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Client Instructions */}
                {selectedClient && (
                  <div className="space-y-4">
                    <div className="text-sm font-medium text-foreground">
                      Follow these steps to add this server to {selectedClient.name}:
                    </div>
                    <ClientDetails 
                      client={selectedClient} 
                      server={server} 
                      apiKey={state.key?.full}
                      onApiKeyNeeded={() => setState(prev => ({ ...prev, showApiKeyModal: true }))}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* JSON Tab */}
            <TabsContent value="json" className="mt-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Configuration</p>
                  <div className="flex gap-1 p-1 rounded-lg bg-muted">
                    <button 
                      onClick={() => setState(prev => ({ ...prev, platform: 'mac' }))}
                      className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                        state.platform === 'mac' 
                          ? 'bg-background text-foreground shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Mac/Linux
                    </button>
                    <button 
                      onClick={() => setState(prev => ({ ...prev, platform: 'win' }))}
                      className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                        state.platform === 'win' 
                          ? 'bg-background text-foreground shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Windows
                    </button>
                    <button 
                      onClick={() => setState(prev => ({ ...prev, platform: 'wsl' }))}
                      className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                        state.platform === 'wsl' 
                          ? 'bg-background text-foreground shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      WSL
                    </button>
                  </div>
                </div>
                
                <CodeBlock 
                  language="json" 
                  copyText={templates.json({ 
                    baseUrl: server.baseUrl, 
                    apiKey: state.key?.full, 
                    serverId: server.id 
                  }, state.jsonAuthMode, state.platform)}
                  showAuthDropdown={true}
                  authMode={state.jsonAuthMode}
                  onAuthModeChange={(mode) => setState(prev => ({ ...prev, jsonAuthMode: mode }))}
                >
                  {templates.json({ 
                    baseUrl: server.baseUrl, 
                    apiKey: state.key?.full, 
                    serverId: server.id 
                  }, state.jsonAuthMode, state.platform)}
                </CodeBlock>
              </div>
            </TabsContent>

            {/* Code Tab */}
            <TabsContent value="code" className="mt-4">
              <div className="space-y-4">
                {/* Language Selection */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Language</p>
                  <div className="flex gap-1 p-1 rounded-lg bg-muted">
                    <button 
                      onClick={() => setState(prev => ({ ...prev, codeLanguage: 'ts' }))}
                      className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                        state.codeLanguage === 'ts' 
                          ? 'bg-background text-foreground shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      TypeScript
                    </button>
                    <button 
                      onClick={() => setState(prev => ({ ...prev, codeLanguage: 'py' }))}
                      className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                        state.codeLanguage === 'py' 
                          ? 'bg-background text-foreground shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Python
                    </button>
                  </div>
                </div>

                {/* Code Block */}
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    {state.codeLanguage === 'ts' 
                      ? 'npm install @modelcontextprotocol/sdk mcpay x402'
                      : 'pip install mcp'
                    }
                  </div>
                  
                  {state.codeLanguage === 'ts' ? (
                    <CodeBlock 
                      language="typescript" 
                      copyText={templates.ts({ 
                        baseUrl: server.baseUrl, 
                        apiKey: state.key?.full 
                      }, state.codeAuthMode)}
                      showAuthDropdown={true}
                      authMode={state.codeAuthMode}
                      onAuthModeChange={(mode) => setState(prev => ({ ...prev, codeAuthMode: mode }))}
                    >
                      {templates.ts({ 
                        baseUrl: server.baseUrl, 
                        apiKey: state.key?.full 
                      }, state.codeAuthMode)}
                    </CodeBlock>
                  ) : (
                    <CodeBlock 
                      language="python" 
                      copyText={templates.py({ 
                        baseUrl: server.baseUrl, 
                        apiKey: state.key?.full 
                      }, state.codeAuthMode)}
                      showAuthDropdown={true}
                      authMode={state.codeAuthMode}
                      onAuthModeChange={(mode) => setState(prev => ({ ...prev, codeAuthMode: mode }))}
                    >
                      {templates.py({ 
                        baseUrl: server.baseUrl, 
                        apiKey: state.key?.full 
                      }, state.codeAuthMode)}
                    </CodeBlock>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        open={state.showApiKeyModal}
        onOpenChange={(open) => setState(prev => ({ ...prev, showApiKeyModal: open }))}
        onApiKeyCreated={handleApiKeyCreated}
        serverName={server.displayName}
        baseUrl={server.baseUrl}
      />
    </div>
  )
}

// Demo component with mock data
export function ConnectPanelDemo() {
  const server: ServerInfo = {
    id: "context7-mcp",
    displayName: "Context7 MCP",
    baseUrl: "https://server.smithery.ai/@upstash/context7-mcp/mcp",
    oauthSupported: true,
  }

  return (
    <ConnectPanel
      server={server}
      initialAuthMode="oauth"
      clients={defaultClients}
      templates={defaultTemplates}
    />
  )
}

export default ConnectPanel


