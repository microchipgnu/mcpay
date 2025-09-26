/**
 * Smart Analytics with Redis Caching
 * 
 * This module replaces PostgreSQL views with on-demand analytics computation
 * and intelligent Redis caching for optimal performance.
 * 
 * Features:
 * - Multi-currency revenue aggregation with base units
 * - Smart cache invalidation based on data changes
 * - Configurable TTLs for different analytics types
 * - Graceful fallback when cache fails
 * - Optimized database queries replacing pgViews
 */

import {
  addRevenueToCurrency,
  formatRevenueByCurrency,
  fromBaseUnits
} from '@/lib/commons';
import db from "@/lib/gateway/db";
import { txOperations } from "@/lib/gateway/db/actions";
import {
  type RevenueDetails,
} from "@/lib/gateway/db/schema";
import { getKVConfig } from '@/lib/gateway/env';
import { type RevenueByCurrency } from '@/types/blockchain';
import { type DailyActivity, type DailyServerAnalytics, type GlobalAnalytics, type McpServerWithStats, type ServerSummaryAnalytics, type ToolAnalytics } from "@/types/mcp";
import { createClient } from '@vercel/kv';
import { createHash } from 'crypto';
import { sql } from "drizzle-orm";

// Initialize KV client
const kvConfig = getKVConfig();
const kv = createClient({
  url: kvConfig.restApiUrl,
  token: kvConfig.restApiToken,
});

// Cache configuration with smart TTLs
const CACHE_CONFIG = {
  // Short TTL for frequently changing data
  DAILY_SERVER_ANALYTICS: 300, // 5 minutes
  TOOL_ANALYTICS: 300, // 5 minutes
  DAILY_ACTIVITY: 180, // 3 minutes
  
  // Medium TTL for moderately changing data
  SERVER_SUMMARY_ANALYTICS: 900, // 15 minutes
  
  // Longer TTL for global statistics
  GLOBAL_ANALYTICS: 1800, // 30 minutes
  
  // Comprehensive analytics cache
  COMPREHENSIVE_ANALYTICS: 1200, // 20 minutes
  
  // Detailed server analytics with stats
  SERVER_DETAILED_ANALYTICS: 900, // 15 minutes
  
  // Cache key prefix
  PREFIX: 'analytics:v1:',
} as const;

// Cache key generators
const getCacheKey = (type: string, identifier?: string): string => {
  const base = `${CACHE_CONFIG.PREFIX}${type}`;
  if (identifier) {
    const hash = createHash('md5').update(identifier).digest('hex').slice(0, 8);
    return `${base}:${hash}`;
  }
  return base;
};



// Helper function to process revenue details from views into RevenueByCurrency format
function processRevenueDetails(revenueDetails: RevenueDetails): { revenueByCurrency: RevenueByCurrency; totalRevenue: number } {
  if (!revenueDetails || !Array.isArray(revenueDetails)) {
    return { revenueByCurrency: {}, totalRevenue: 0 };
  }

  let revenueByCurrency: RevenueByCurrency = {};
  let totalRevenue = 0;

  revenueDetails.forEach((detail) => {
    if (detail && detail.currency && detail.decimals !== undefined && detail.amount_raw) {
      // Add to multi-currency tracking
      revenueByCurrency = addRevenueToCurrency(
        revenueByCurrency,
        detail.currency,
        detail.decimals,
        detail.amount_raw
      );

      // Add to simple total for backward compatibility (approximate)
      try {
        const humanAmount = parseFloat(fromBaseUnits(detail.amount_raw, detail.decimals));
        totalRevenue += humanAmount;
      } catch (error) {
        // If conversion fails, add raw amount (not ideal but prevents errors)
        totalRevenue += parseFloat(detail.amount_raw) || 0;
        console.error('Error converting revenue amount:', error);
      }
    }
  });

  return { revenueByCurrency, totalRevenue };
}

// Utility function for cache operations with error handling
async function withCache<T>(
  cacheKey: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    // Try to get from cache first
    const cached = await kv.get<T>(cacheKey);
    if (cached !== null) {
      console.log(`Analytics cache hit: ${cacheKey}`);
      return cached;
    }
  } catch (error) {
    console.warn(`Cache read error for ${cacheKey}:`, error);
  }

  // Cache miss - fetch fresh data
  console.log(`Analytics cache miss: ${cacheKey}`);
  const data = await fetcher();

  // Store in cache with TTL
  try {
    await kv.set(cacheKey, data, { ex: ttl });
    console.log(`Analytics cached: ${cacheKey} (TTL: ${ttl}s)`);
  } catch (error) {
    console.warn(`Cache write error for ${cacheKey}:`, error);
  }

  return data;
}

