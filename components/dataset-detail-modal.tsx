"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMarketplace } from "@/hooks/useMarketplace"
import { useReputation } from "@/hooks/useReputation"
import { useWeb3Context } from "./web3-provider"
import { Loader2, Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { RatingModal } from "@/components/rating-modal"

interface Dataset {
  id: number
  ipfsHash: string
  price: string
  priceWei: bigint
  seller: string
  buyer: string
}

interface DatasetDetailModalProps {
  dataset: Dataset | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DatasetDetailModal({ dataset, open, onOpenChange }: DatasetDetailModalProps) {
  const { account } = useWeb3Context()
  const { purchaseDataset } = useMarketplace()
  const { getReputation } = useReputation()
  const { toast } = useToast()

  const [purchasing, setPurchasing] = useState(false)
  const [sellerReputation, setSellerReputation] = useState(0)
  const [metadata, setMetadata] = useState<any>(null)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)

  const refreshReputation = () => {
    if (dataset) {
      getReputation(dataset.seller).then(setSellerReputation)
    }
  }

  useEffect(() => {
    if (!dataset) return

    // Load seller reputation
    getReputation(dataset.seller).then(setSellerReputation)

    // Fetch real metadata JSON from IPFS
    ;(async () => {
      try {
        const res = await fetch(`https://gateway.pinata.cloud/ipfs/${dataset.ipfsHash}`)
        if (!res.ok) throw new Error("Failed to fetch metadata")
        const json = await res.json()
        setMetadata(json)
      } catch (err) {
        console.error("Error fetching metadata", err)
        setMetadata(null)
      }
    })()
  }, [dataset, getReputation])

  const handlePurchase = async () => {
    if (!dataset || !account) return

    setPurchasing(true)
    try {
      await purchaseDataset(dataset.id, dataset.priceWei)
      toast({
        title: "Purchase Successful",
        description: "Dataset purchased successfully!",
      })
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase dataset",
        variant: "destructive",
      })
    } finally {
      setPurchasing(false)
    }
  }

  if (!dataset) return null

  const isOwner = account?.toLowerCase() === dataset.seller.toLowerCase()
  const isBuyer = dataset.buyer.toLowerCase() === account?.toLowerCase()
  const isSold = dataset.buyer !== ethers.ZeroAddress

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dataset Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {metadata && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {metadata.name || `Dataset #${dataset.id}`}
                  {metadata.verified && <Badge variant="secondary">✓ Verified</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metadata.description && <p className="text-muted-foreground">{metadata.description}</p>}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {metadata.category && (
                    <div>
                      <span className="font-medium">Category:</span> {metadata.category}
                    </div>
                  )}
                  {metadata.size && (
                    <div>
                      <span className="font-medium">Size:</span> {metadata.size}
                    </div>
                  )}
                  {metadata.samples && (
                    <div>
                      <span className="font-medium">Samples:</span> {metadata.samples.toLocaleString()}
                    </div>
                  )}
                  {metadata.format && (
                    <div>
                      <span className="font-medium">Format:</span> {metadata.format}
                    </div>
                  )}
                </div>

                {metadata.tags && Array.isArray(metadata.tags) && (
                  <div className="flex flex-wrap gap-1">
                    {metadata.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Seller Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Address:</span>
                <span className="font-mono text-sm">
                  {dataset.seller.slice(0, 6)}...{dataset.seller.slice(-4)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Reputation:</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm">{sellerReputation}/5</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchase Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-lg">
                <span>Price:</span>
                <span className="font-bold">{dataset.price} ETH</span>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  IPFS Hash: <code className="bg-muted px-1 rounded">{dataset.ipfsHash}</code>
                </p>
              </div>

              {!isOwner && !isSold && account && (
                <Button onClick={handlePurchase} disabled={purchasing} className="w-full">
                  {purchasing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Purchasing...
                    </>
                  ) : (
                    `Purchase for ${dataset.price} ETH`
                  )}
                </Button>
              )}

              {metadata?.fileCid && (isBuyer || isOwner) && (
                <Button asChild variant="secondary" className="w-full">
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${metadata.fileCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download Dataset
                  </a>
                </Button>
              )}

              {isSold && isBuyer && metadata?.fileCid == null && (
                <div className="text-center text-muted-foreground">Seller did not attach file</div>
              )}

              {isSold && isBuyer && metadata?.fileCid && (
                <div className="text-center text-muted-foreground">Purchased dataset ready for download</div>
              )}

              {isSold && isBuyer && (
                <Button variant="secondary" className="w-full" onClick={() => setRatingModalOpen(true)}>
                  Rate Seller
                </Button>
              )}

              {isSold && !isOwner && !isBuyer && (
                <div className="text-center text-muted-foreground">Dataset already sold</div>
              )}

              {isOwner && <div className="text-center text-muted-foreground">You own this dataset</div>}

              {!account && <div className="text-center text-muted-foreground">Connect your wallet to purchase</div>}
            </CardContent>
          </Card>
        </div>

        <RatingModal
          sellerAddress={dataset.seller}
          open={ratingModalOpen}
          onOpenChange={setRatingModalOpen}
          onRated={refreshReputation}
        />
      </DialogContent>
    </Dialog>
  )
}
