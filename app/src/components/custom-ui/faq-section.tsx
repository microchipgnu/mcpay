"use client"

import React from "react"
import { HelpCircle } from "lucide-react"
import Link from "next/link"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface FAQItem {
  question: string
  answer: string | React.ReactNode
}

const faqData: FAQItem[] = [
  {
    question: "What is MCPay?",
    answer: (
      <>
        MCPay is a <strong>payment layer for MCP servers and plain HTTP APIs</strong>. It uses <code>HTTP 402 Payment Required</code> with the <strong>x402</strong> flow so clients (apps/agents/browsers) can pay per call and automatically retry to get the result. <strong>No subscriptions, no OAuth, no manual API keys.</strong>
      </>
    )
  },
  {
    question: "Do I have to use MCP?",
    answer: (
      <>
        No. MCPay works great for <strong>plain HTTP</strong> endpoints. Using MCP adds niceties like <strong>tool discovery and pricing metadata</strong> for agent ecosystems.
      </>
    )
  },
  {
    question: "Who is MCPay for?",
    answer: (
      <div className="space-y-2">
        <div><strong>Providers</strong> (API/MCP owners) who want to <strong>price and monetize</strong> specific tools or routes.</div>
        <div><strong>Integrators/Agents</strong> who need <strong>programmatic, per-call payments</strong> without human sign-ups.</div>
        <div><strong>Builders</strong> who want the <strong>fastest path</strong> to ship paid MCP servers.</div>
      </div>
    )
  },
  {
    question: "What's the MCPay Registry?",
    answer: (
      <>
        A machine-readable catalog of MCP servers and their priced tools (analytics, recent payments, integration snippets). Browse the Registry at <Link href="/servers" className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold">Servers</Link>.
      </>
    )
  },
  {
    question: "What is MCPay Build?",
    answer: (
      <>
        A v0/Lovable-style builder that lets you <strong>describe tools, preview them live, read the generated code, price tools, and one-click deploy</strong> to GitHub + Vercel. Under the hood it uses an <strong>MCP server</strong> to orchestrate scaffolding, edits, previews, pricing, and deploy.
        <br /><br />
        <a href="https://mcpay.tech/build" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold">Builder</a>
        <br />
        <a href="https://mcpay.tech/servers/23e2ab26-7808-4984-855c-ec6a7dc97c3a" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold">Build server page</a>
      </>
    )
  }
]

export default function FAQSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
        {/* Left side - Title */}
        <div className="space-y-4">
          <HelpCircle className="h-6 w-6 text-foreground" />
          <h2 className="text-3xl font-semibold font-host">
            Frequently Asked<br />
            Questions
          </h2>
        </div>

        {/* Right side - FAQ Items */}
        <div className="max-w-md">
          <Accordion type="single" collapsible className="w-full">
            {faqData.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-b border-border">
                <AccordionTrigger className="text-left hover:no-underline group cursor-pointer">
                  <span className="text-sm sm:text-[15px] leading-relaxed font-semibold text-foreground group-hover:text-teal-600 transition-all duration-300">
                    {item.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-sm sm:text-[15px] leading-relaxed text-foreground">
                    {item.answer}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
