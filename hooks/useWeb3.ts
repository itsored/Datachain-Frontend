"use client"

// Fix for TypeScript: declare window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

import { useState, useEffect, useCallback, useRef } from "react"
import { ethers } from "ethers"

interface Web3State {
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  account: string | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  isMobile: boolean
  hasWallet: boolean
}

// Detect if user is on a mobile device
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

// Check if we're inside a wallet's in-app browser
function isInWalletBrowser(): boolean {
  if (typeof window === "undefined") return false
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes("metamask") || ua.includes("trust") || ua.includes("coinbase")
}

// Get the deep link to open the current page in MetaMask mobile
export function getMetaMaskDeepLink(): string {
  if (typeof window === "undefined") return ""
  const currentUrl = window.location.href
  // Remove the protocol for the deep link
  const urlWithoutProtocol = currentUrl.replace(/^https?:\/\//, "")
  return `https://metamask.app.link/dapp/${urlWithoutProtocol}`
}

// Get Trust Wallet deep link
export function getTrustWalletDeepLink(): string {
  if (typeof window === "undefined") return ""
  const currentUrl = window.location.href
  return `trust://open_url?coin_id=60&url=${encodeURIComponent(currentUrl)}`
}

export function useWeb3() {
  const [state, setState] = useState<Web3State>({
    provider: null,
    signer: null,
    account: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    error: null,
    isMobile: false,
    hasWallet: false,
  })
  
  // Ref to track if a connection attempt is in progress (prevents race conditions)
  const isConnectingRef = useRef(false)

  const targetChainId = Number.parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "80002")

  // Update mobile and wallet detection on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mobile = isMobileDevice()
      const hasWallet = !!window.ethereum
      setState((prev) => ({ ...prev, isMobile: mobile, hasWallet }))
    }
  }, [])

  const connect = useCallback(async () => {
    if (typeof window === "undefined") {
      return
    }
    
    const mobile = isMobileDevice()
    const hasWallet = !!window.ethereum
    
    if (!hasWallet) {
      if (mobile) {
        // On mobile without wallet, we'll handle this in the UI
        setState((prev) => ({ 
          ...prev, 
          error: "MOBILE_NO_WALLET",
          isMobile: true,
          hasWallet: false 
        }))
      } else {
        setState((prev) => ({ 
          ...prev, 
          error: "Please install MetaMask to connect your wallet",
          isMobile: false,
          hasWallet: false
        }))
      }
      return
    }

    // Prevent multiple connection attempts using ref (sync check)
    if (isConnectingRef.current) {
      console.log("Connection already in progress, skipping...")
      return
    }
    
    isConnectingRef.current = true
    setState((prev) => ({ ...prev, isConnecting: true, error: null }))

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      
      try {
        await provider.send("eth_requestAccounts", [])
      } catch (requestError: any) {
        // Handle "already pending" error - MetaMask popup is already open
        if (requestError?.code === -32002 || requestError?.error?.code === -32002) {
          isConnectingRef.current = false
          setState((prev) => ({
            ...prev,
            error: "Please check MetaMask - a connection request is already pending",
            isConnecting: false,
          }))
          return
        }
        throw requestError
      }

      const signer = await provider.getSigner()
      const account = await signer.getAddress()
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)

      if (chainId !== targetChainId) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
          })
          // After switching, re-run connect to update state
          // Reset the ref so the recursive call can proceed
          isConnectingRef.current = false
          return connect()
        } catch (switchError: any) {
          isConnectingRef.current = false
          setState((prev) => ({
            ...prev,
            error: `Please add ${process.env.NEXT_PUBLIC_NETWORK_NAME} network to MetaMask`,
            isConnecting: false,
          }))
          return
        }
      }

      setState({
        provider,
        signer,
        account,
        chainId,
        isConnected: true,
        isConnecting: false,
        error: null,
        isMobile: isMobileDevice(),
        hasWallet: true,
      })
      isConnectingRef.current = false
      if (typeof window !== "undefined") {
        localStorage.setItem("connected", "1")
      }
      console.log("Connected:", { provider, signer, account, chainId })
    } catch (error: any) {
      isConnectingRef.current = false
      setState((prev) => ({
        ...prev,
        error: error.message || "Failed to connect wallet",
        isConnecting: false,
      }))
      console.error("Connect error:", error)
    }
  }, [targetChainId])

  const disconnect = useCallback(() => {
    isConnectingRef.current = false
    setState({
      provider: null,
      signer: null,
      account: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      isMobile: isMobileDevice(),
      hasWallet: typeof window !== "undefined" && !!window.ethereum,
    })
    if (typeof window !== "undefined") {
      localStorage.removeItem("connected")
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const shouldReconnect = localStorage.getItem("connected") === "1"
      if (shouldReconnect) {
        // attempt to reconnect silently
        ;(async () => {
          try {
            const accounts: string[] = await window.ethereum.request({
              method: "eth_accounts",
            })
            if (accounts.length > 0) {
              connect()
            }
          } catch (err: any) {
            console.error("Auto connect error:", err)
          }
        })()
      }
    }
  }, [connect])

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log("accountsChanged:", accounts);
        if (accounts.length === 0) {
          // Instead of disconnecting immediately, wait a short time and re-check
          setTimeout(() => {
            if (window.ethereum.selectedAddress == null) {
              disconnect();
            }
          }, 500); // 0.5s delay
        } else {
          connect();
        }
      }

      const handleChainChanged = () => {
        connect()
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [connect, disconnect])

  useEffect(() => {
    console.log("Web3 State:", state)
  }, [state])

  return {
    ...state,
    connect,
    disconnect,
    getMetaMaskDeepLink,
    getTrustWalletDeepLink,
  }
}
