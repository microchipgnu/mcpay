"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fromBaseUnits } from "@/lib/commons"
import { RevenueDetail } from "@/lib/gateway/db/schema"
import { type DailyServerAnalytics } from "@/types/mcp"
import { BarChart3, DollarSign, TrendingUp, Users } from "lucide-react"
import { useMemo } from "react"
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

interface AnalyticsChartProps {
  dailyAnalytics: DailyServerAnalytics[]
  isDark?: boolean
}

interface ChartDataPoint {
  date: string
  dateFormatted: string
  requests: number
  revenue: number
  users: number
  formattedRevenue: string
}

export function AnalyticsChart({ dailyAnalytics, isDark = false }: AnalyticsChartProps) {
  // Transform daily analytics data for charts
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!dailyAnalytics?.length) return []
    
    return dailyAnalytics
      .slice(0, 30) // Last 30 days
      .reverse() // Show chronological order
      .map((day) => {
        // Calculate total revenue from revenueDetails
        let totalRevenue = 0
        if (day.revenueDetails && Array.isArray(day.revenueDetails)) {
          totalRevenue = day.revenueDetails.reduce((sum, detail) => {
            if (detail && detail.amount_raw && detail.decimals !== undefined) {
              try {
                const humanAmount = parseFloat(fromBaseUnits(detail.amount_raw, detail.decimals))
                return sum + humanAmount
              } catch (error) {
                console.error('Error converting revenue amount:', error)
                return sum
              }
            }
            return sum
          }, 0)
        }

        // Format date for display
        const dateObj = new Date(day.date)
        const dateFormatted = dateObj.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })

        return {
          date: day.date,
          dateFormatted,
          requests: day.totalRequests || 0,
          revenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
          users: day.uniqueUsers || 0,
          formattedRevenue: `$${totalRevenue.toFixed(2)}`
        }
      })
  }, [dailyAnalytics])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!chartData.length) {
      return {
        totalRequests: 0,
        totalRevenue: 0,
        totalUsers: 0,
        avgRequests: 0,
        avgRevenue: 0,
        maxRevenue: 0
      }
    }

    const totalRequests = chartData.reduce((sum, day) => sum + day.requests, 0)
    const totalRevenue = chartData.reduce((sum, day) => sum + day.revenue, 0)
    const totalUsers = chartData.reduce((sum, day) => sum + day.users, 0)
    const maxRevenue = Math.max(...chartData.map(day => day.revenue))

    return {
      totalRequests,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalUsers,
      avgRequests: Math.round(totalRequests / chartData.length),
      avgRevenue: Math.round((totalRevenue / chartData.length) * 100) / 100,
      maxRevenue: Math.round(maxRevenue * 100) / 100
    }
  }, [chartData])

  // Chart configuration for theming
  const chartConfig = {
    requests: {
      label: "Requests",
      color: isDark ? "hsl(217, 91%, 60%)" : "hsl(217, 91%, 50%)", // Blue
    },
    revenue: {
      label: "Revenue",
      color: isDark ? "hsl(142, 76%, 55%)" : "hsl(142, 76%, 45%)", // Green
    },
    users: {
      label: "Users", 
      color: isDark ? "hsl(280, 100%, 70%)" : "hsl(280, 100%, 60%)", // Purple
    }
  }

  if (!chartData.length) {
    return (
      <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Overview
          </CardTitle>
          <CardDescription>Visual representation of your server&apos;s performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`text-center py-12 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No analytics data available yet</p>
            <p className="text-xs mt-1">Charts will appear here once your server receives usage</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Analytics Overview
        </CardTitle>
        <CardDescription>
          Last {chartData.length} days • {summaryStats.totalRequests} total requests • ${summaryStats.totalRevenue} total revenue
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
            <div className={`p-2 rounded-full ${isDark ? "bg-blue-900" : "bg-blue-100"}`}>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Avg Daily Requests</p>
              <p className="font-semibold">{summaryStats.avgRequests}</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
            <div className={`p-2 rounded-full ${isDark ? "bg-green-900" : "bg-green-100"}`}>
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Avg Daily Revenue</p>
              <p className="font-semibold">${summaryStats.avgRevenue}</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
            <div className={`p-2 rounded-full ${isDark ? "bg-purple-900" : "bg-purple-100"}`}>
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Peak Daily Revenue</p>
              <p className="font-semibold">${summaryStats.maxRevenue}</p>
            </div>
          </div>
        </div>

        {/* Chart Tabs */}
        <Tabs defaultValue="combined" className="w-full">
          <TabsList className={`grid w-full grid-cols-4 ${isDark ? "bg-gray-700" : ""}`}>
            <TabsTrigger value="combined">Combined</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          {/* Combined View */}
          <TabsContent value="combined" className="mt-6">
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <LineChart data={chartData} margin={{ left: 20, right: 20, top: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="dateFormatted" 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis 
                  yAxisId="requests"
                  orientation="left"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis 
                  yAxisId="revenue"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                  tickFormatter={(value) => `$${value}`}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      labelFormatter={(label) => `${label}`}
                      formatter={(value, name) => [
                        name === 'revenue' ? `$${Number(value).toFixed(2)}` : Number(value).toLocaleString(),
                        chartConfig[name as keyof typeof chartConfig]?.label || name
                      ]}
                    />
                  } 
                />
                <Line
                  yAxisId="requests"
                  type="monotone"
                  dataKey="requests"
                  stroke="var(--color-requests)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-requests)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-revenue)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ChartContainer>
          </TabsContent>

          {/* Requests Chart */}
          <TabsContent value="requests" className="mt-6">
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <AreaChart data={chartData} margin={{ left: 20, right: 20, top: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="dateFormatted" 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      labelFormatter={(label) => `${label}`}
                      formatter={(value, name) => [
                        Number(value).toLocaleString(),
                        'Requests'
                      ]}
                    />
                  } 
                />
                <Area
                  type="monotone"
                  dataKey="requests"
                  stroke="var(--color-requests)"
                  fill="var(--color-requests)"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </TabsContent>

          {/* Revenue Chart */}
          <TabsContent value="revenue" className="mt-6">
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <BarChart data={chartData} margin={{ left: 20, right: 20, top: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="dateFormatted" 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                  tickFormatter={(value) => `$${value}`}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      labelFormatter={(label) => `${label}`}
                      formatter={(value, name) => [
                        `$${Number(value).toFixed(2)}`,
                        'Revenue'
                      ]}
                    />
                  } 
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </TabsContent>

          {/* Users Chart */}
          <TabsContent value="users" className="mt-6">
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <AreaChart data={chartData} margin={{ left: 20, right: 20, top: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="dateFormatted" 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      labelFormatter={(label) => `${label}`}
                      formatter={(value, name) => [
                        Number(value).toLocaleString(),
                        'Unique Users'
                      ]}
                    />
                  } 
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="var(--color-users)"
                  fill="var(--color-users)"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
