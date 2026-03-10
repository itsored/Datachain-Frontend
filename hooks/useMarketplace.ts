"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { ethers } from "ethers"
import { useWeb3Context } from "@/components/web3-provider"

const DEFAULT_RPC = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"
const DEPLOYMENT_BLOCK = Number.parseInt(process.env.NEXT_PUBLIC_MARKETPLACE_DEPLOYMENT_BLOCK || "0", 10)
const TARGET_CHAIN_ID = Number.parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "0", 10)
const LOCAL_SEED_MANIFEST_PATH = "/local-seed-listings.json"
const IS_LOCALHOST = TARGET_CHAIN_ID === 31337
const PAYMENT_DECIMALS = 6
const PAYMENT_SYMBOL = "dcUSDC"
const PAYMENT_TOKEN_ADDRESS_FROM_ENV = process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS || null
const MARKETPLACE_ABI = [
  "function paymentToken() view returns (address)",
  "function datasetCount() view returns (uint256)",
  "function datasets(uint256) view returns (address seller, string ipfsHash, uint256 price, bool active, uint256 purchaseCount)",
  "function hasPurchased(uint256 id, address buyer) view returns (bool)",
  "function listDataset(string ipfsHash, uint256 price)",
  "function purchaseDataset(uint256 id)",
  "function withdraw()",
  "function pendingWithdrawals(address) view returns (uint256)",
  "event DatasetListed(uint256 indexed id, address indexed seller, uint256 price, string ipfsHash)",
  "event DatasetPurchased(uint256 indexed id, address indexed buyer, address indexed seller, uint256 price)",
]
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function faucet()",
]

export interface MarketplaceDataset {
  id: number
  ipfsHash: string
  price: string
  priceAmount: bigint
  seller: string
  active: boolean
  purchaseCount: number
  hasPurchased: boolean
}

export interface PurchaseRecord {
  datasetId: number
  seller: string
  price: string
  priceAmount: bigint
  txHash: string
  blockNumber: number
}

interface LocalSeedListing {
  listing_id: number
  seller: string
  price: string
  ipfs_cid: string
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback

  const maybeError = error as {
    shortMessage?: string
    reason?: string
    message?: string
    info?: { error?: { message?: string } }
  }

  return (
    maybeError.shortMessage ||
    maybeError.reason ||
    maybeError.info?.error?.message ||
    maybeError.message ||
    fallback
  )
}

