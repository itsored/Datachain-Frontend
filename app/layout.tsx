import React from "react"
import Link from "next/link"
import { ThemeProvider } from "./(providers)/theme-provider"
import { Web3Provider } from "@/components/web3-provider"
import { Toaster } from "@/components/ui/toaster"
import ConnectWallet from "@/components/connect-wallet"
import MobileNav from "@/components/mobile-nav"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Web3Provider>
            <div className="min-h-screen bg-background">
              <header className="border-b">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <Link href="/" className="text-2xl font-bold">
                      DataChain AI
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex gap-6">
                      <Link href="/market" className="hover:text-primary">
                        Market
                      </Link>
                      <Link href="/list" className="hover:text-primary">
                        List Dataset
                      </Link>
                      <Link href="/dashboard" className="hover:text-primary">
                        Dashboard
                      </Link>
                    </nav>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Mobile nav trigger */}
                    <MobileNav />

                    {/* Keep ConnectWallet visible on all sizes; it will handle its own layout */}
                    <ConnectWallet />
                  </div>
                </div>
              </header>

              <main>{children}</main>
            </div>
            <Toaster />
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}
