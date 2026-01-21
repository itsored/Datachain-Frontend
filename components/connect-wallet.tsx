"use client"

import { Button } from "@/components/ui/button"
import { useWeb3Context } from "./web3-provider"
import { Wallet, Loader2, ExternalLink, Smartphone } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState } from "react"

export function ConnectWallet() {
  const { 
    isConnected, 
    isConnecting, 
    account, 
    connect, 
    disconnect, 
    error,
    isMobile,
    hasWallet,
    getMetaMaskDeepLink,
    getTrustWalletDeepLink
  } = useWeb3Context()
  
  const [showMobileDialog, setShowMobileDialog] = useState(false)

  // Check mobile at click time to ensure we have latest detection
  const isMobileDevice = () => {
    if (typeof window === "undefined") return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  }

  const handleConnect = () => {
    const mobile = isMobile || isMobileDevice()
    const walletAvailable = hasWallet || (typeof window !== "undefined" && !!window.ethereum)
    
    if (mobile && !walletAvailable) {
      setShowMobileDialog(true)
    } else {
      connect()
    }
  }

  const openInMetaMask = () => {
    const deepLink = getMetaMaskDeepLink()
    window.location.href = deepLink
  }

  const openInTrustWallet = () => {
    const deepLink = getTrustWalletDeepLink()
    window.location.href = deepLink
  }

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
    <>
      <div className="flex flex-col items-stretch sm:items-center gap-2 w-full sm:w-auto">
        <Button onClick={handleConnect} disabled={isConnecting} className="w-full sm:w-auto">
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
        {error && error !== "MOBILE_NO_WALLET" && (
          <p className="text-xs sm:text-sm text-destructive text-center">{error}</p>
        )}
      </div>

      {/* Mobile Wallet Selection Dialog */}
      <Dialog open={showMobileDialog} onOpenChange={setShowMobileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Connect on Mobile
            </DialogTitle>
            <DialogDescription>
              To connect your wallet on mobile, open this page in your wallet app&apos;s browser.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              onClick={openInMetaMask} 
              className="w-full justify-between"
              variant="outline"
            >
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z" fill="#E17726" stroke="#E17726" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2.04858 1L15.0707 10.809L12.7396 4.99098L2.04858 1Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M28.2292 23.5334L24.7346 28.872L32.2175 30.9323L34.3611 23.6501L28.2292 23.5334Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M0.658691 23.6501L2.78916 30.9323L10.2588 28.872L6.77745 23.5334L0.658691 23.6501Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.87402 14.5149L7.81299 17.6507L15.1974 17.9874L14.9543 9.91016L9.87402 14.5149Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M25.1323 14.5151L19.9786 9.81934L19.8242 17.9876L27.1953 17.6509L25.1323 14.5151Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10.2588 28.8721L14.7453 26.7051L10.8728 23.7036L10.2588 28.8721Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20.2612 26.7051L24.7344 28.8721L24.1337 23.7036L20.2612 26.7051Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Open in MetaMask
              </span>
              <ExternalLink className="h-4 w-4" />
            </Button>
            
            <Button 
              onClick={openInTrustWallet} 
              className="w-full justify-between"
              variant="outline"
            >
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z" fill="#0500FF"/>
                  <path d="M20.0002 8.33325C14.5652 8.33325 10.6069 12.4666 10.6069 12.4666C10.6069 12.4666 10.6069 22.1999 10.6069 25.5333C10.6069 28.8666 13.1835 31.6666 20.0002 31.6666C26.8169 31.6666 29.3935 28.8666 29.3935 25.5333C29.3935 22.1999 29.3935 12.4666 29.3935 12.4666C29.3935 12.4666 25.4352 8.33325 20.0002 8.33325Z" stroke="white" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Open in Trust Wallet
              </span>
              <ExternalLink className="h-4 w-4" />
            </Button>

            <div className="text-xs text-muted-foreground text-center mt-2">
              Don&apos;t have a wallet app? Download{" "}
              <a 
                href="https://metamask.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                MetaMask
              </a>{" "}
              or{" "}
              <a 
                href="https://trustwallet.com/download" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Trust Wallet
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
