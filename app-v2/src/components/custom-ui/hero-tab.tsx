"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TabItem = {
  id: string;
  label: string;
};

type HeroTabProps = {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** milliseconds per tab; default 5000 */
  durationMs?: number;
  className?: string;
  /** pause auto-advance when user hovers/focuses the tabs (default true) */
  pauseOnHover?: boolean;
};

export function HeroTab({
  items,
  value,
  onChange,
  durationMs = 10000,
  className,
  pauseOnHover = true,
}: HeroTabProps) {
  const selectedIndex = Math.max(
    0,
    items.findIndex((t) => t.id === value)
  );

  // Auto-advance
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = React.useRef(false);

  React.useEffect(() => {
    const start = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (pausedRef.current) return;
        const next = (selectedIndex + 1) % items.length;
        onChange(items[next].id);
      }, durationMs);
    };
    start();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // re-start the interval whenever selection or duration changes
  }, [selectedIndex, items, durationMs, onChange]);

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (selectedIndex + 1) % items.length;
      onChange(items[next].id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (selectedIndex - 1 + items.length) % items.length;
      onChange(items[prev].id);
    }
  };

  // This key forces the progress animation to restart for the selected tab
  const progressKey = `${value}-${durationMs}`;

  return (
    <div
      role="tablist"
      aria-label="Hero sections"
      onKeyDown={handleKey}
      className={cn(
        "flex w-full max-w-md items-center justify-center sm:justify-start mx-auto sm:mx-0",
        className
      )}
      onMouseEnter={() => {
        if (pauseOnHover) pausedRef.current = true;
      }}
      onMouseLeave={() => {
        if (pauseOnHover) pausedRef.current = false;
      }}
      onFocusCapture={() => {
        if (pauseOnHover) pausedRef.current = true;
      }}
      onBlurCapture={() => {
        if (pauseOnHover) pausedRef.current = false;
      }}
    >
      {items.map((item, i) => {
        const selected = i === selectedIndex;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={selected}
            aria-controls={`hero-tabpanel-${item.id}`}
            id={`hero-tab-${item.id}`}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative flex-1 inline-flex items-center justify-center text-center font-mono font-semibold text-[10px] sm:text-[12px] tracking-widest select-none h-10 rounded-t-sm rounded-b-none transition cursor-pointer",
              selected
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <span className="relative z-[1]">{item.label}</span>

            {/* Base line */}
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute left-0 right-0 bottom-0 h-[3px] rounded-b-none bg-muted"
              )}
            />

            {/* Animated fill for the selected tab */}
            {selected && (
              <span
                key={progressKey}
                aria-hidden="true"
                className="pointer-events-none absolute left-0 bottom-0 h-[3px] bg-foreground/30"
                style={{
                  width: 0,
                  // animate width from 0% to 100%
                  animation: `herotab-progress ${durationMs}ms linear forwards`,
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                }}
              />
            )}
          </button>
        );
      })}

      {/* local keyframes */}
      <style>{`
        @keyframes herotab-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
