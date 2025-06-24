"use client"

import { Button } from "@/components/ui/button"
import { useWeb3Context } from "./web3-provider"
import { Wallet, Loader2 } from "lucide-react"

export function ConnectWallet() {
  const { isConnected, isConnecting, account, connect, disconnect, error } = useWeb3Context()

  if (isConnected && account) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {account.slice(0, 6)}...{account.slice(-4)}
        </span>
        <Button variant="outline" size="sm" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={connect} disabled={isConnecting}>
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </>
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
