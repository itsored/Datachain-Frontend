"use client"

import { useState } from "react"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { ConnectWallet } from "@/components/connect-wallet"

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/" className="text-xl md:text-2xl font-bold">
            DataChain AI
          </Link>
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
          <div className="hidden md:block">
            <ConnectWallet />
          </div>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-6 mt-8">
                <nav className="flex flex-col gap-4">
                  <Link 
                    href="/market" 
                    className="text-lg font-medium hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Market
                  </Link>
                  <Link 
                    href="/list" 
                    className="text-lg font-medium hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    List Dataset
                  </Link>
                  <Link 
                    href="/dashboard" 
                    className="text-lg font-medium hover:text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                </nav>
                <div className="md:hidden">
                  <ConnectWallet />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

