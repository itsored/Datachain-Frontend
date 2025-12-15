"use client"

import React from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export default function MobileNav() {
  return (
    <div className="md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" className="p-2">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-full sm:max-w-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">DataChain AI</h3>
            <SheetTrigger asChild>
              <Button variant="ghost" className="p-2">
                <X className="h-5 w-5" />
                <span className="sr-only">Close menu</span>
              </Button>
            </SheetTrigger>
          </div>

          <nav className="flex flex-col space-y-2">
            <Link href="/market" className="px-2 py-2 rounded hover:bg-accent">
              Market
            </Link>
            <Link href="/list" className="px-2 py-2 rounded hover:bg-accent">
              List Dataset
            </Link>
            <Link href="/dashboard" className="px-2 py-2 rounded hover:bg-accent">
              Dashboard
            </Link>
          </nav>

          <div className="mt-6">
            <Link href="/" className="block px-3 py-2 rounded bg-primary text-primary-foreground text-center">
              Connect Wallet
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
