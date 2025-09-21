"use client"

import { HelpCircle } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface FAQItem {
  question: string
  answer: string
}

const faqData: FAQItem[] = [
  {
    question: "What is MCPay?",
    answer: "MCPay is a payment infrastructure for Model Context Protocol (MCP) servers that enables micropayments for AI tool usage. It allows developers to monetize their MCP servers while providing users with a pay-per-use model for accessing AI tools and services."
  },
  {
    question: "Do I need crypto?",
    answer: "No, you don't need to own or understand cryptocurrency. MCPay supports multiple payment methods including credit cards, Apple Pay, and traditional payment options. We handle all the blockchain transactions behind the scenes for a seamless experience."
  },
  {
    question: "Do you use AI?",
    answer: "MCPay integrates with AI systems through the Model Context Protocol, but we don't replace AI models. Instead, we provide the payment infrastructure that allows AI applications to access and pay for external tools and services in real-time."
  },
  {
    question: "Why does this exist?",
    answer: "Traditional subscription models don't work well for AI tool usage, which can be sporadic and varied. MCPay enables a fair pay-per-use model where developers can monetize their tools based on actual usage, and users only pay for what they consume."
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
                  <p className="text-sm sm:text-[15px] leading-relaxed text-muted-foreground">
                    {item.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
