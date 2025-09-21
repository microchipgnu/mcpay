"use client"

import { Trophy } from "lucide-react"
import Link from "next/link"

export default function BuiltWithSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
        {/* Left side - Title */}
        <div className="space-y-4">
          <Trophy className="h-6 w-6 text-foreground" />
          <h2 className="text-3xl font-semibold font-host">
            Built with<br />
            the best
          </h2>
        </div>

        {/* Right side - Links */}
        <div className="space-y-6 max-w-md">
          {/* Backed by section */}
          <div>
            <p className="text-sm sm:text-[15px] leading-relaxed text-muted-foreground mb-3">
              Backed by{" "}
              <Link 
                href="https://vlayer.xyz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold"
              >
                vLayer
              </Link>{" "}
              and{" "}
              <Link 
                href="https://www.coinbase.com/developer-platform/discover/launches/summer-builder-grants" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold"
              >
                Coinbase Developer Program
              </Link>
            </p>
          </div>

          {/* Powered by section */}
          <div>
            <p className="text-sm sm:text-[15px] leading-relaxed text-muted-foreground mb-3">
              Powered by the{" "}
              <Link 
                href="https://modelcontextprotocol.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold"
              >
                Model Context Protocol
              </Link>{" "}
              and{" "}
              <Link 
                href="https://x402.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold"
              >
                x402
              </Link>
              .
            </p>
          </div>

          {/* Awards section */}
          <div>
            <p className="text-sm sm:text-[15px] leading-relaxed text-muted-foreground">
              1st place at{" "}
              <Link 
                href="https://ethglobal.com/events/agents" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold"
              >
                Coinbase Agents in Action
              </Link>
              , finalist at{" "}
              <Link 
                href="https://ethglobal.com/showcase/mcpay-fun-y16d3" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold"
              >
                ETHGlobal Prague
              </Link>{" "}
              and 2nd place at{" "}
              <Link 
                href="https://ethglobal.com/events/trifecta" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold"
              >
                ETH Global Trifecta
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
