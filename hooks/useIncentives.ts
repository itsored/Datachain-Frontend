"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ethers } from "ethers"
import { useWeb3Context } from "@/components/web3-provider"

const INCENTIVES_ABI = [
  "function distributeReward(address user, uint256 amount)",
  "function claimReward()",
  "function pendingRewards(address user) view returns (uint256)",
  "function balanceOf(address user) view returns (uint256)",
  "event RewardDistributed(address indexed user, uint256 amount)",
  "event RewardClaimed(address indexed user, uint256 amount)",
]
const TARGET_CHAIN_ID = Number.parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "0", 10)
const IS_LOCALHOST = TARGET_CHAIN_ID === 31337
const DEFAULT_RPC = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"

export function useIncentives() {
  const { signer, account } = useWeb3Context()
  const [pendingRewards, setPendingRewards] = useState("0")
  const [balance, setBalance] = useState("0")
  const [loading, setLoading] = useState(false)

  const incentivesAddress = process.env.NEXT_PUBLIC_INCENTIVES_ADDRESS!
  const readProvider = useMemo(
    () =>
      new ethers.JsonRpcProvider(
        DEFAULT_RPC,
        TARGET_CHAIN_ID ? { chainId: TARGET_CHAIN_ID, name: process.env.NEXT_PUBLIC_NETWORK_NAME || "localhost" } : undefined,
        { staticNetwork: true },
      ),
    [],
  )

  const getReadContract = useCallback(() => {
    if (!incentivesAddress) return null
    return new ethers.Contract(incentivesAddress, INCENTIVES_ABI, readProvider)
  }, [incentivesAddress, readProvider])

  const getWriteContract = useCallback(() => {
    if (!incentivesAddress || !signer) return null
    return new ethers.Contract(incentivesAddress, INCENTIVES_ABI, signer)
  }, [incentivesAddress, signer])

  const loadRewards = useCallback(async () => {
    const contract = getReadContract()
    if (!contract || !account) return

    try {
      const [pending, bal] = await Promise.all([contract.pendingRewards(account), contract.balanceOf(account)])

      setPendingRewards(ethers.formatEther(pending))
      setBalance(ethers.formatEther(bal))
    } catch (error) {
      console.error("Error loading rewards:", error)
    }
  }, [account, getReadContract])

  const claimReward = useCallback(async () => {
    const contract = getWriteContract()
    if (!contract || !signer) throw new Error("Wallet not connected")

    setLoading(true)
    try {
      const tx = await contract.claimReward()
      await tx.wait()
      await loadRewards()
    } finally {
      setLoading(false)
    }
  }, [getWriteContract, signer, loadRewards])

  const distributeReward = useCallback(
    async (userAddress: string, amountInEth: string) => {
      const contract = getWriteContract()
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
    [getWriteContract, signer],
  )

  // Set up event listeners
  useEffect(() => {
    if (IS_LOCALHOST) return

    const contract = getReadContract()
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
  }, [account, getReadContract, loadRewards])

  // Load initial data
  useEffect(() => {
    if (account) {
      loadRewards()
    }
  }, [account, loadRewards])

  return {
    pendingRewards,
    balance,
    loading,
    claimReward,
    distributeReward,
    loadRewards,
  }
}
