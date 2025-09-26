"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiCall } from "@/lib/client/utils"
import { ComprehenstiveAnalytics } from "@/types/mcp"
import { easeOut } from "motion"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react"
import { useEffect, useMemo, useState } from "react"

export default function HeroStats() { 
  const [stats, setStats] = useState<ComprehenstiveAnalytics | null>(null)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    let mounted = true
    const fetchAnalytics = async () => {
      try {
        const analytics = await apiCall<ComprehenstiveAnalytics>("/analytics/usage")
        if (mounted) setStats(analytics)
      } catch {
        if (mounted) setStats(null)
      }
    }
    fetchAnalytics()
    return () => {
      mounted = false
    }
  }, [])

  // Same motion + timings as hero secondary objects
  const fadeUp: Variants = useMemo(
    () => ({
      hidden: { opacity: 0, y: prefersReduced ? 0 : 8 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: prefersReduced ? 0 : 0.4, ease: easeOut },
      },
    }),
    [prefersReduced]
  )

  const container: Variants = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: prefersReduced ? 0 : 0.06,
        },
      },
    }),
    [prefersReduced]
  )

  const isLoading = stats === null

  const Stat = ({
    label,
    value,
    loading,
  }: {
    label: string
    value: string | number | null
    loading?: boolean
  }) => (
    <motion.div variants={fadeUp} layout>
      <Card className="border bg-background rounded-md p-0 gap-0" >
        <CardContent className="px-6 py-6">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            {label}
          </div>

          {/* Skeleton first, then value with a smooth crossfade/blur */}
          <AnimatePresence initial={false} mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0, y: prefersReduced ? 0 : 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: prefersReduced ? 0 : -4 }}
                transition={{ duration: prefersReduced ? 0 : 0.2, ease: easeOut }}
                layout
              >
                <Skeleton className="h-7 w-16" />
              </motion.div>
            ) : (
              <motion.div
                key="value"
                initial={{
                  opacity: 0,
                  y: prefersReduced ? 0 : 4,
                  filter: "blur(6px)",
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                }}
                exit={{
                  opacity: 0,
                  y: prefersReduced ? 0 : -4,
                  filter: "blur(6px)",
                }}
                transition={{ duration: prefersReduced ? 0 : 0.25, ease: easeOut }}
                layout
              >
                <div className="text-3xl font-semibold font-mono tracking-tight">
                  {value ?? "—"}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-6xl mx-auto px-4 md:px-6"
      variants={container}
      initial="hidden"
      animate="visible" // animate immediately on mount
    >
      <Stat label="Live Servers" value={stats?.activeServers ?? 0} loading={isLoading} />
      <Stat label="Tools" value={stats?.totalTools ?? 0} loading={isLoading} />
      <Stat label="Transactions" value={stats?.totalRequests ?? 0} loading={isLoading} />
    </motion.div>
  )
}
