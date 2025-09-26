import React from "react";
import Image from "next/image";
import Link from "next/link";

// Update the hrefs if these domains are different for your project
const LOGOS = [
  { name: "Smithery", href: "https://smithery.ai/", src: "/logos/smithery-logo.svg", width: 30, height: 40 },
  { name: "KlavisAI", href: "https://www.klavis.ai/", src: "/logos/klavisAI-logo.png", width: 80, height: 50 },
  { name: "Composio", href: "https://composio.dev/", src: "/logos/composio-logo.svg", width: 100, height: 40 },
];

export default function LogoStack() {
  return (
    <section aria-labelledby="logo-stack-heading" className="w-full">
      <h3
        id="logo-stack-heading"
        className="mb-4 text-center sm:text-right font-mono font-medium tracking-wider text-xs text-muted-foreground/80"
      >
        WORKS WITH MCPs FROM ALL REGISTRIES
      </h3>

      <div className="flex items-center justify-center sm:justify-end gap-6 sm:gap-8">
        {LOGOS.map((logo, i) => (
          <React.Fragment key={logo.name}>
            <Link
              href={logo.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center"
              aria-label={`Open ${logo.name} website`}
              title={logo.name}
            >
              <Image
                src={logo.src}
                alt={`${logo.name} logo`}
                width={logo.width}
                height={logo.height}
                className="grayscale opacity-40 transition duration-200 ease-out group-hover:grayscale-0 group-hover:opacity-100"
              />
            </Link>

            {i < LOGOS.length - 1 && (
              <span
                aria-hidden="true"
                className="select-none text-zinc-300 dark:text-zinc-700"
              >
                |
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}