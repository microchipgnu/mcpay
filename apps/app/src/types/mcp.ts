import { txOperations } from "@/lib/gateway/db/actions";
import { mcpTools, RevenueDetails } from "@/lib/gateway/db/schema";
import { experimental_createMCPClient } from "ai";
import type { MCPToolWithPayments } from '@/lib/gateway/inspect-mcp';
import { getComprehensiveAnalytics } from "@/lib/gateway/analytics";

export type McpServerList = Awaited<ReturnType<ReturnType<typeof txOperations.listMcpServers>>>;
export type McpServerWithRelations = McpServerList[number];
export type McpServerWithActivity = Awaited<ReturnType<ReturnType<typeof txOperations.listMcpServersByActivity>>>[number];
export type McpServerWithStats = Awaited<ReturnType<ReturnType<typeof txOperations.getMcpServerWithStats>>>
export type ToolFromMcpServerWithStats = NonNullable<McpServerWithStats>['tools'][number]

export type ServerRegistrationData = Awaited<ReturnType<ReturnType<typeof txOperations.getServerRegistrationData>>>;
export type ServerCreateData = Awaited<ReturnType<ReturnType<typeof txOperations.createServer>>>;

export type MCPClient = Awaited<ReturnType<typeof experimental_createMCPClient>>
export type MCPToolsCollection = Record<string, unknown>

export type ComprehenstiveAnalytics = Awaited<ReturnType<typeof getComprehensiveAnalytics>>

// Analytics result types
export interface DailyServerAnalytics {
  serverId: string;
  date: string;
  totalRequests: number;
  uniqueUsers: number;
  errorCount: number;
  avgResponseTime: number;
  revenueDetails: RevenueDetails;
  totalPayments: number;
}

export interface ServerSummaryAnalytics {
  serverId: string;
  serverName: string;
  totalRequests: number;
  totalTools: number;
  monetizedTools: number;
  uniqueUsers: number;
  totalPayments: number;
  errorCount: number;
  avgResponseTime: number;
  successRate: number;
  revenueDetails: RevenueDetails;
  recentRequests: number;
  recentPayments: number;
  lastActivity: string;
}

export interface GlobalAnalytics {
  totalServers: number;
  activeServers: number;
  totalTools: number;
  monetizedTools: number;
  totalRequests: number;
  successfulRequests: number;
  uniqueUsers: number;
  totalPayments: number;
  avgResponseTime: number;
  revenueDetails: RevenueDetails;
  totalProofs: number;
  consistentProofs: number;
}

export interface ToolAnalytics {
  toolId: string;
  toolName: string;
  serverId: string;
  isMonetized: boolean;
  totalRequests: number;
  successfulRequests: number;
  uniqueUsers: number;
  avgResponseTime: number;
  totalPayments: number;
  revenueDetails: RevenueDetails;
  lastUsed: string;
  recentRequests: number;
}

export interface DailyActivity {
  date: string;
  totalRequests: number;
  uniqueUsers: number;
  totalPayments: number;
  avgResponseTime: number;
  revenueDetails: RevenueDetails;
}


// Enhanced metadata type for server registration
export interface ServerRegistrationMetadata {
  timestamp: string;
  toolsCount: number;
  monetizedToolsCount: number;
  registeredFromUI: boolean;
  [key: string]: unknown; // Allow additional metadata fields
}

// API Key interface
export interface ApiKey {
  id: string;
  name: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  isActive: boolean;
}


export interface InputProperty {
  type: string
  description?: string
  enum?: string[]
  default?: unknown
  minimum?: number
  maximum?: number
  // Enhanced JSON Schema support for objects
  properties?: Record<string, InputProperty>
  required?: string[]
  additionalProperties?: boolean | InputProperty
  // Array support
  items?: InputProperty
  minItems?: number
  maxItems?: number
  // String validation
  pattern?: string
  minLength?: number
  maxLength?: string
  // Number validation
  multipleOf?: number
  // Union types
  oneOf?: InputProperty[]
  anyOf?: InputProperty[]
  allOf?: InputProperty[]
  // Conditional schemas
  if?: InputProperty
  then?: InputProperty
  else?: InputProperty
  // Schema metadata
  title?: string
  examples?: unknown[]
  const?: unknown
}

export interface ToolInputSchema {
  type?: string
  properties?: Record<string, InputProperty>
  required?: string[]
}

export interface ToolExecutionModalProps {
  isOpen: boolean
  onClose: () => void
  tool: ToolFromMcpServerWithStats | MCPToolWithPayments | null
  serverId?: string,
  url?: string,
}
export interface MCPToolInputSchema {
  jsonSchema?: {
    properties?: Record<string, InputProperty>
    required?: string[]
  }
}

export interface MCPToolFromClient {
  name?: string
  description?: string
  parameters?: MCPToolInputSchema
  inputSchema?: MCPToolInputSchema
  execute?: (params: Record<string, unknown>, options: { toolCallId: string; messages: unknown[] }) => Promise<unknown>
}


export type MCPTool = typeof mcpTools.$inferSelect;



export interface RegisterMCPTool {
  name: string
  description: string
  inputSchema: {
    jsonSchema: {
      type: string
      properties: Record<string, unknown>
      required?: string[]
      additionalProperties?: boolean
    }
  }
  price?: string
}