/**
 * Get daily analytics for a specific server
 * Replaces dailyServerAnalyticsView
 */
const indexDailyServerAnalytics = async (serverId: string): Promise<DailyServerAnalytics[]> => {
  const cacheKey = getCacheKey('daily_server', serverId);
  
  return withCache(cacheKey, CACHE_CONFIG.DAILY_SERVER_ANALYTICS, async () => {
    const results = await db.execute(sql`
      WITH server_dates AS (
        SELECT DISTINCT 
          ${serverId}::uuid as server_id,
          dates.activity_date
        FROM (
          SELECT DISTINCT DATE(tu.timestamp) as activity_date FROM tool_usage tu
          JOIN mcp_tools mt ON tu.tool_id = mt.id  
          WHERE mt.server_id = ${serverId}::uuid
          UNION
          SELECT DISTINCT DATE(p.created_at) as activity_date FROM payments p
          JOIN mcp_tools mt ON p.tool_id = mt.id
          WHERE mt.server_id = ${serverId}::uuid
        ) dates
      )
      SELECT 
        server_dates.server_id,
        server_dates.activity_date as date,
        COUNT(DISTINCT tool_usage.id) as total_requests,
        COUNT(DISTINCT COALESCE(tool_usage.user_id, payments.user_id)) as unique_users,
        COUNT(DISTINCT CASE WHEN tool_usage.response_status NOT IN ('success', '200') THEN tool_usage.id END) as error_count,
        AVG(tool_usage.execution_time_ms) as avg_response_time,
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN payments.status = 'completed' AND payments.amount_raw IS NOT NULL THEN payments.id END) > 0 THEN
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'currency', payments.currency,
                'network', payments.network,
                'decimals', payments.token_decimals,
                'amount_raw', (
                  SELECT SUM(p2.amount_raw::numeric)::text
                  FROM payments p2
                  JOIN mcp_tools t2 ON t2.id = p2.tool_id
                  WHERE t2.server_id = ${serverId}::uuid
                    AND DATE(p2.created_at) = server_dates.activity_date
                    AND p2.status = 'completed'
                    AND p2.currency = payments.currency
                    AND p2.network = payments.network
                    AND p2.token_decimals = payments.token_decimals
                )
              )
            ) FILTER (WHERE payments.status = 'completed' AND payments.amount_raw IS NOT NULL)
          ELSE NULL
        END as revenue_details,
        COUNT(DISTINCT CASE WHEN payments.status = 'completed' THEN payments.id END) as total_payments
      FROM server_dates
      LEFT JOIN mcp_servers ON mcp_servers.id = server_dates.server_id
      LEFT JOIN mcp_tools ON mcp_tools.server_id = mcp_servers.id
      LEFT JOIN tool_usage ON tool_usage.tool_id = mcp_tools.id AND DATE(tool_usage.timestamp) = server_dates.activity_date
      LEFT JOIN payments ON payments.tool_id = mcp_tools.id AND DATE(payments.created_at) = server_dates.activity_date
      GROUP BY server_dates.server_id, server_dates.activity_date
      ORDER BY server_dates.activity_date DESC
    `);

    return results.rows.map((row: Record<string, unknown>) => ({
      serverId: row.server_id as string,
      date: row.date as string,
      totalRequests: Number(row.total_requests || 0),
      uniqueUsers: Number(row.unique_users || 0),
      errorCount: Number(row.error_count || 0),
      avgResponseTime: row.avg_response_time ? Number(row.avg_response_time) : 0,
      revenueDetails: row.revenue_details as RevenueDetails,
      totalPayments: Number(row.total_payments || 0),
    }));
  });
};

/**
 * Get summary analytics for a specific server
 * Replaces serverSummaryAnalyticsView
 */
