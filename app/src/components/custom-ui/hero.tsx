"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { easeOut } from "motion";
import LogoStack from "@/components/custom-ui/logo-stack";

type Copy = {
  id: "devs" | "hosts" | "agents";
  label: string;
  subheading: string;
  cta: string;
  href?: string;
};

const COPY: Copy[] = [
  {
    id: "devs",
    label: "AI DEVELOPERS",
    subheading:
      "Consume MCPs seamlessly with micropayments, no subscription required.",
    cta: "Browse Servers",
    href: "/servers",
  },
  {
    id: "hosts",
    label: "MCP HOSTS",
    subheading:
      "Register your servers and accept micropayments, with custom prices for each tool call.",
    cta: "Monetize Server",
    href: "/monetize",
  },
  {
    id: "agents",
    label: "AI AGENTS",
    subheading:
      "Prepare your infrastructure for Agent to Agents payments, enabling microtransactions.",
    cta: "Explorer",
    href: "/explorer",
  },
];

export default function Hero({
  className,
  durationMs = 10000,
}: {
  className?: string;
  /** milliseconds per tab for auto-advance + underline fill */
  durationMs?: number;
}) {
  const [active, setActive] = React.useState<Copy["id"]>("devs");
  const current = COPY.find((c) => c.id === active) ?? COPY[0];
  const prefersReduced = useReducedMotion();

  const fadeUp: Variants = React.useMemo(
    () => ({
      hidden: { opacity: 0, y: prefersReduced ? 0 : 8 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: prefersReduced ? 0 : 0.4, ease: easeOut },
      },
    }),
    [prefersReduced]
  );

  return (
    <section className={cn("mx-auto w-full max-w-6xl px-4 md:px-6", className)}>
      {/* Image + Overlay Title */}
      <div className="relative mx-auto w-full overflow-hidden rounded-2xl mt-4">
        <div className="relative aspect-[3/4] sm:aspect-[21/9]">
          {/* Blur -> crisp on first load (image) */}
          <motion.div
            initial={{ opacity: 0, filter: "blur(16px) saturate(0.9)" }}
            animate={{ opacity: 1, filter: "blur(0px) saturate(1)" }}
            transition={{ duration: prefersReduced ? 0 : 0.8, ease: easeOut }}
            className="absolute inset-0"
          >
            <Image
              src="/mcpay-hero-painting.png"
              alt=""
              priority
              fill
              sizes="(max-width: 640px) 100vw, 100vw"
              className="object-cover"
            />
          </motion.div>

        </div>
      </div>

      {/* Content row */}
      <motion.div
        className="mt-12 sm:mt-20 grid gap-8 sm:grid-cols-2 sm:gap-4 sm:items-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        {/* LEFT column: H1 + subheading + CTAs */}
        <div>
          <motion.div
            className="max-w-xl mx-auto sm:mx-0 text-center sm:text-left"
            variants={fadeUp}
          >
            <h1 className="text-4xl font-semibold font-host mb-6">
              Payments for MCPs
            </h1>
            
            <p className="text-balance font-medium text-md text-muted-foreground sm:text-lg mb-6">
              Add micropayments per tool calls to your servers or APIs, without rewriting infrastructure.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" variant="ghostCustom" className="w-full sm:min-w-[10rem]">
                  Monetize
                </Button>
              </Link>
              <Link href="https://docs.mcpay.tech" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button size="lg" variant="ghostCustomSecondary" className="w-full sm:min-w-[10rem]">
                  Documentation
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* RIGHT column: logo stack */}
        <motion.div
          className="order-last sm:order-none mt-8 sm:mt-0 flex justify-center sm:justify-end items-center"
          variants={fadeUp}
        >
          <LogoStack />
        </motion.div>
      </motion.div>
    </section>
  );
}
