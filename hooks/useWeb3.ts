"use client"

import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"

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

      // Check if we're on the correct network
      if (chainId !== targetChainId) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
          })
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Network not added to MetaMask
            setState((prev) => ({
              ...prev,
              error: `Please add ${process.env.NEXT_PUBLIC_NETWORK_NAME} network to MetaMask`,
              isConnecting: false,
            }))
            return
          }
          throw switchError
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
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || "Failed to connect wallet",
        isConnecting: false,
      }))
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
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect()
        } else {
          connect()
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

  return {
    ...state,
    connect,
    disconnect,
  }
}
