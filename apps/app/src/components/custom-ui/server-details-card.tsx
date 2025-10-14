"use client"

import { useTheme } from "@/components/providers/theme-context"

type ServerDetails = {
  deploymentRef?: string
  license?: string
  isLocal?: boolean
  publishedAt?: string
  repo?: string
  homepage?: string
}

function DetailRow({ label, value, href }: { label: string; value?: string | boolean; href?: string }) {
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : (value || "-")
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      {href && value ? (
        <a href={href} target="_blank" rel="noreferrer" className="text-xs underline">
          {display}
        </a>
      ) : (
        <div className="text-xs font-mono">{display}</div>
      )}
    </div>
  )
}

export function ServerDetailsCard({ details }: { details: ServerDetails }) {
  const { isDark } = useTheme()

  return (
    <div className={`rounded-md border ${isDark ? "bg-gray-800 border-gray-700" : "bg-background"}`}>
      <div className="px-4 py-3 border-b text-sm font-medium">Details</div>
      <div className="px-4">
        <DetailRow label="Deployed from" value={details.deploymentRef} />
        <DetailRow label="License" value={details.license} />
        <DetailRow label="Local" value={details.isLocal} />
        <DetailRow label="Published" value={details.publishedAt} />
        <DetailRow label="Source Code" value={details.repo ? "Open" : undefined} href={details.repo} />
        <DetailRow label="Homepage" value={details.homepage ? details.homepage : undefined} href={details.homepage} />
      </div>
    </div>
  )
}

export default ServerDetailsCard


