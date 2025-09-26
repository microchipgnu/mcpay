"use client"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/providers/theme-context"
import { useSession } from "@/lib/client/auth"
import { User, Menu, Moon, Sun, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAccountModal } from "@/components/hooks/use-account-modal"
import { AccountModal } from "@/components/custom-ui/account-modal"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetClose,
} from "@/components/ui/sheet"
import { useState } from "react"

export default function Navbar() {
  const pathname = usePathname()
  const { isDark, toggleTheme } = useTheme()
  const { data: session, isPending: sessionLoading } = useSession()
  const { isOpen, defaultTab, openModal, closeModal } = useAccountModal()
  const [menuOpen, setMenuOpen] = useState(false)

  const logoSrc = isDark ? "/MCPay-logo-dark.svg" : "/MCPay-logo-light.svg"
  const symbolSrc = isDark ? "/MCPay-symbol-dark.svg" : "/MCPay-symbol-light.svg"

  const linkClasses =
    "h-8 px-2 font-mono text-[13px] tracking-wider text-muted-foreground hover:text-foreground hover:underline hover:decoration-dotted underline-offset-2"
  const activeLinkClasses = "text-foreground underline decoration-dotted"

  return (
    <nav
      className={`sticky top-0 z-40 w-full border-b transition-colors duration-200 ${isDark
        ? "bg-black/95 backdrop-blur border-gray-800"
        : "bg-white/95 backdrop-blur border-gray-200"
        }`}
    >
      <div className="w-full px-2">
        {/* Mobile: logo left, actions right. Desktop: 3-col grid to center middle links */}
        <div className="flex items-center justify-between py-2 sm:grid sm:grid-cols-3">
          {/* Left: Logo */}
          <div className="flex items-center">
            <Link href="/">
              {/* Mobile: symbol */}
              <div className="block sm:hidden">
                <Image src={symbolSrc} alt="MCPay Symbol" width={34} height={34} />
              </div>
              {/* Desktop: full logo */}
              <div className="hidden sm:flex items-center gap-3">
                <Image src={logoSrc} alt="MCPay Logo" width={112} height={72} />
              </div>
            </Link>
          </div>

          {/* Center (desktop only): BUILD / BROWSE / MONETIZE */}
          <div className="hidden sm:flex justify-center items-center gap-8">
            <Button
              asChild
              variant="link"
              className={`${linkClasses} ${pathname === "/build" ? activeLinkClasses : ""}`}
            >
              <Link href="/build">BUILD</Link>
            </Button>
            <Button
              asChild
              variant="link"
              className={`${linkClasses} ${pathname === "/servers" ? activeLinkClasses : ""}`}
            >
              <Link href="/servers">BROWSE</Link>
            </Button>
            <Button
              asChild
              variant="link"
              className={`${linkClasses} ${pathname === "/register" ? activeLinkClasses : ""}`}
            >
              <Link href="/register">MONETIZE</Link>
            </Button>
          </div>

          {/* Right: Connect/Account + Mobile Menu */}
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghostCustom"
              onClick={() => openModal("funds")}
              disabled={sessionLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
              aria-label={session?.user ? "Open account" : "Connect"}
            >
              {session?.user ? (
                <>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${isDark ? "bg-gray-700" : "bg-gray-200"
                      }`}
                  >
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt="Profile"
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                  </div>
                  <span className="hidden sm:inline">
                    {session.user.name?.split(" ")[0] || "Account"}
                  </span>
                </>
              ) : (
                // No icon; always show "Connect" label (mobile + desktop)
                <span>Connect</span>
              )}
            </Button>

            {/* Mobile hamburger (right aligned) */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              {/* Fullscreen sheet, hide built-in close so we can align our own */}
              <SheetContent
                side="right"
                className="p-0 w-screen max-w-none h-screen sm:hidden 
             bg-white text-foreground dark:bg-black
             [&>button.absolute.right-4.top-4]:hidden"
              >
                {/* Header: bigger logo + our aligned close (same row, vertically centered) */}
                <SheetHeader className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <Image src={logoSrc} alt="MCPay Logo" width={160} height={80} />
                    <SheetClose asChild>
                      <Button variant="ghost" size="icon" className="text-foreground" aria-label="Close menu">
                        <X className="h-6 w-6" />
                      </Button>
                    </SheetClose>
                  </div>
                </SheetHeader>


                {/* Links */}
                <div className="px-8 pt-6 space-y-8">
                  <SheetClose asChild>
                    <Link
                      href="/build"
                      className="block font-mono tracking-wide text-lg text-muted-foreground hover:text-foreground"
                    >
                      BUILD
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href="/servers"
                      className="block font-mono tracking-wide text-lg text-muted-foreground hover:text-foreground"
                    >
                      BROWSE
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href="/register"
                      className="block font-mono tracking-wide text-lg text-muted-foreground hover:text-foreground"
                    >
                      MONETIZE
                    </Link>
                  </SheetClose>
                </div>

                {/* Bottom: centered theme + socials */}
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="link"
                      size="icon"
                      aria-label="Toggle theme"
                      onClick={toggleTheme}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {isDark ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5" />}
                    </Button>

                    <nav className="flex items-center">
                      <Button asChild variant="link" className={linkClasses}>
                        <Link href="https://docs.mcpay.tech" target="_blank" rel="noreferrer">
                          DOCS
                        </Link>
                      </Button>
                      <Button asChild variant="link" className={linkClasses}>
                        <Link href="https://github.com/microchipgnu/mcpay" target="_blank" rel="noreferrer">
                          GITHUB
                        </Link>
                      </Button>
                      <Button asChild variant="link" className={linkClasses}>
                        <Link href="https://t.me/mcpay_tech" target="_blank" rel="noreferrer">
                          TELEGRAM
                        </Link>
                      </Button>
                      <Button asChild variant="link" className={linkClasses}>
                        <Link href="https://x.com/mcpaytech" target="_blank" rel="noreferrer">
                          X
                        </Link>
                      </Button>
                    </nav>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <AccountModal isOpen={isOpen} onClose={closeModal} defaultTab={defaultTab} />
    </nav>
  )
}
