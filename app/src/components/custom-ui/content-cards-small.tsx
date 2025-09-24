"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowUpRight, Code, Zap, Shield, BarChart3 } from "lucide-react"

interface CardData {
  title: string
  firstSentence: string
  restOfDescription: string
  image: string
  href: string
}

const cardData: CardData[] = [
  {
    title: "Request Payments",
    firstSentence: "Turn tool calls into transactions.",
    restOfDescription: "Price your MCP resources however you want: per call, per prompt, or per outcome.",
    image: "/painting-zoom-1.png",
    href: "https://docs.mcpay.tech/quickstart/monetize"
  },
  {
    title: "Non-Intrusive Middleware",
    firstSentence: "Drop in payments without rewriting your infrastructure.",
    restOfDescription: "MCPay wraps around your existing servers so you can start charging with zero refactor.",
    image: "/painting-zoom-2.png",
    href: "https://docs.mcpay.tech/quickstart/integrate"
  },
  {
    title: "More Than Payments",
    firstSentence: "Supercharge your servers.",
    restOfDescription: "With guardrails, analytics, data augmentation and plugins.",
    image: "/painting-zoom-3.png",
    href: "https://docs.mcpay.tech"
  }
]

export default function ContentCardsSmall() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <div className="mb-10">
        <h2 className="text-3xl font-semibold font-host">Focus on building</h2>
      </div>
      
      {/* Wide developer card */}
      <Card className="overflow-hidden rounded-2xl mb-6 bg-background relative h-110">
        <div className="absolute inset-0">
          <Image
            src="/mcpay-developers-image.png"
            alt="MCPay for developers"
            fill
            className="object-cover"
          />
        </div>
        <CardContent className="relative z-10 p-6 md:p-12 h-full flex flex-col justify-center">
          <h3 className="text-4xl md:text-5xl font-regular font-host mb-12 text-white">
            The most complete SDK
          </h3>
          
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-500/10 rounded flex items-center justify-center">
                <Shield className="w-4 h-4 text-teal-400" strokeWidth={2.5} />
              </div>
              <span className="font-mono text-base md:text-xl font-medium tracking-wider text-teal-500">SUPPORT FOR EVM AND SOLANA</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-500/10 rounded flex items-center justify-center">
                <Zap className="w-4 h-4 text-teal-400" strokeWidth={2.5} />
              </div>
              <span className="font-mono text-base md:text-xl font-medium tracking-wider text-teal-500">EXTENDABLE WITH PLUGINS</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-500/10 rounded flex items-center justify-center">
                <Code className="w-4 h-4 text-teal-400" strokeWidth={2.5} />
              </div>
              <span className="font-mono text-base md:text-xl font-medium tracking-wider text-teal-500">SIMPLE X402 SETUP</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-500/10 rounded flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-teal-400" strokeWidth={2.5} />
              </div>
              <span className="font-mono text-base md:text-xl font-medium tracking-wider text-teal-500">OPEN SOURCE</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cardData.map((card, index) => (
          <Card key={index} className="overflow-hidden rounded-2xl py-0 bg-background flex flex-col h-full">
            <CardContent className="p-0 flex flex-col h-full">
              {/* Image - flush with card border */}
              <div className="relative aspect-[5/3]">
                <Image
                  src={card.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
                {/* Coming Soon pill for the last card */}
                {index === 2 && (
                  <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-mono font-medium px-2 py-1 rounded-sm">
                    COMING SOON
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-semibold font-host mb-3 text-foreground">
                  {card.title}
                </h3>
                
                <div className="text-sm sm:text-[15px] leading-relaxed mb-6 flex-grow">
                  <span className="font-semibold text-foreground">{card.firstSentence}</span>{" "}
                  <span className="text-muted-foreground">{card.restOfDescription}</span>
                </div>
                
                <Link href={card.href} target="_blank" rel="noopener noreferrer" className="mt-auto">
                  <Button variant="ghostCustomSecondary" className="w-full group">
                    LEARN MORE
                    <ArrowUpRight className="ml-0.5 h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
