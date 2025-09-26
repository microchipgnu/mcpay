import type { Metadata, Viewport } from "next";
import { Inter, Host_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-context";
import { UserProvider } from "@/components/providers/user";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/custom-ui/navbar";
import { wagmiConfig } from "@/lib/client/config";
import { WagmiProvider } from "wagmi";
import { AppReactQueryProvider } from "@/components/providers/query-client";
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const hostGrotesk = Host_Grotesk({
  variable: "--font-host-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MCPay — Payments for MCPs",
  description: "Add micropayments per tool call to your MCP servers or APIs without rewriting infrastructure. Prepare your stack for agent-to-agent payments.",
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    title: "MCPay — Payments for MCPs",
    description: "Add micropayments per tool call to your MCP servers or APIs without rewriting infrastructure. Prepare your stack for agent-to-agent payments.",
    type: "website",
    url: "https://mcpay.tech",
    siteName: "MCPay",
    images: [
      {
        url: '/mcpay-agentic-payments-og-image.png',
        width: 1200,
        height: 630,
        alt: 'MCPay — Payments for MCPs',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "MCPay — Payments for MCPs",
    description: "Add micropayments per tool call to your MCP servers or APIs without rewriting infrastructure. Prepare your stack for agent-to-agent payments.",
    images: ['/mcpay-agentic-payments-og-image.png'],
    creator: '@mcpaytech',
    site: '@mcpaytech',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${hostGrotesk.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <WagmiProvider config={wagmiConfig}>
            <AppReactQueryProvider>
              <UserProvider>
                <Navbar />
                {children}
                <Toaster />
              </UserProvider>
            </AppReactQueryProvider>
          </WagmiProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