const indexServerSummaryAnalytics = async (serverId: string): Promise<ServerSummaryAnalytics | null> => {
  const cacheKey = getCacheKey('server_summary', serverId);
  
  return withCache(cacheKey, CACHE_CONFIG.SERVER_SUMMARY_ANALYTICS, async () => {
    const results = await db.execute(sql`
      SELECT 
        mcp_servers.id as server_id,
        mcp_servers.name as server_name,
        COUNT(DISTINCT tool_usage.id) as total_requests,
        COUNT(DISTINCT mcp_tools.id) as total_tools,
        COUNT(DISTINCT CASE WHEN mcp_tools.is_monetized THEN mcp_tools.id END) as monetized_tools,
        COUNT(DISTINCT COALESCE(tool_usage.user_id, payments.user_id)) as unique_users,
        COUNT(DISTINCT CASE WHEN payments.status = 'completed' THEN payments.id END) as total_payments,
        COUNT(DISTINCT CASE WHEN tool_usage.response_status NOT IN ('success', '200') THEN tool_usage.id END) as error_count,
        AVG(tool_usage.execution_time_ms) as avg_response_time,
        CASE 
          WHEN COUNT(DISTINCT tool_usage.id) > 0 THEN
            (COUNT(DISTINCT CASE WHEN tool_usage.response_status IN ('success', '200') THEN tool_usage.id END)::float / COUNT(DISTINCT tool_usage.id)) * 100
          ELSE 0
        END as success_rate,
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN payments.status = 'completed' AND payments.amount_raw IS NOT NULL THEN payments.id END) > 0 THEN
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'currency', payments.currency,
                'network', payments.network,
                'decimals', payments.token_decimals,
                'amount_raw', (
                  SELECT SUM(p2.amount_raw::numeric)::text
                  FROM payments p2
                  JOIN mcp_tools t2 ON t2.id = p2.tool_id
                  WHERE t2.server_id = mcp_servers.id
                    AND p2.status = 'completed'
                    AND p2.currency = payments.currency
                    AND p2.network = payments.network
                    AND p2.token_decimals = payments.token_decimals
                )
              )
            ) FILTER (WHERE payments.status = 'completed' AND payments.amount_raw IS NOT NULL)
          ELSE NULL
        END as revenue_details,
        COUNT(DISTINCT CASE 
          WHEN tool_usage.timestamp > NOW() - INTERVAL '30 days' 
          THEN tool_usage.id 
        END) as recent_requests,
        COUNT(DISTINCT CASE 
          WHEN payments.created_at > NOW() - INTERVAL '30 days' AND payments.status = 'completed' 
          THEN payments.id 
        END) as recent_payments,
        GREATEST(
          MAX(tool_usage.timestamp),
          MAX(payments.created_at)
        ) as last_activity
      FROM mcp_servers
      LEFT JOIN mcp_tools ON mcp_tools.server_id = mcp_servers.id
      LEFT JOIN tool_usage ON tool_usage.tool_id = mcp_tools.id
      LEFT JOIN payments ON payments.tool_id = mcp_tools.id
      WHERE mcp_servers.id = ${serverId}::uuid
      GROUP BY mcp_servers.id, mcp_servers.name
    `);

    const row = results.rows[0] as Record<string, unknown>;
    if (!row) return null;

    return {
      serverId: row.server_id as string,
      serverName: row.server_name as string,
      totalRequests: Number(row.total_requests || 0),
      totalTools: Number(row.total_tools || 0),
      monetizedTools: Number(row.monetized_tools || 0),
      uniqueUsers: Number(row.unique_users || 0),
      totalPayments: Number(row.total_payments || 0),
      errorCount: Number(row.error_count || 0),
      avgResponseTime: row.avg_response_time ? Number(row.avg_response_time) : 0,
      successRate: row.success_rate ? Number(row.success_rate) : 0,
      revenueDetails: row.revenue_details as RevenueDetails,
      recentRequests: Number(row.recent_requests || 0),
      recentPayments: Number(row.recent_payments || 0),
      lastActivity: row.last_activity as string,
    };
  });
};

/**
 * Get global platform analytics
 * Replaces globalAnalyticsView
 */
