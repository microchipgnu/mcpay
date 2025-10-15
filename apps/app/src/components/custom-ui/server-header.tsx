"use client"

import { Button } from "@/components/ui/button"

type ServerHeaderProps = {
  name: string
  description?: string
  onExplore?: () => void
}

export function ServerHeader({ name, description, onExplore }: ServerHeaderProps) {
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
    </div>
  )
}

export default ServerHeader


