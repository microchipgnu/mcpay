"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowUpRight, Check } from "lucide-react"
import { useState, useEffect } from "react"

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
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 })

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight
      setMousePosition({ x, y })
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [])

  return (
    <section className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <div className="mb-10">
        <h2 className="text-3xl font-semibold font-host">Focus on building</h2>
      </div>
      
      {/* Wide developer card */}
      <Card className="overflow-hidden rounded-2xl mb-6 bg-background relative">
        <div className="absolute inset-0">
          <Image
            src="/mcpay-developers-image.png"
            alt="MCPay for developers"
            fill
            className="object-cover transition-transform duration-200 ease-out"
            style={{
              transform: `scale(1.15) translate(${(mousePosition.x - 0.5) * 40}px, ${(mousePosition.y - 0.5) * 40}px)`
            }}
          />
        </div>
        <CardContent className="relative z-10 p-8 md:p-12 lg:p-16">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start lg:items-center">
            {/* Left Column - Content */}
            <div className="flex-1">
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-regular font-host mb-6 md:mb-8 lg:mb-12 text-white">
                The most complete SDK
              </h3>
              
              <div className="flex flex-col gap-4 md:gap-6 mb-6 md:mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-500/10 rounded flex items-center justify-center">
                    <Check className="w-4 h-4 text-teal-400" strokeWidth={2.5} />
                  </div>
                  <span className="font-mono text-sm md:text-base lg:text-xl font-medium tracking-wider text-teal-500">SUPPORT FOR EVM AND SOLANA</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-500/10 rounded flex items-center justify-center">
                    <Check className="w-4 h-4 text-teal-400" strokeWidth={2.5} />
                  </div>
                  <span className="font-mono text-sm md:text-base lg:text-xl font-medium tracking-wider text-teal-500">EXTENDABLE WITH PLUGINS</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-500/10 rounded flex items-center justify-center">
                    <Check className="w-4 h-4 text-teal-400" strokeWidth={2.5} />
                  </div>
                  <span className="font-mono text-sm md:text-base lg:text-xl font-medium tracking-wider text-teal-500">SIMPLE X402 SETUP</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-500/10 rounded flex items-center justify-center">
                    <Check className="w-4 h-4 text-teal-400" strokeWidth={2.5} />
                  </div>
                  <span className="font-mono text-sm md:text-base lg:text-xl font-medium tracking-wider text-teal-500">OPEN SOURCE</span>
                </div>
              </div>
            </div>

            {/* Right Column - Code Snippet */}
            <div className="flex-1 w-full">
              <div className="bg-black/70 backdrop-blur-sm rounded-lg border border-teal-500/40 hover:border-teal-500 transition-all duration-300 overflow-hidden">
                <div className="p-3 text-xs font-mono leading-5 overflow-x-auto">
                  <div className="flex min-w-max">
                    <div className="select-none text-gray-500 pr-3 text-right min-w-[1.5rem] flex-shrink-0">
                      {Array.from({ length: 20 }, (_, i) => (
                        <div key={i + 1} className="h-5">{i + 1}</div>
                      ))}
                    </div>
                    <div className="flex-1 min-w-max">
                      <div className="h-5"><span className="text-slate-400">import</span> <span className="text-slate-400">&#123;</span> <span className="text-blue-400">createMcpPaidHandler</span> <span className="text-slate-400">&#125;</span> <span className="text-slate-400">from</span> <span className="text-teal-500">"mcpay/handler"</span></div>
                      <div className="h-5"></div>
                      <div className="h-5"><span className="text-slate-400">export</span> <span className="text-slate-400">const</span> <span className="text-blue-400">paidMcp</span> <span className="text-slate-400">=</span> <span className="text-blue-400">createMcpPaidHandler</span><span className="text-slate-400">(</span></div>
                      <div className="h-5 pl-4"><span className="text-slate-400">async</span> <span className="text-slate-400">(</span><span className="text-white">server</span><span className="text-slate-400">) =&gt;</span> <span className="text-slate-400">&#123;</span></div>
                      <div className="h-5"></div>
                      <div className="h-5 pl-8"><span className="text-white">server</span><span className="text-slate-400">.</span><span className="text-blue-400">paidTool</span><span className="text-slate-400">(</span></div>
                      <div className="h-5 pl-12"><span className="text-teal-500">"hello"</span><span className="text-slate-400">,</span></div>
                      <div className="h-5 pl-12"><span className="text-teal-500">"pay for hello"</span><span className="text-slate-400">,</span></div>
                      <div className="h-5 pl-12"><span className="text-orange-400">"$0.001"</span><span className="text-slate-400">,</span></div>
                      <div className="h-5 pl-12"><span className="text-slate-400">&#123;&#125;,</span></div>
                      <div className="h-5 pl-12"><span className="text-slate-400">async</span> <span className="text-slate-400">(&#123;&#125;) =&gt;</span> <span className="text-slate-400">(&#123;</span> <span className="text-slate-500">content</span><span className="text-slate-400">:</span> <span className="text-slate-400">[&#123;</span> <span className="text-slate-500">type</span><span className="text-slate-400">:</span> <span className="text-teal-500">'text'</span><span className="text-slate-400">,</span> <span className="text-slate-500">text</span><span className="text-slate-400">:</span> <span className="text-teal-500">`Hello, world!`</span> <span className="text-slate-400">&#125;]</span> <span className="text-slate-400">&#125;)</span></div>
                      <div className="h-5 pl-8"><span className="text-slate-400">)</span></div>
                      <div className="h-5"></div>
                      <div className="h-5"><span className="text-slate-400">&#125;, &#123;</span></div>
                      <div className="h-5 pl-4"><span className="text-slate-500">recipient</span><span className="text-slate-400">: &#123;</span></div>
                      <div className="h-5 pl-8"><span className="text-slate-500">evm</span><span className="text-slate-400">: &#123;</span></div>
                      <div className="h-5 pl-12"><span className="text-slate-500">address</span><span className="text-slate-400">:</span> <span className="text-orange-400">'0x036CbD53842c5426634e7929541eC2318f3dCF7e'</span></div>
                      <div className="h-5 pl-8"><span className="text-slate-400">&#125;</span></div>
                      <div className="h-5 pl-4"><span className="text-slate-400">&#125;</span></div>
                      <div className="h-5"><span className="text-slate-400">&#125;)</span></div>
                    </div>
                  </div>
                </div>
              </div>
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
