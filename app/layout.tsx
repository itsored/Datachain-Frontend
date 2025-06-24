import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Web3Provider } from "@/components/web3-provider"
import { Toaster } from "@/components/ui/toaster"
import { ConnectWallet } from "@/components/connect-wallet"
import Link from "next/link"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DataChain AI - Decentralized AI Training Data Marketplace",
  description: "Buy and sell AI training datasets on the blockchain",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Web3Provider>
            <div className="min-h-screen bg-background">
              <header className="border-b">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-8">
                    <Link href="/" className="text-2xl font-bold">
                      DataChain AI
                    </Link>
                    <nav className="flex gap-6">
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
                  <ConnectWallet />
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