const indexGlobalAnalytics = async (): Promise<GlobalAnalytics> => {
  const cacheKey = getCacheKey('global');
  
  return withCache(cacheKey, CACHE_CONFIG.GLOBAL_ANALYTICS, async () => {
    const results = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT mcp_servers.id) as total_servers,
        COUNT(DISTINCT CASE WHEN mcp_servers.status = 'active' THEN mcp_servers.id END) as active_servers,
        COUNT(DISTINCT mcp_tools.id) as total_tools,
        COUNT(DISTINCT CASE WHEN mcp_tools.is_monetized THEN mcp_tools.id END) as monetized_tools,
        COUNT(DISTINCT tool_usage.id) as total_requests,
        COUNT(DISTINCT CASE WHEN tool_usage.response_status IN ('success', '200') THEN tool_usage.id END) as successful_requests,
        COUNT(DISTINCT COALESCE(tool_usage.user_id, payments.user_id)) as unique_users,
        COUNT(DISTINCT CASE WHEN payments.status = 'completed' THEN payments.id END) as total_payments,
        AVG(tool_usage.execution_time_ms) as avg_response_time,
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN payments.status = 'completed' AND payments.amount_raw IS NOT NULL THEN payments.id END) > 0 THEN
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'currency', payments.currency,
                'network', payments.network,
                'decimals', payments.token_decimals,
                'amount_raw', (
                  SELECT SUM(p2.amount_raw::numeric)::text
                  FROM payments p2
                  WHERE p2.status = 'completed'
                    AND p2.currency = payments.currency
                    AND p2.network = payments.network
                    AND p2.token_decimals = payments.token_decimals
                )
              )
            ) FILTER (WHERE payments.status = 'completed' AND payments.amount_raw IS NOT NULL)
          ELSE NULL
        END as revenue_details,
        COUNT(DISTINCT proofs.id) as total_proofs,
        COUNT(DISTINCT CASE WHEN proofs.is_consistent THEN proofs.id END) as consistent_proofs
      FROM mcp_servers
      LEFT JOIN mcp_tools ON mcp_tools.server_id = mcp_servers.id
      LEFT JOIN tool_usage ON tool_usage.tool_id = mcp_tools.id
      LEFT JOIN payments ON payments.tool_id = mcp_tools.id
      LEFT JOIN proofs ON proofs.server_id = mcp_servers.id
    `);

    const row = results.rows[0] as Record<string, unknown>;

    return {
      totalServers: Number(row.total_servers || 0),
      activeServers: Number(row.active_servers || 0),
      totalTools: Number(row.total_tools || 0),
      monetizedTools: Number(row.monetized_tools || 0),
      totalRequests: Number(row.total_requests || 0),
      successfulRequests: Number(row.successful_requests || 0),
      uniqueUsers: Number(row.unique_users || 0),
      totalPayments: Number(row.total_payments || 0),
      avgResponseTime: row.avg_response_time ? Number(row.avg_response_time) : 0,
      revenueDetails: row.revenue_details as RevenueDetails,
      totalProofs: Number(row.total_proofs || 0),
      consistentProofs: Number(row.consistent_proofs || 0),
    };
  });
};

/**
 * Get analytics for a specific tool
 * Replaces toolAnalyticsView
 */
const indexToolAnalytics = async (toolId: string): Promise<ToolAnalytics | null> => {
  const cacheKey = getCacheKey('tool', toolId);
  
  return withCache(cacheKey, CACHE_CONFIG.TOOL_ANALYTICS, async () => {
    const results = await db.execute(sql`
      SELECT 
        mcp_tools.id as tool_id,
        mcp_tools.name as tool_name,
        mcp_tools.server_id,
        mcp_tools.is_monetized,
        COUNT(DISTINCT tool_usage.id) as total_requests,
        COUNT(DISTINCT CASE WHEN tool_usage.response_status IN ('success', '200') THEN tool_usage.id END) as successful_requests,
        COUNT(DISTINCT tool_usage.user_id) as unique_users,
        AVG(tool_usage.execution_time_ms) as avg_response_time,
        COUNT(DISTINCT CASE WHEN payments.status = 'completed' THEN payments.id END) as total_payments,
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN payments.status = 'completed' AND payments.amount_raw IS NOT NULL THEN payments.id END) > 0 THEN
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'currency', payments.currency,
                'network', payments.network,
                'decimals', payments.token_decimals,
                'amount_raw', (
                  SELECT SUM(p2.amount_raw::numeric)::text
                  FROM payments p2
                  WHERE p2.tool_id = mcp_tools.id
                    AND p2.status = 'completed'
                    AND p2.currency = payments.currency
                    AND p2.network = payments.network
                    AND p2.token_decimals = payments.token_decimals
                )
              )
            ) FILTER (WHERE payments.status = 'completed' AND payments.amount_raw IS NOT NULL)
          ELSE NULL
        END as revenue_details,
        MAX(tool_usage.timestamp) as last_used,
        COUNT(DISTINCT CASE 
          WHEN tool_usage.timestamp > NOW() - INTERVAL '30 days' 
          THEN tool_usage.id 
        END) as recent_requests
      FROM mcp_tools
      LEFT JOIN tool_usage ON tool_usage.tool_id = mcp_tools.id
      LEFT JOIN payments ON payments.tool_id = mcp_tools.id
      WHERE mcp_tools.id = ${toolId}::uuid
      GROUP BY mcp_tools.id, mcp_tools.name, mcp_tools.server_id, mcp_tools.is_monetized
    `);

    const row = results.rows[0] as Record<string, unknown>;
    if (!row) return null;

    return {
      toolId: row.tool_id as string,
      toolName: row.tool_name as string,
      serverId: row.server_id as string,
      isMonetized: Boolean(row.is_monetized),
      totalRequests: Number(row.total_requests || 0),
      successfulRequests: Number(row.successful_requests || 0),
      uniqueUsers: Number(row.unique_users || 0),
      avgResponseTime: row.avg_response_time ? Number(row.avg_response_time) : 0,
      totalPayments: Number(row.total_payments || 0),
      revenueDetails: row.revenue_details as RevenueDetails,
      lastUsed: row.last_used as string,
      recentRequests: Number(row.recent_requests || 0),
    };
  });
};

/**
 * Get daily activity metrics for platform overview
 * Replaces dailyActivityView
 */
const indexDailyActivity = async (limit: number = 30): Promise<DailyActivity[]> => {
  const cacheKey = getCacheKey('daily_activity', limit.toString());
  
  return withCache(cacheKey, CACHE_CONFIG.DAILY_ACTIVITY, async () => {
    const results = await db.execute(sql`
      WITH dates AS (
        SELECT DISTINCT DATE(tu.timestamp) as activity_date FROM tool_usage tu
        UNION
        SELECT DISTINCT DATE(p.created_at) as activity_date FROM payments p
      )
      SELECT 
        dates.activity_date as date,
        COUNT(DISTINCT tool_usage.id) as total_requests,
        COUNT(DISTINCT COALESCE(tool_usage.user_id, payments.user_id)) as unique_users,
        COUNT(DISTINCT CASE WHEN payments.status = 'completed' THEN payments.id END) as total_payments,
        AVG(tool_usage.execution_time_ms) as avg_response_time,
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN payments.status = 'completed' AND payments.amount_raw IS NOT NULL THEN payments.id END) > 0 THEN
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'currency', payments.currency,
                'network', payments.network,
                'decimals', payments.token_decimals,
                'amount_raw', (
                  SELECT SUM(p2.amount_raw::numeric)::text
                  FROM payments p2
                  WHERE DATE(p2.created_at) = dates.activity_date
                    AND p2.status = 'completed'
                    AND p2.currency = payments.currency
                    AND p2.network = payments.network
                    AND p2.token_decimals = payments.token_decimals
                )
              )
            ) FILTER (WHERE payments.status = 'completed' AND payments.amount_raw IS NOT NULL)
          ELSE NULL
        END as revenue_details
      FROM dates
      LEFT JOIN tool_usage ON DATE(tool_usage.timestamp) = dates.activity_date
      LEFT JOIN payments ON DATE(payments.created_at) = dates.activity_date
      GROUP BY dates.activity_date
      ORDER BY dates.activity_date DESC
      LIMIT ${limit}
    `);

    return results.rows.map((row: Record<string, unknown>) => ({
      date: row.date as string,
      totalRequests: Number(row.total_requests || 0),
      uniqueUsers: Number(row.unique_users || 0),
      totalPayments: Number(row.total_payments || 0),
      avgResponseTime: row.avg_response_time ? Number(row.avg_response_time) : 0,
      revenueDetails: row.revenue_details as RevenueDetails,
    }));
  });
};

/**
 * Get top tools analytics efficiently with caching
 * Used by comprehensive analytics for top performers
 */
const getTopToolsAnalytics = async (limit: number = 10): Promise<ToolAnalytics[]> => {
  const cacheKey = getCacheKey('top_tools', limit.toString());
  
  return withCache(cacheKey, CACHE_CONFIG.TOOL_ANALYTICS, async () => {
    const results = await db.execute(sql`
      SELECT 
        mcp_tools.id as tool_id,
        mcp_tools.name as tool_name,
        mcp_tools.server_id,
        mcp_tools.is_monetized,
        COUNT(DISTINCT tool_usage.id) as total_requests,
        COUNT(DISTINCT CASE WHEN tool_usage.response_status IN ('success', '200') THEN tool_usage.id END) as successful_requests,
        COUNT(DISTINCT tool_usage.user_id) as unique_users,
        AVG(tool_usage.execution_time_ms) as avg_response_time,
        COUNT(DISTINCT CASE WHEN payments.status = 'completed' THEN payments.id END) as total_payments,
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN payments.status = 'completed' AND payments.amount_raw IS NOT NULL THEN payments.id END) > 0 THEN
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'currency', payments.currency,
                'network', payments.network,
                'decimals', payments.token_decimals,
                'amount_raw', (
                  SELECT SUM(p2.amount_raw::numeric)::text
                  FROM payments p2
                  WHERE p2.tool_id = mcp_tools.id
                    AND p2.status = 'completed'
                    AND p2.currency = payments.currency
                    AND p2.network = payments.network
                    AND p2.token_decimals = payments.token_decimals
                )
              )
            ) FILTER (WHERE payments.status = 'completed' AND payments.amount_raw IS NOT NULL)
          ELSE NULL
        END as revenue_details,
        MAX(tool_usage.timestamp) as last_used,
        COUNT(DISTINCT CASE 
          WHEN tool_usage.timestamp > NOW() - INTERVAL '30 days' 
          THEN tool_usage.id 
        END) as recent_requests
      FROM mcp_tools
      LEFT JOIN tool_usage ON tool_usage.tool_id = mcp_tools.id
      LEFT JOIN payments ON payments.tool_id = mcp_tools.id
      GROUP BY mcp_tools.id, mcp_tools.name, mcp_tools.server_id, mcp_tools.is_monetized
      HAVING COUNT(DISTINCT tool_usage.id) > 0
      ORDER BY COUNT(DISTINCT tool_usage.id) DESC
      LIMIT ${limit}
    `);

    return results.rows.map((row: Record<string, unknown>) => ({
      toolId: row.tool_id as string,
      toolName: row.tool_name as string,
      serverId: row.server_id as string,
      isMonetized: Boolean(row.is_monetized),
      totalRequests: Number(row.total_requests || 0),
      successfulRequests: Number(row.successful_requests || 0),
      uniqueUsers: Number(row.unique_users || 0),
      avgResponseTime: row.avg_response_time ? Number(row.avg_response_time) : 0,
      totalPayments: Number(row.total_payments || 0),
      revenueDetails: row.revenue_details as RevenueDetails,
      lastUsed: row.last_used as string,
      recentRequests: Number(row.recent_requests || 0),
    }));
  });
};

/**
 * Get detailed server analytics with comprehensive stats (cached version of getMcpServerWithStats)
 * Combines server info, tools with counts, and comprehensive statistics
 */
const indexServerDetailedAnalytics = async (serverId: string): Promise<McpServerWithStats | null> => {
  const cacheKey = getCacheKey('server_detailed', serverId);
  
  return withCache(cacheKey, CACHE_CONFIG.SERVER_DETAILED_ANALYTICS, async () => {
    // Use the existing transaction-based operation
    return await db.transaction(async (tx) => {
      return await txOperations.getMcpServerWithStats(serverId)(tx);
    });
  });
};

/**
 * Get comprehensive analytics for landing page and dashboard
 * Combines multiple analytics sources with smart caching
 * Replaces getComprehensiveAnalytics from actions.ts
 */
const getComprehensiveAnalytics = async (filters?: {
  startDate?: Date;
  endDate?: Date; 
  toolId?: string;
  userId?: string;
  serverId?: string;
}): Promise<{
  // Core metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  averageExecutionTime: number;
  
  // Financial metrics (multi-currency support)
  totalRevenue: number;
  revenueByCurrency: RevenueByCurrency;
  formattedRevenue: Array<{currency: string; amount: string; network?: string}>;
  totalPayments: number;
  averagePaymentValue: number;
  
  // Platform metrics
  totalServers: number;
  activeServers: number;
  totalTools: number;
  monetizedTools: number;
  uniqueUsers: number;
  
  // Proof/verification metrics
  totalProofs: number;
  consistentProofs: number;
  consistencyRate: number;
  
  // Top performers
  topToolsByRequests: Array<{id: string; name: string; requests: number; revenue: number}>;
  topToolsByRevenue: Array<{id: string; name: string; requests: number; revenue: number}>;
  topServersByActivity: Array<Record<string, unknown>>; // Could be enhanced later
  
  // Time series data for charts
  dailyActivity: Array<{
    date: string;
    requests: number;
    users: number;
    payments: number;
    revenue: number;
    revenueByCurrency: RevenueByCurrency;
    avgResponseTime: number;
  }>;
  
}> => {
  
  return withCache('comprehensive', CACHE_CONFIG.COMPREHENSIVE_ANALYTICS, async () => {
    console.log('Fetching comprehensive analytics with filters:', filters);

    // Fetch all analytics data in parallel for efficiency
    const [globalAnalytics, dailyActivity, topToolsData] = await Promise.all([
      indexGlobalAnalytics(),
      indexDailyActivity(30), // Last 30 days
      // Get top tools by querying directly for better performance
      getTopToolsAnalytics(10)
    ]);

    // Handle empty analytics gracefully
    if (!globalAnalytics) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 0,
        averageExecutionTime: 0,
        totalRevenue: 0,
        revenueByCurrency: {},
        formattedRevenue: [],
        totalPayments: 0,
        averagePaymentValue: 0,
        totalServers: 0,
        activeServers: 0,
        totalTools: 0,
        monetizedTools: 0,
        uniqueUsers: 0,
        totalProofs: 0,
        consistentProofs: 0,
        consistencyRate: 0,
        topToolsByRequests: [],
        topToolsByRevenue: [],
        topServersByActivity: [],
        dailyActivity: [],
      };
    }

    // Process tool analytics for top performers
    const processedTools = topToolsData.map((tool: ToolAnalytics) => {
      const { totalRevenue } = processRevenueDetails(tool.revenueDetails);
      return {
        id: tool.toolId,
        name: tool.toolName,
        requests: tool.totalRequests || 0,
        revenue: totalRevenue,
        rawTool: tool
      };
    });

    const topToolsByRequests = processedTools.slice(0, 10);
    const topToolsByRevenue = [...processedTools]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Calculate derived metrics from global analytics
    const failedRequests = (globalAnalytics.totalRequests || 0) - (globalAnalytics.successfulRequests || 0);
    const successRate = globalAnalytics.totalRequests > 0 
      ? ((globalAnalytics.successfulRequests || 0) / globalAnalytics.totalRequests) * 100 
      : 0;

    const consistencyRate = globalAnalytics.totalProofs > 0 
      ? ((globalAnalytics.consistentProofs || 0) / globalAnalytics.totalProofs) * 100 
      : 0;

    // Process revenue details from the global analytics
    const { revenueByCurrency, totalRevenue } = processRevenueDetails(globalAnalytics.revenueDetails);

    // Process daily activity data
    const processedDailyActivity = dailyActivity.map(day => {
      const { revenueByCurrency: dayRevenueByCurrency, totalRevenue: dayTotalRevenue } = processRevenueDetails(day.revenueDetails);
      return {
        date: day.date,
        requests: day.totalRequests || 0,
        users: day.uniqueUsers || 0,
        payments: day.totalPayments || 0,
        revenue: dayTotalRevenue,
        revenueByCurrency: dayRevenueByCurrency,
        avgResponseTime: Math.round(day.avgResponseTime || 0)
      };
    });

    return {
      // Core metrics
      totalRequests: globalAnalytics.totalRequests || 0,
      successfulRequests: globalAnalytics.successfulRequests || 0,
      failedRequests,
      successRate: Math.round(successRate * 100) / 100,
      averageExecutionTime: Math.round(globalAnalytics.avgResponseTime || 0),
      
      // Financial metrics (multi-currency support restored)
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      revenueByCurrency,
      formattedRevenue: formatRevenueByCurrency(revenueByCurrency),
      totalPayments: globalAnalytics.totalPayments || 0,
      averagePaymentValue: 0, // DEPRECATED: Not meaningful across currencies
      
      // Platform metrics
      totalServers: globalAnalytics.totalServers || 0,
      activeServers: globalAnalytics.activeServers || 0,
      totalTools: globalAnalytics.totalTools || 0,
      monetizedTools: globalAnalytics.monetizedTools || 0,
      uniqueUsers: globalAnalytics.uniqueUsers || 0,
      
      // Proof/verification metrics
      totalProofs: globalAnalytics.totalProofs || 0,
      consistentProofs: globalAnalytics.consistentProofs || 0,
      consistencyRate: Math.round(consistencyRate * 100) / 100,
      
      // Top performers
      topToolsByRequests: topToolsByRequests.map(tool => ({
        id: tool.id,
        name: tool.name,
        requests: tool.requests,
        revenue: tool.revenue
      })),
      topToolsByRevenue: topToolsByRevenue.map(tool => ({
        id: tool.id,
        name: tool.name,
        requests: tool.requests,
        revenue: tool.revenue
      })),
      topServersByActivity: [], // Could be enhanced with server summary analytics
      
      // Time series data for charts
      dailyActivity: processedDailyActivity,
    };
  });
};

// Cache invalidation utilities
const invalidateCache = {
  /**
   * Invalidate server-related analytics when server data changes
   */
  server: async (serverId: string) => {
    const keys = [
      getCacheKey('daily_server', serverId),
      getCacheKey('server_summary', serverId),
      getCacheKey('server_detailed', serverId),
      getCacheKey('global'),
      getCacheKey('daily_activity', '30'), // Default limit
      getCacheKey('comprehensive'), // Add comprehensive analytics to server invalidation
      getCacheKey('top_tools', '10'), // Default limit for top tools
    ];
    
    for (const key of keys) {
      try {
        await kv.del(key);
        console.log(`Invalidated cache: ${key}`);
      } catch (error) {
        console.warn(`Failed to invalidate cache ${key}:`, error);
      }
    }
  },

  /**
   * Invalidate tool-related analytics when tool data changes
   */
  tool: async (toolId: string, serverId?: string) => {
    const keys = [
      getCacheKey('tool', toolId),
      getCacheKey('global'),
      getCacheKey('daily_activity', '30'), // Default limit
      getCacheKey('comprehensive'), // Add comprehensive analytics to tool invalidation
      getCacheKey('top_tools', '10'), // Default limit for top tools
    ];
    
    if (serverId) {
      keys.push(
        getCacheKey('daily_server', serverId),
        getCacheKey('server_summary', serverId),
        getCacheKey('server_detailed', serverId)
      );
    }
    
    for (const key of keys) {
      try {
        await kv.del(key);
        console.log(`Invalidated cache: ${key}`);
      } catch (error) {
        console.warn(`Failed to invalidate cache ${key}:`, error);
      }
    }
  },

  /**
   * Invalidate all analytics cache (use sparingly)
   */
  all: async () => {
    try {
      // Note: Vercel KV doesn't support SCAN, so we track individual deletions
      console.log('Cache invalidation: all - completed (individual key tracking required)');
    } catch (error) {
      console.warn('Failed to invalidate all cache:', error);
    }
  },

  /**
   * Invalidate daily activity when new usage or payments are recorded
   */
  activity: async () => {
    const keys = [
      getCacheKey('global'),
      getCacheKey('daily_activity', '30'), // Default limit
      getCacheKey('comprehensive'), // Add comprehensive analytics to activity invalidation
      getCacheKey('top_tools', '10'), // Default limit for top tools
    ];
    
    for (const key of keys) {
      try {
        await kv.del(key);
        console.log(`Invalidated cache: ${key}`);
      } catch (error) {
        console.warn(`Failed to invalidate cache ${key}:`, error);
      }
    }
  }
};

const getDailyServerAnalytics = async (serverId: string) => {
  return await indexDailyServerAnalytics(serverId);
}

const getServerSummaryAnalytics = async (serverId: string) => {
  return await indexServerSummaryAnalytics(serverId);
}

const getGlobalAnalytics = async () => {
  return await indexGlobalAnalytics();
}

const getToolAnalytics = async (toolId: string) => {
  return await indexToolAnalytics(toolId);
}

const getDailyActivity = async (limit: number = 30) => {
  return await indexDailyActivity(limit);
}

const getServerDetailedAnalytics = async (serverId: string) => {
  return await indexServerDetailedAnalytics(serverId);
}

export {
  getComprehensiveAnalytics, getDailyActivity, getDailyServerAnalytics, getGlobalAnalytics, getServerDetailedAnalytics, getServerSummaryAnalytics, getToolAnalytics, invalidateCache
};

