import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

type Card = { id: string; title: string; value: string };

type Report = { cards: Card[] };

type OpenAIHost = {
  toolInput?: unknown;
  toolOutput?: Report | undefined;
  widgetState?: any;
  maxHeight?: number;
  displayMode?: string;
  locale?: string;
  theme?: string;
  setWidgetState?: (state: any) => Promise<void> | void;
  callTool?: (name: string, args: any) => Promise<any>;
  sendFollowupTurn?: (opts: { prompt: string }) => Promise<void>;
  requestDisplayMode?: (opts: { mode: "inline" | "pip" | "fullscreen" }) => Promise<void>;
};

declare global {
  interface Window { openai?: OpenAIHost }
}

function App() {
  const initial = (window.openai?.toolOutput as Report | undefined) ?? { cards: [] };
  const [report, setReport] = useState<Report>(initial);
  const [selected, setSelected] = useState<string | null>(window.openai?.widgetState?.selected ?? null);

  useEffect(() => {
    const updated = window.openai?.toolOutput as Report | undefined;
    if (updated) setReport(updated);
  }, [window.openai?.toolOutput]);

  async function refresh() {
    await window.openai?.callTool?.("report.show", {});
  }

  async function makePremiumSummary() {
    await window.openai?.callTool?.("summary.paid", { topic: "payments last week" });
    await window.openai?.sendFollowupTurn?.({ prompt: "Summarize what changed." });
  }

  async function persistSelection(cardId: string) {
    setSelected(cardId);
    await window.openai?.setWidgetState?.({ __v: 1, selected: cardId });
  }

  const total = useMemo(() => report.cards.length, [report.cards]);

  return (
    <div className="antialiased w-full text-black">
      <div className="flex gap-4">
        {report.cards.map((c) => (
          <button
            key={c.id}
            className={`flex-1 border rounded-2xl p-3 text-left ${selected === c.id ? "ring-2 ring-black" : ""}`}
            onClick={() => persistSelection(c.id)}
          >
            <div className="font-medium mb-1">{c.title}</div>
            <div className="text-2xl">{c.value}</div>
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button className="rounded-full bg-black text-white px-3 py-1.5" onClick={refresh}>Refresh</button>
        <button className="rounded-full bg-black/80 text-white px-3 py-1.5" onClick={makePremiumSummary}>Premium summary</button>
        <div className="text-sm text-black/60">{total} cards</div>
      </div>
    </div>
  );
}

const root = document.getElementById("widget-root");
if (root) createRoot(root).render(<App />);
