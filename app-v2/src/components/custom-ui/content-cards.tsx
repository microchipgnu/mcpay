"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlugZap, DollarSign } from "lucide-react";
import Link from "next/link";
export default function ContentCards() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 md:px-6 space-y-8 md:space-y-10">
      {/* Consume */}
      <Card className="consume-card overflow-hidden rounded-2xl py-0 bg-background">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2">
            {/* LEFT: copy */}
            <div className="p-6 sm:p-8">
              <Header
                icon={<PlugZap className="h-5 w-5 text-muted-foreground" />}
                title="Consume"
                description="One account to rule them all, no subscriptions. Browse all the MCPs from major registries, and pay only for what you use."
                descriptionClassName="consume-subheading"
              />

              <Steps
                items={[
                  { n: 1, title: "Sign-Up to MCPay", detail: "using GitHub." },
                  {
                    n: 2,
                    title: "Fund your account",
                    detail: "with any amount, using Credit Card, Apple Pay or Crypto.",
                  },
                  {
                    n: 3,
                    title: "Connect any server",
                    detail: "and pay per tool you consume.",
                  },
                ]}
              />

              <div className="mt-6">
                <Button
                  asChild
                  variant="ghostCustomSecondary"
                  className="cursor-pointer w-full"
                >
                  <Link href="/servers">View All Servers</Link>
                </Button>
              </div>
            </div>

            {/* RIGHT: image */}
            <ImagePanel
              alt=""
              src="/server-cables-image.png"
              className="order-first md:order-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Monetize */}
      <Card className="monetize-card overflow-hidden rounded-2xl py-0 bg-background">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2">
            {/* LEFT: image */}
            <ImagePanel alt="" src="/server-wireframe-image.png" />

            {/* RIGHT: copy */}
            <div className="p-6 sm:p-8">
              <Header
                icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
                title="Monetize"
                description="Receive micropayment and set individual prices per tool call for your registered servers."
                descriptionClassName="monetize-subheading"
              />

              <Steps
                items={[
                  { n: 1, title: "Sign-Up to MCPay", detail: "using GitHub." },
                  {
                    n: 2,
                    title: "Paste the server URL",
                    detail: "in the register page and set prices for each tool call.",
                  },
                  {
                    n: 3,
                    title: "When used",
                    detail: "each tool call will require settlement before being executed.",
                  },
                ]}
              />

              <div className="mt-6">
                <Link href="/register" className="w-full">
                  <Button variant="ghostCustomSecondary" className="cursor-pointer w-full">
                    MONETIZE SERVER
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Header({
  icon,
  title,
  description,
  descriptionClassName,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  descriptionClassName?: string;
}) {
  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        {icon && <span aria-hidden>{icon}</span>}
        <h3 className="text-xl font-host sm:text-2xl font-semibold text-foreground">
          {title}
        </h3>
      </div>
      <p
        className={cn(
          "mt-2 font-medium text-sm sm:text-[16px] text-muted-foreground",
          descriptionClassName
        )}
      >
        {description}
      </p>
    </div>
  );
}

function Steps({
  items,
  className,
}: {
  items: { n: number; title: string; detail?: string }[];
  className?: string;
}) {
  return (
    <ol className={cn("mt-4 space-y-4 sm:space-y-5", className)}>
      {items.map((s) => (
        <li key={s.n} className="flex items-center gap-4">
          <span className="inline-flex font-mono h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background text-base font-semibold">
            {s.n}
          </span>
          <div className="text-sm sm:text-[15px] leading-relaxed">
            <span className="font-semibold text-foreground">{s.title}</span>{" "}
            {s.detail ? (
              <span className="text-muted-foreground">{s.detail}</span>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ImagePanel({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={cn("relative aspect-[4/3] md:aspect-auto md:h-full", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
      />
    </div>
  );
}
