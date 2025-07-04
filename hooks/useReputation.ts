"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { ethers } from "ethers"
import { useWeb3 } from "./useWeb3"

const REPUTATION_ABI = [
  "function submitRating(address user, uint8 rating)",
  "function getReputation(address user) view returns (uint256)",
  "event RatingSubmitted(address indexed user, uint8 rating)",
]

const DEFAULT_RPC = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"

export function useReputation() {
  const { provider, signer } = useWeb3()
  const [loading, setLoading] = useState(false)

  const reputationAddress = process.env.NEXT_PUBLIC_REPUTATION_ADDRESS!

  // Always use a dedicated JSON-RPC provider for reads (avoids MetaMask quirks)
  const readProvider = useMemo(() => new ethers.JsonRpcProvider(DEFAULT_RPC), [])

  const codeCheckedRef = useRef(false)
  const isDeployedRef = useRef(true)

  useEffect(() => {
    ;(async () => {
      if (!reputationAddress) return
      try {
        const code = await readProvider.getCode(reputationAddress, "latest")
        if (code === "0x") {
          console.warn("Reputation contract not deployed at", reputationAddress)
          isDeployedRef.current = false
        }
      } catch (err) {
        console.error("Error checking reputation contract code", err)
        isDeployedRef.current = false
      } finally {
        codeCheckedRef.current = true
      }
    })()
  }, [readProvider, reputationAddress])

  const getContract = useCallback(() => {
    if (!reputationAddress) return null
    if (codeCheckedRef.current && !isDeployedRef.current) return null
    return new ethers.Contract(reputationAddress, REPUTATION_ABI, signer || readProvider)
  }, [readProvider, signer, reputationAddress])

  const submitRating = useCallback(
    async (userAddress: string, rating: number) => {
      const contract = getContract()
      if (!contract || !signer) throw new Error("Wallet not connected")

      setLoading(true)
      try {
        const tx = await contract.submitRating(userAddress, rating)
        await tx.wait()
      } finally {
        setLoading(false)
      }
    },
    [getContract, signer],
  )

  const getReputation = useCallback(
    async (userAddress: string): Promise<number> => {
      const contract = getContract()
      if (!contract) return 0

      try {
        const reputationRaw = await contract.getReputation(userAddress)
        const avg = Number(reputationRaw) / 100 // convert back to 0-5 scale with two decimals
        return avg
      } catch (error) {
        console.error("Error getting reputation:", error)
        return 0
      }
    },
    [getContract],
  )

  return {
    loading,
    submitRating,
    getReputation,
  }
}
