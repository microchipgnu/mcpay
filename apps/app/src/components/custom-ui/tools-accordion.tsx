"use client"

import { useMemo, useState } from "react"
import { useTheme } from "@/components/providers/theme-context"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type ToolListItem = {
  id: string
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  pricing?: Array<{ label?: string; amount?: number; currency?: string; active?: boolean }>
  isMonetized?: boolean
}

type ToolsAccordionProps = {
  tools: ToolListItem[]
  onTry: (tool: ToolListItem) => void
}

export function ToolsAccordion({ tools, onTry }: ToolsAccordionProps) {
  const { isDark } = useTheme()
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tools
    return tools.filter(t =>
      t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q)
    )
  }, [query, tools])

  return (
    <div>
      <div className="mb-3">
        <Input
          placeholder="Search tools"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={isDark ? "bg-gray-800 border-gray-700" : ""}
        />
      </div>
      <Accordion type="single" collapsible>
        {filtered.map((t) => (
          <AccordionItem key={t.id} value={t.id}>
            <AccordionTrigger className="text-left">
              <div className="w-full flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{t.name}</div>
                  {!!t.description && (
                    <div className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{t.description}</div>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {t.isMonetized && <Badge variant="outline" className="text-xs">Paid</Badge>}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className={`rounded-md border p-3 ${isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50"}`}>
                <pre className="text-[11px] leading-snug overflow-x-auto"><code>{JSON.stringify(t.inputSchema || {}, null, 2)}</code></pre>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                  {Array.isArray(t.pricing) && t.pricing.length > 0 && (
                    <span>
                      Pricing: {t.pricing.filter(p => p.active !== false).map((p, i) => `${p.label || "tier"}${p.amount ? ` - ${p.amount} ${p.currency || "USD"}` : ""}`).join(", ")}
                    </span>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => onTry(t)} className="text-xs">Try</Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
        {filtered.length === 0 && (
          <div className={`text-sm px-3 py-6 text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}>No tools found</div>
        )}
      </Accordion>
    </div>
  )
}

export default ToolsAccordion


