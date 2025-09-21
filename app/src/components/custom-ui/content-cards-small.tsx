"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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
    href: "https://docs.mcpay.tech"
  },
  {
    title: "Non-Intrusive Middleware",
    firstSentence: "Drop in payments without breaking your stack.",
    restOfDescription: "MCPay wraps around your existing servers so you can start charging with zero refactor.",
    image: "/painting-zoom-2.png",
    href: "https://docs.mcpay.tech"
  },
  {
    title: "Plug and Pay",
    firstSentence: "One toolkit, any chain.",
    restOfDescription: "With wallet and facilitator plugins, MCPay adapts to your ecosystem — and grows with it.",
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
                  <Button variant="ghostCustomSecondary" className="w-full">
                    LEARN MORE
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
