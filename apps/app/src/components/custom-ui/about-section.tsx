"use client"

import { useState } from "react"
import { useTheme } from "@/components/providers/theme-context"
import { Button } from "@/components/ui/button"

type AboutSectionProps = {
  text?: string
}

export function AboutSection({ text }: AboutSectionProps) {
  const { isDark } = useTheme()
  const [expanded, setExpanded] = useState(false)

  if (!text) return null

  const short = text.length > 240 ? text.slice(0, 240) + "…" : text
  const showToggle = text.length > 240

  return (
    <div className={`rounded-md border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white"}`}>
      <div className="p-4">
        <div className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          {expanded ? text : short}
        </div>
        {showToggle && (
          <div className="mt-2">
            <Button variant="link" className="px-0" onClick={() => setExpanded(v => !v)}>
              {expanded ? "View less" : "View more"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AboutSection


