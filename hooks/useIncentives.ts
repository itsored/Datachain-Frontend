"use client"

import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { useWeb3 } from "./useWeb3"

const INCENTIVES_ABI = [
  "function distributeReward(address user, uint256 amount)",
  "function claimReward()",
  "function pendingRewards(address user) view returns (uint256)",
  "function balanceOf(address user) view returns (uint256)",
  "event RewardDistributed(address indexed user, uint256 amount)",
  "event RewardClaimed(address indexed user, uint256 amount)",
]

export function useIncentives() {
  const { provider, signer, account } = useWeb3()
  const [pendingRewards, setPendingRewards] = useState("0")
  const [balance, setBalance] = useState("0")
  const [loading, setLoading] = useState(false)

  const incentivesAddress = process.env.NEXT_PUBLIC_INCENTIVES_ADDRESS!

  const getContract = useCallback(() => {
    if (!provider || !incentivesAddress) return null
    return new ethers.Contract(incentivesAddress, INCENTIVES_ABI, signer || provider)
  }, [provider, signer, incentivesAddress])

  const loadRewards = useCallback(async () => {
    const contract = getContract()
    if (!contract || !account) return

    try {
      const [pending, bal] = await Promise.all([contract.pendingRewards(account), contract.balanceOf(account)])

      setPendingRewards(ethers.formatEther(pending))
      setBalance(ethers.formatEther(bal))
    } catch (error) {
      console.error("Error loading rewards:", error)
    }
  }, [getContract, account])

  const claimReward = useCallback(async () => {
    const contract = getContract()
    if (!contract || !signer) throw new Error("Wallet not connected")

    setLoading(true)
    try {
      const tx = await contract.claimReward()
      await tx.wait()
      await loadRewards()
    } finally {
      setLoading(false)
    }
  }, [getContract, signer, loadRewards])

  const distributeReward = useCallback(
    async (userAddress: string, amountInEth: string) => {
      const contract = getContract()
      if (!contract || !signer) throw new Error("Wallet not connected")

      setLoading(true)
      try {
        const amount = ethers.parseEther(amountInEth)
        const tx = await contract.distributeReward(userAddress, amount)
        await tx.wait()
      } finally {
        setLoading(false)
      }
    },
    [getContract, signer],
  )

  // Set up event listeners
  useEffect(() => {
    const contract = getContract()
    if (!contract || !account) return

    const handleRewardDistributed = (user: string) => {
      if (user.toLowerCase() === account.toLowerCase()) {
        loadRewards()
      }
    }

    const handleRewardClaimed = (user: string) => {
      if (user.toLowerCase() === account.toLowerCase()) {
        loadRewards()
      }
    }

    contract.on("RewardDistributed", handleRewardDistributed)
    contract.on("RewardClaimed", handleRewardClaimed)

    return () => {
      contract.off("RewardDistributed", handleRewardDistributed)
      contract.off("RewardClaimed", handleRewardClaimed)
    }
  }, [getContract, account, loadRewards])

  // Load initial data
  useEffect(() => {
    if (provider && account) {
      loadRewards()
    }
  }, [provider, account, loadRewards])

  return {
    pendingRewards,
    balance,
    loading,
    claimReward,
    distributeReward,
    loadRewards,
  }
}
