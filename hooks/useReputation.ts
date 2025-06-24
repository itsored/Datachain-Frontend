"use client"

import { useState, useCallback } from "react"
import { ethers } from "ethers"
import { useWeb3 } from "./useWeb3"

const REPUTATION_ABI = [
  "function submitRating(address user, uint256 rating)",
  "function getReputation(address user) view returns (uint256)",
  "event RatingSubmitted(address indexed user, uint256 rating)",
]

export function useReputation() {
  const { provider, signer } = useWeb3()
  const [loading, setLoading] = useState(false)

  const reputationAddress = process.env.NEXT_PUBLIC_REPUTATION_ADDRESS!

  const getContract = useCallback(() => {
    if (!provider || !reputationAddress) return null
    return new ethers.Contract(reputationAddress, REPUTATION_ABI, signer || provider)
  }, [provider, signer, reputationAddress])

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
        const reputation = await contract.getReputation(userAddress)
        return Number(reputation)
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
