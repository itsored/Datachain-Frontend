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

interface Dataset {
  id: number
  ipfsHash: string
  price: string
  priceWei: bigint
  seller: string
  active: boolean
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
  const [mockMetadata, setMockMetadata] = useState<any>(null)

  useEffect(() => {
    if (dataset) {
      // Load seller reputation
      getReputation(dataset.seller).then(setSellerReputation)

      // Mock IPFS metadata based on hash
      const mockData = {
        name: `Dataset ${dataset.id}`,
        description: `AI training dataset stored at IPFS hash: ${dataset.ipfsHash}`,
        category: "Computer Vision",
        size: "1.2 GB",
        samples: 10000,
        format: "JSON",
        verified: Math.random() > 0.5,
        tags: ["images", "classification", "labeled"],
      }
      setMockMetadata(mockData)
    }
  }, [dataset, getReputation])

  const handlePurchase = async () => {
    if (!dataset || !account) return

    setPurchasing(true)
    try {
      const price = ethers.parseEther(dataset.price)
      await purchaseDataset(dataset.id, price)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dataset Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {mockMetadata && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {mockMetadata.name}
                  {mockMetadata.verified && <Badge variant="secondary">✓ Verified</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{mockMetadata.description}</p>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Category:</span> {mockMetadata.category}
                  </div>
                  <div>
                    <span className="font-medium">Size:</span> {mockMetadata.size}
                  </div>
                  <div>
                    <span className="font-medium">Samples:</span> {mockMetadata.samples.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Format:</span> {mockMetadata.format}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {mockMetadata.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
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

              {!isOwner && account && (
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

              {isOwner && <div className="text-center text-muted-foreground">You own this dataset</div>}

              {!account && <div className="text-center text-muted-foreground">Connect your wallet to purchase</div>}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
