"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { ethers } from "ethers"
import { useWeb3Context } from "@/components/web3-provider"

const REPUTATION_ABI = [
  "function submitRating(address seller, uint256 datasetId, uint8 rating, string review)",
  "function getReputation(address seller) view returns (uint256)",
  "function getReputationSummary(address seller) view returns (uint256 reputation, uint256 totalRatings, uint256 positiveRatings, uint256 neutralRatings, uint256 negativeRatings, uint256 verifiedRatings, uint256 lastUpdatedAt)",
  "function hasRated(address seller, uint256 datasetId, address reviewer) view returns (bool)",
  "event RatingSubmitted(address indexed seller, address indexed reviewer, uint256 indexed datasetId, uint8 rating, string review)",
]

const DEFAULT_RPC = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"
const TARGET_CHAIN_ID = Number.parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "0", 10)
const IS_LOCALHOST = TARGET_CHAIN_ID === 31337

export interface ReputationSummary {
  reputation: number
  totalRatings: number
  positiveRatings: number
  neutralRatings: number
  negativeRatings: number
  verifiedRatings: number
  lastUpdatedAt: number
}

const EMPTY_SUMMARY: ReputationSummary = {
  reputation: 0,
  totalRatings: 0,
  positiveRatings: 0,
  neutralRatings: 0,
  negativeRatings: 0,
  verifiedRatings: 0,
  lastUpdatedAt: 0,
}

export function useReputation() {
  const { signer, account } = useWeb3Context()
  const [loading, setLoading] = useState(false)

  const reputationAddress = process.env.NEXT_PUBLIC_REPUTATION_ADDRESS!

  // Always use a dedicated JSON-RPC provider for reads (avoids MetaMask quirks)
  const readProvider = useMemo(
    () =>
      new ethers.JsonRpcProvider(
        DEFAULT_RPC,
        TARGET_CHAIN_ID ? { chainId: TARGET_CHAIN_ID, name: process.env.NEXT_PUBLIC_NETWORK_NAME || "localhost" } : undefined,
        { staticNetwork: true },
      ),
    [],
  )

  const codeCheckedRef = useRef(false)
  const isDeployedRef = useRef(true)

  useEffect(() => {
    if (IS_LOCALHOST) {
      codeCheckedRef.current = true
      isDeployedRef.current = true
      return
    }

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

  const getReadContract = useCallback(() => {
    if (!reputationAddress) return null
    if (codeCheckedRef.current && !isDeployedRef.current) return null
    return new ethers.Contract(reputationAddress, REPUTATION_ABI, readProvider)
  }, [readProvider, reputationAddress])

  const getWriteContract = useCallback(() => {
    if (!reputationAddress || !signer) return null
    return new ethers.Contract(reputationAddress, REPUTATION_ABI, signer)
  }, [reputationAddress, signer])

  const submitRating = useCallback(
    async (sellerAddress: string, datasetId: number, rating: number, review: string) => {
      const contract = getWriteContract()
      if (!contract || !signer) throw new Error("Wallet not connected")

      setLoading(true)
      try {
        const tx = await contract.submitRating(sellerAddress, datasetId, rating, review)
        await tx.wait()
      } finally {
        setLoading(false)
      }
    },
    [getWriteContract, signer],
  )

  const getReputation = useCallback(
    async (sellerAddress: string): Promise<number> => {
      const contract = getReadContract()
      if (!contract) return 0

      try {
        const reputationRaw = await contract.getReputation(sellerAddress)
        const avg = Number(reputationRaw) / 100 // convert back to 0-5 scale with two decimals
        return avg
      } catch (error) {
        console.error("Error getting reputation:", error)
        return 0
      }
    },
    [getReadContract],
  )

  const getReputationSummary = useCallback(
    async (sellerAddress: string): Promise<ReputationSummary> => {
      const contract = getReadContract()
      if (!contract) return EMPTY_SUMMARY

      try {
        const summary = await contract.getReputationSummary(sellerAddress)
        return {
          reputation: Number(summary.reputation) / 100,
          totalRatings: Number(summary.totalRatings),
          positiveRatings: Number(summary.positiveRatings),
          neutralRatings: Number(summary.neutralRatings),
          negativeRatings: Number(summary.negativeRatings),
          verifiedRatings: Number(summary.verifiedRatings),
          lastUpdatedAt: Number(summary.lastUpdatedAt),
        }
      } catch (error) {
        console.error("Error getting reputation summary:", error)
        return EMPTY_SUMMARY
      }
    },
    [getReadContract],
  )

  const hasRated = useCallback(
    async (sellerAddress: string, datasetId: number, reviewerAddress?: string): Promise<boolean> => {
      const reviewer = reviewerAddress || account
      const contract = getReadContract()
      if (!contract || !reviewer) return false

      try {
        return await contract.hasRated(sellerAddress, datasetId, reviewer)
      } catch (error) {
        console.error("Error checking submitted rating:", error)
        return false
      }
    },
    [account, getReadContract],
  )

  return {
    loading,
    submitRating,
    getReputation,
    getReputationSummary,
    hasRated,
  }
}
