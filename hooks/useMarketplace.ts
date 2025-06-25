"use client"

import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { useWeb3 } from "./useWeb3"

const MARKETPLACE_ABI = [
  "function datasetCount() view returns (uint256)",
  "function datasets(uint256) view returns (uint256 id, string ipfsHash, uint256 price, address seller, bool active)",
  "function listDataset(string ipfsHash, uint256 price)",
  "function purchaseDataset(uint256 id) payable",
  "function withdraw()",
  "function pendingWithdrawals(address) view returns (uint256)",
  "event DatasetListed(uint256 indexed id, address indexed seller, uint256 price, string ipfsHash)",
  "event DatasetPurchased(uint256 indexed id, address indexed buyer, uint256 price)",
]

interface Dataset {
  id: number
  ipfsHash: string
  price: string
  priceWei: bigint
  seller: string
  active: boolean
}

export function useMarketplace() {
  const { provider, signer, account } = useWeb3()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingWithdrawal, setPendingWithdrawal] = useState("0")

  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS!

  const getContract = useCallback(() => {
    if (!provider || !marketplaceAddress) return null
    return new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer || provider)
  }, [provider, signer, marketplaceAddress])

  const loadDatasets = useCallback(async () => {
    const contract = getContract()
    if (!contract) return

    setLoading(true)
    try {
      const count = await contract.datasetCount()
      const datasetsData: Dataset[] = []

      for (let i = 1; i <= count; i++) {
        const dataset = await contract.datasets(i)
        datasetsData.push({
          id: Number(dataset.id),
          ipfsHash: dataset.ipfsHash,
          price: ethers.formatEther(dataset.price),
          priceWei: dataset.price,
          seller: dataset.seller,
          active: dataset.active,
        })
      }

      setDatasets(datasetsData.filter((d) => d.active))
    } catch (error) {
      console.error("Error loading datasets:", error)
    } finally {
      setLoading(false)
    }
  }, [getContract])

  const loadPendingWithdrawal = useCallback(async () => {
    const contract = getContract()
    if (!contract || !account) return

    try {
      const pending = await contract.pendingWithdrawals(account)
      setPendingWithdrawal(ethers.formatEther(pending))
    } catch (error) {
      console.error("Error loading pending withdrawal:", error)
    }
  }, [getContract, account])

  const listDataset = useCallback(
    async (ipfsHash: string, priceInEth: string) => {
      const contract = getContract()
      if (!contract || !signer) throw new Error("Wallet not connected")

      const price = ethers.parseEther(priceInEth)
      const tx = await contract.listDataset(ipfsHash, price)
      await tx.wait()

      // Reload datasets after listing
      await loadDatasets()
    },
    [getContract, signer, loadDatasets],
  )

  const purchaseDataset = useCallback(
    async (id: number, price: ethers.BigNumberish) => {
      const contract = getContract()
      if (!contract || !signer) throw new Error("Wallet not connected")

      const tx = await contract.purchaseDataset(id, {
        value: price,
      })
      await tx.wait()

      // Reload datasets after purchase
      await loadDatasets()
    },
    [getContract, signer, loadDatasets],
  )

  const withdraw = useCallback(async () => {
    const contract = getContract()
    if (!contract || !signer) throw new Error("Wallet not connected")

    const tx = await contract.withdraw()
    await tx.wait()

    // Reload pending withdrawal after withdraw
    await loadPendingWithdrawal()
  }, [getContract, signer, loadPendingWithdrawal])

  // Set up event listeners
  useEffect(() => {
    const contract = getContract()
    if (!contract) return

    const handleDatasetListed = () => {
      loadDatasets()
    }

    const handleDatasetPurchased = () => {
      loadDatasets()
      loadPendingWithdrawal()
    }

    contract.on("DatasetListed", handleDatasetListed)
    contract.on("DatasetPurchased", handleDatasetPurchased)

    return () => {
      contract.off("DatasetListed", handleDatasetListed)
      contract.off("DatasetPurchased", handleDatasetPurchased)
    }
  }, [getContract, loadDatasets, loadPendingWithdrawal])

  // Load initial data
  useEffect(() => {
    if (provider) {
      loadDatasets()
      loadPendingWithdrawal()
    }
  }, [provider, loadDatasets, loadPendingWithdrawal])

  return {
    datasets,
    loading,
    pendingWithdrawal,
    listDataset,
    purchaseDataset,
    withdraw,
    loadDatasets,
    loadPendingWithdrawal,
  }
}
