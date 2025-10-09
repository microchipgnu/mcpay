import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          MCPay Docs
        </>
      ),
    },
    // see https://fumadocs.dev/docs/ui/navigation/links
    links: [
      {
      type: "icon",
      icon: "github",
      text: "GitHub",
      url: "https://github.com/microchipgnu/mcpay",
    },
      {
      type: "icon",
      icon: "x",
      text: "X",
      url: "https://x.com/mcpaytech",
    },
      {
      type: "icon",
      icon: "telegram",
      text: "TG",
      url: "https://t.me/mcpay_tech",
    },
  ],
  };
}
