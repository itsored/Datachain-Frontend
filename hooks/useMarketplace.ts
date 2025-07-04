"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { ethers } from "ethers"
import { useWeb3 } from "./useWeb3"

// Use local RPC by default to support development environments
const DEFAULT_RPC = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"


const MARKETPLACE_ABI = [
  "function datasetCount() view returns (uint256)",
  "function datasets(uint256) view returns (address seller, string ipfsHash, uint256 price, address buyer)",
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
  buyer: string
}

export function useMarketplace() {
  const { provider, signer, account } = useWeb3()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [allDatasets, setAllDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingWithdrawal, setPendingWithdrawal] = useState("0")

  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS!
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(marketplaceAddress)

  // Memoised read-only provider to avoid recreating each render
  const readProvider = useMemo(() => new ethers.JsonRpcProvider(DEFAULT_RPC), [])

  // Track whether contract code is present at the configured address to avoid BAD_DATA decode errors
  const codeCheckedRef = useRef<boolean>(false)
  const isDeployedRef = useRef<boolean>(true)

  useEffect(() => {
    ;(async () => {
      if (!isValidAddress) return
      try {
        const code = await readProvider.getCode(marketplaceAddress)
        if (code === "0x") {
          console.warn("Marketplace contract not deployed at", marketplaceAddress)
          isDeployedRef.current = false
        }
      } catch (err) {
        console.error("Error checking marketplace contract code:", err)
        isDeployedRef.current = false
      } finally {
        codeCheckedRef.current = true
      }
    })()
  }, [readProvider, marketplaceAddress, isValidAddress])

  const getContract = useCallback(() => {
    if (!isValidAddress) return null
    if (codeCheckedRef.current && !isDeployedRef.current) return null
    return new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, readProvider)
  }, [readProvider, marketplaceAddress, isValidAddress])

  const loadDatasets = useCallback(async () => {
    const contract = getContract()
    if (!contract) return

    setLoading(true)
    try {
      const count = await contract.datasetCount()
      const total = Number(count)
      const datasetsData: Dataset[] = []

      for (let i = 1; i <= total; i++) {
        const dataset = await contract.datasets(i)
        datasetsData.push({
          id: i,
          ipfsHash: dataset.ipfsHash,
          price: ethers.formatEther(dataset.price),
          priceWei: dataset.price,
          seller: dataset.seller,
          buyer: dataset.buyer,
        })
      }

      setAllDatasets(datasetsData)
      setDatasets(datasetsData.filter((d) => d.buyer === ethers.ZeroAddress))
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
      if (!contract) throw new Error("Marketplace contract not configured")
      if (!signer) throw new Error("Wallet not connected")

      const writeContract = contract.connect(signer) as any
      const price = ethers.parseEther(priceInEth)

      let gasLimit: bigint | undefined
      try {
        const est = await writeContract.getFunction("listDataset").estimateGas(ipfsHash, price)
        gasLimit = (est * BigInt(12)) / BigInt(10)
      } catch (_) {}

      // Static call for revert reason
      try {
        await writeContract.getFunction("listDataset").staticCall(ipfsHash, price)
      } catch (simError: any) {
        throw new Error(simError?.reason || simError?.message || "listDataset reverted")
      }

      const tx = await writeContract.getFunction("listDataset").send(ipfsHash, price, gasLimit ? { gasLimit } : {})
      await tx.wait()

      // Reload datasets after listing
      await loadDatasets()
    },
    [getContract, signer, loadDatasets],
  )

  const purchaseDataset = useCallback(
    async (id: number, price: ethers.BigNumberish) => {
      const contract = getContract()
      if (!contract) throw new Error("Marketplace contract not configured")
      if (!signer) throw new Error("Wallet not connected")

      const writeContract = contract.connect(signer) as any
      const tx = await writeContract.purchaseDataset(id, {
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
    if (!contract) throw new Error("Marketplace contract not configured")
    if (!signer) throw new Error("Wallet not connected")

    const writeContract = contract.connect(signer) as any
    const tx = await writeContract.withdraw()
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
    loadDatasets()
  }, [provider, loadDatasets])

  useEffect(() => {
    if (provider && account) {
      loadPendingWithdrawal()
    }
  }, [provider, account, loadPendingWithdrawal])

  return {
    datasets,
    allDatasets,
    loading,
    pendingWithdrawal,
    listDataset,
    purchaseDataset,
    withdraw,
    loadDatasets,
    loadPendingWithdrawal,
  }
}