export function useMarketplace() {
  const { provider, signer, account } = useWeb3Context()
  const [datasets, setDatasets] = useState<MarketplaceDataset[]>([])
  const [allDatasets, setAllDatasets] = useState<MarketplaceDataset[]>([])
  const [purchasedDatasets, setPurchasedDatasets] = useState<PurchaseRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingWithdrawal, setPendingWithdrawal] = useState("0")
  const [paymentBalance, setPaymentBalance] = useState("0")
  const [paymentTokenAddress, setPaymentTokenAddress] = useState<string | null>(null)

  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS!
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(marketplaceAddress)
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
  }, [isValidAddress, marketplaceAddress, readProvider])

  const getContract = useCallback(() => {
    if (!isValidAddress) return null
    if (codeCheckedRef.current && !isDeployedRef.current) return null
    return new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, readProvider)
  }, [isValidAddress, marketplaceAddress, readProvider])

  const resolvePaymentTokenAddress = useCallback(async () => {
    if (PAYMENT_TOKEN_ADDRESS_FROM_ENV) {
      setPaymentTokenAddress(PAYMENT_TOKEN_ADDRESS_FROM_ENV)
      return PAYMENT_TOKEN_ADDRESS_FROM_ENV
    }

    const contract = getContract()
    if (!contract) return null
    const tokenAddress = await contract.paymentToken()
    setPaymentTokenAddress(tokenAddress)
    return tokenAddress as string
  }, [getContract])

  const loadLocalSeedDatasets = useCallback(async (): Promise<MarketplaceDataset[]> => {
    const res = await fetch(LOCAL_SEED_MANIFEST_PATH, { cache: "no-store" })
    if (!res.ok) {
      throw new Error(`Failed to load local seed manifest: ${res.status}`)
    }

    const listings = (await res.json()) as LocalSeedListing[]
    const purchasedIds = new Set(purchasedDatasets.map((purchase) => purchase.datasetId))

    return listings.map((listing) => ({
      id: listing.listing_id,
      ipfsHash: listing.ipfs_cid,
      price: listing.price,
      priceAmount: ethers.parseUnits(listing.price, PAYMENT_DECIMALS),
      seller: listing.seller,
      active: true,
      purchaseCount: 0,
      hasPurchased: purchasedIds.has(listing.listing_id),
    }))
  }, [purchasedDatasets])

  const loadDatasets = useCallback(async () => {
    if (IS_LOCALHOST) {
      setLoading(true)
      try {
        const localDatasets = await loadLocalSeedDatasets()
        setAllDatasets(localDatasets)
        setDatasets(localDatasets.filter((dataset) => dataset.active))
        return localDatasets
      } catch (error) {
        console.warn("Falling back to onchain dataset reads after local seed manifest failure:", error)
      } finally {
        setLoading(false)
      }
    }

    const contract = getContract()
    if (!contract) return []

    setLoading(true)
    try {
      const total = Number(await contract.datasetCount())
      const datasetList: MarketplaceDataset[] = []

      // The local fork still reaches back to the upstream Polygon RPC for uncached state.
      // Sequential reads avoid spiking the fork with 100+ concurrent eth_call requests.
      for (let id = 1; id <= total; id += 1) {
        try {
          const dataset = await contract.datasets(id)
          if (!dataset || dataset.seller === ethers.ZeroAddress) continue

          let hasPurchased = false
          if (account) {
            hasPurchased = await contract.hasPurchased(id, account)
          }

          datasetList.push({
            id,
            ipfsHash: dataset.ipfsHash,
            price: ethers.formatUnits(dataset.price, PAYMENT_DECIMALS),
            priceAmount: dataset.price,
            seller: dataset.seller,
            active: dataset.active,
            purchaseCount: Number(dataset.purchaseCount),
            hasPurchased,
          })
        } catch (err) {
          console.warn(`Failed to fetch dataset at index ${id}:`, err)
        }
      }

      setAllDatasets(datasetList)
      setDatasets(datasetList.filter((dataset) => dataset.active))
      return datasetList
    } catch (error) {
      console.error("Error loading datasets:", error)
      return []
    } finally {
      setLoading(false)
    }
  }, [account, getContract, loadLocalSeedDatasets])

  const loadPendingWithdrawal = useCallback(async () => {
    const contract = getContract()
    if (!contract || !account) return

    try {
      const pending = await contract.pendingWithdrawals(account)
      setPendingWithdrawal(ethers.formatUnits(pending, PAYMENT_DECIMALS))
    } catch (error) {
      console.error("Error loading pending withdrawal:", error)
    }
  }, [account, getContract])

  const loadPaymentBalance = useCallback(async () => {
    const contract = getContract()
    if (!contract || !account) return

    try {
      const tokenAddress = paymentTokenAddress || (await resolvePaymentTokenAddress())
      if (!tokenAddress) return
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, readProvider)
      const balance = await token.balanceOf(account)
      setPaymentBalance(ethers.formatUnits(balance, PAYMENT_DECIMALS))
    } catch (error) {
      console.error("Error loading payment balance:", error)
    }
  }, [account, getContract, paymentTokenAddress, readProvider, resolvePaymentTokenAddress])

  const loadPurchaseHistory = useCallback(async () => {
    const contract = getContract()
    if (!contract || !account) {
      setPurchasedDatasets([])
      return
    }

    try {
      const logs = await contract.queryFilter(contract.filters.DatasetPurchased(null, account, null), DEPLOYMENT_BLOCK, "latest")
      const purchases = logs
        .map((log) => {
          if (!("args" in log)) return null
          const args = log.args
          if (!args) return null
          return {
            datasetId: Number(args.id),
            seller: args.seller,
            price: ethers.formatUnits(args.price, PAYMENT_DECIMALS),
            priceAmount: args.price,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          } satisfies PurchaseRecord
        })
        .filter((purchase): purchase is PurchaseRecord => purchase !== null)
        .sort((left, right) => right.blockNumber - left.blockNumber)

      setPurchasedDatasets(purchases)
    } catch (error) {
      console.error("Error loading purchase history:", error)
    }
  }, [account, getContract])

  const listDataset = useCallback(
    async (ipfsHash: string, priceInUsdc: string) => {
      const contract = getContract()
      if (!contract) throw new Error("Marketplace contract not configured")
      if (!signer) throw new Error("Wallet not connected")

      const writeContract = contract.connect(signer) as any
      const price = ethers.parseUnits(priceInUsdc, PAYMENT_DECIMALS)
      let gasLimit: bigint | undefined

      try {
        const est = await writeContract.getFunction("listDataset").estimateGas(ipfsHash, price)
        gasLimit = (est * BigInt(12)) / BigInt(10)
      } catch (_) {}

      try {
        await writeContract.getFunction("listDataset").staticCall(ipfsHash, price)
      } catch (simError: any) {
        throw new Error(simError?.reason || simError?.message || "listDataset reverted")
      }

      const tx = await writeContract.getFunction("listDataset").send(ipfsHash, price, gasLimit ? { gasLimit } : {})
      await tx.wait()
      await Promise.all([loadDatasets(), loadPendingWithdrawal()])
    },
    [getContract, loadDatasets, loadPendingWithdrawal, signer],
  )

  const purchaseDataset = useCallback(
    async (id: number, price: ethers.BigNumberish) => {
      const contract = getContract()
      if (!contract) throw new Error("Marketplace contract not configured")
      if (!signer) throw new Error("Wallet not connected")
      if (!account) throw new Error("Wallet account unavailable")

      const localDataset = allDatasets.find((dataset) => dataset.id === id)
      if (localDataset?.seller.toLowerCase() === account.toLowerCase()) {
        throw new Error("Switch to a buyer wallet to purchase another seller's listing")
      }
      if (localDataset && !localDataset.active) {
        throw new Error("This dataset is not currently active")
      }
      if (localDataset?.hasPurchased) {
        throw new Error("You already purchased this dataset")
      }

      const tokenAddress = paymentTokenAddress || (await resolvePaymentTokenAddress())
      if (!tokenAddress) throw new Error("Payment token not configured")

      const writeContract = contract.connect(signer) as any
      const paymentTokenWrite = new ethers.Contract(tokenAddress, ERC20_ABI, signer) as any
      const required = BigInt(price.toString())

      if (IS_LOCALHOST) {
        const approveTx = await signer.sendTransaction({
          to: tokenAddress,
          data: paymentTokenWrite.interface.encodeFunctionData("approve", [marketplaceAddress, required]),
          gasLimit: 100_000n,
        })
        await approveTx.wait()
        const purchaseTx = await signer.sendTransaction({
          to: marketplaceAddress,
          data: writeContract.interface.encodeFunctionData("purchaseDataset", [id]),
          gasLimit: 250_000n,
        })
        await purchaseTx.wait()
      } else {
        const paymentTokenRead = new ethers.Contract(tokenAddress, ERC20_ABI, readProvider) as any
        const allowance = await paymentTokenRead.allowance(account, marketplaceAddress)

        if (allowance < required) {
          const approveTx = await paymentTokenWrite.approve(marketplaceAddress, required)
          await approveTx.wait()
        }

        try {
          await writeContract.getFunction("purchaseDataset").staticCall(id)
        } catch (error) {
          throw new Error(getErrorMessage(error, "Purchase would revert"))
        }

        let tx
        try {
          tx = await writeContract.purchaseDataset(id)
        } catch (error) {
          throw new Error(getErrorMessage(error, "Failed to submit purchase transaction"))
        }

        await tx.wait()
      }
      await Promise.all([loadDatasets(), loadPendingWithdrawal(), loadPurchaseHistory(), loadPaymentBalance()])
    },
    [
      allDatasets,
      account,
      getContract,
      loadDatasets,
      loadPaymentBalance,
      loadPendingWithdrawal,
      loadPurchaseHistory,
      marketplaceAddress,
      paymentTokenAddress,
      resolvePaymentTokenAddress,
      signer,
    ],
  )

  const withdraw = useCallback(async () => {
    const contract = getContract()
    if (!contract) throw new Error("Marketplace contract not configured")
    if (!signer) throw new Error("Wallet not connected")

    const writeContract = contract.connect(signer) as any
    const tx = await writeContract.withdraw()
    await tx.wait()
    await Promise.all([loadPendingWithdrawal(), loadPaymentBalance()])
  }, [getContract, loadPaymentBalance, loadPendingWithdrawal, signer])

  const claimPaymentFaucet = useCallback(async () => {
    const contract = getContract()
    if (!contract) throw new Error("Marketplace contract not configured")
    if (!signer) throw new Error("Wallet not connected")

    const tokenAddress = paymentTokenAddress || (await resolvePaymentTokenAddress())
    if (!tokenAddress) throw new Error("Payment token not configured")

    const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer) as any
    const tx = await token.faucet()
    await tx.wait()
    await loadPaymentBalance()
  }, [getContract, loadPaymentBalance, paymentTokenAddress, resolvePaymentTokenAddress, signer])

  useEffect(() => {
    if (IS_LOCALHOST) return

    const contract = getContract()
    if (!contract) return

    const handleDatasetListed = () => {
      loadDatasets()
    }

    const handleDatasetPurchased = () => {
      loadDatasets()
      loadPendingWithdrawal()
      loadPurchaseHistory()
      loadPaymentBalance()
    }

    contract.on("DatasetListed", handleDatasetListed)
    contract.on("DatasetPurchased", handleDatasetPurchased)

    return () => {
      contract.off("DatasetListed", handleDatasetListed)
      contract.off("DatasetPurchased", handleDatasetPurchased)
    }
  }, [getContract, loadDatasets, loadPaymentBalance, loadPendingWithdrawal, loadPurchaseHistory])

  useEffect(() => {
    loadDatasets()
  }, [provider, loadDatasets])

  useEffect(() => {
    if (provider && account) {
      loadPendingWithdrawal()
      loadPurchaseHistory()
      loadPaymentBalance()
    }
  }, [provider, account, loadPaymentBalance, loadPendingWithdrawal, loadPurchaseHistory])

  useEffect(() => {
    if (!IS_LOCALHOST || purchasedDatasets.length === 0) return

    const purchasedIds = new Set(purchasedDatasets.map((purchase) => purchase.datasetId))
    setAllDatasets((prev) =>
      prev.map((dataset) =>
        purchasedIds.has(dataset.id)
          ? { ...dataset, hasPurchased: true }
          : dataset,
      ),
    )
    setDatasets((prev) =>
      prev.map((dataset) =>
        purchasedIds.has(dataset.id)
          ? { ...dataset, hasPurchased: true }
          : dataset,
      ),
    )
  }, [purchasedDatasets])

  useEffect(() => {
    resolvePaymentTokenAddress().catch((error) => {
      console.error("Error resolving payment token address:", error)
    })
  }, [resolvePaymentTokenAddress])

  return {
    datasets,
    allDatasets,
    purchasedDatasets,
    loading,
    pendingWithdrawal,
    paymentBalance,
    paymentSymbol: PAYMENT_SYMBOL,
    listDataset,
    purchaseDataset,
    withdraw,
    claimPaymentFaucet,
    loadDatasets,
    loadPendingWithdrawal,
    loadPurchaseHistory,
  }
}
