"use client"

import { useTheme } from "@/components/providers/theme-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type ServerHeaderProps = {
  name: string
  description?: string
  totalTools?: number
  isRemote?: boolean
  hasRepo?: boolean
  onExplore?: () => void
}

export function ServerHeader({ name, description, totalTools = 0, isRemote = true, hasRepo = false, onExplore }: ServerHeaderProps) {
  const { isDark } = useTheme()

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold font-host mb-1">{name}</h1>
          {!!description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onExplore}>
            Explore capabilities
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isRemote && (
          <Badge variant="secondary" className="text-xs">Remote</Badge>
        )}
        <Badge variant="outline" className="text-xs">Quick Setup</Badge>
        <Badge variant="outline" className="text-xs">{totalTools} tools</Badge>
        {hasRepo && (
          <Badge variant="outline" className="text-xs">Open Source</Badge>
        )}
      </div>
    </div>
  )
}

export default ServerHeader


