"use client"

import { Button } from "@/components/ui/button"
import { useWeb3Context } from "./web3-provider"
import { Wallet, Loader2 } from "lucide-react"

export function ConnectWallet() {
  const { isConnected, isConnecting, account, connect, disconnect, error } = useWeb3Context()

  if (isConnected && account) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <span className="text-xs sm:text-sm text-muted-foreground font-mono">
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
        <Button variant="outline" size="sm" onClick={disconnect} className="w-full sm:w-auto">
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-stretch sm:items-center gap-2 w-full sm:w-auto">
      <Button onClick={connect} disabled={isConnecting} className="w-full sm:w-auto">
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="hidden sm:inline">Connecting...</span>
            <span className="sm:hidden">Connecting</span>
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Connect</span>
          </>
        )}
      </Button>
      {error && <p className="text-xs sm:text-sm text-destructive text-center">{error}</p>}
    </div>
  )
}
