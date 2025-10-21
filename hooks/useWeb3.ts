"use client"

// Fix for TypeScript: declare window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"

// Wait for MetaMask provider to be injected
async function detectEthereumProvider(): Promise<any | null> {
  if (typeof window === "undefined") return null
  if (window.ethereum) return window.ethereum
  return new Promise((resolve) => {
    const handle = () => resolve(window.ethereum)
    window.addEventListener("ethereum#initialized", handle, { once: true })
    setTimeout(() => resolve(window.ethereum), 3000)
  })
}

interface Web3State {
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  account: string | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
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
  })

  const targetChainId = Number.parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "80002")

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setState((prev) => ({ ...prev, error: "MetaMask not found" }))
      return
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }))

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])

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
          return connect()
        } catch (switchError: any) {
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
      })
      if (typeof window !== "undefined") {
        localStorage.setItem("connected", "1")
      }
      console.log("Connected:", { provider, signer, account, chainId })
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || "Failed to connect wallet",
        isConnecting: false,
      }))
      console.error("Connect error:", error)
    }
  }, [targetChainId])

  const disconnect = useCallback(() => {
    setState({
      provider: null,
      signer: null,
      account: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    })
    if (typeof window !== "undefined") {
      localStorage.removeItem("connected")
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const attemptReconnect = async () => {
      const provider = await detectEthereumProvider()
      if (cancelled || !provider) return

      const shouldReconnect = localStorage.getItem("connected") === "1"
      if (!shouldReconnect) return

      try {
        const accounts: string[] = await provider.request({
          method: "eth_accounts",
        })
        if (accounts.length > 0) {
          connect()
        }
      } catch (err: any) {
        console.error("Auto connect error:", err)
      }
    }

    attemptReconnect()

    return () => {
      cancelled = true
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
  }
}
