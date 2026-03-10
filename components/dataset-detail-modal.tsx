"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMarketplace, type MarketplaceDataset } from "@/hooks/useMarketplace"
import { useReputation, type ReputationSummary } from "@/hooks/useReputation"
import { useWeb3Context } from "./web3-provider"
import { Loader2, Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { RatingModal } from "@/components/rating-modal"
import { fetchMarketplaceMetadata, getIpfsGatewayUrl, type MarketplaceMetadata } from "@/lib/marketplace-metadata"

interface DatasetDetailModalProps {
  dataset: MarketplaceDataset | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DatasetDetailModal({ dataset, open, onOpenChange }: DatasetDetailModalProps) {
  const { account } = useWeb3Context()
  const { purchaseDataset, paymentSymbol } = useMarketplace()
  const { getReputationSummary } = useReputation()
  const { toast } = useToast()

  const [purchasing, setPurchasing] = useState(false)
  const [sellerSummary, setSellerSummary] = useState<ReputationSummary | null>(null)
  const [metadata, setMetadata] = useState<MarketplaceMetadata | null>(null)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)

  const refreshReputation = () => {
    if (dataset) {
      getReputationSummary(dataset.seller).then(setSellerSummary)
    }
  }

  useEffect(() => {
    if (!dataset) return

    getReputationSummary(dataset.seller).then(setSellerSummary)

    ;(async () => {
      try {
        setMetadata(await fetchMarketplaceMetadata(dataset.ipfsHash))
      } catch (err) {
        console.error("Error fetching metadata", err)
        setMetadata(null)
      }
    })()
  }, [dataset, getReputationSummary])

  const handlePurchase = async () => {
    if (!dataset || !account) return

    setPurchasing(true)
    try {
      await purchaseDataset(dataset.id, dataset.priceAmount)
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
  const isBuyer = dataset.hasPurchased
  const canAccess = isOwner || isBuyer

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Dataset Details</DialogTitle>
          <DialogDescription>Review the listing metadata, verified seller reputation, and purchase access details.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          {metadata && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span className="pr-4">{metadata.title || `Dataset #${dataset.id}`}</span>
                  <div className="flex items-center gap-2">
                    {metadata.license && <Badge variant="outline">{metadata.license}</Badge>}
                    {metadata.licenseVerified && <Badge variant="secondary">Verified</Badge>}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metadata.shortDescription && <p className="text-muted-foreground">{metadata.shortDescription}</p>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                  {metadata.sourcePlatform && (
                    <div>
                      <span className="font-medium">Source Platform:</span> {metadata.sourcePlatform}
                    </div>
                  )}
                  {metadata.sizeInfo && (
                    <div>
                      <span className="font-medium">Size / Scale:</span> {metadata.sizeInfo}
                    </div>
                  )}
                  {metadata.maintainerName && (
                    <div>
                      <span className="font-medium">Maintainer:</span> {metadata.maintainerName}
                    </div>
                  )}
                  {metadata.provenanceConfidence != null && (
                    <div>
                      <span className="font-medium">Provenance Confidence:</span> {metadata.provenanceConfidence}/100
                    </div>
                  )}
                  {metadata.redistributionConfidence != null && (
                    <div>
                      <span className="font-medium">Redistribution Confidence:</span> {metadata.redistributionConfidence}/100
                    </div>
                  )}
                </div>

                {metadata.modality.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Modality</div>
                    <div className="flex flex-wrap gap-1">
                      {metadata.modality.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {metadata.taskTags.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tasks</div>
                    <div className="flex flex-wrap gap-1">
                      {metadata.taskTags.slice(0, 8).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {metadata.domainTags.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Domains</div>
                    <div className="flex flex-wrap gap-1">
                      {metadata.domainTags.slice(0, 6).map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {metadata.licenseNotes && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">License notes:</span> {metadata.licenseNotes}
                  </div>
                )}

                {metadata.fileFormats.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Formats:</span> {metadata.fileFormats.join(", ")}
                  </div>
                )}

                {metadata.qualitySignals.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {metadata.qualitySignals.slice(0, 6).map((tag) => (
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
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs md:text-sm text-muted-foreground">Address:</span>
                <span className="font-mono text-xs md:text-sm break-all">
                  {dataset.seller.slice(0, 6)}...{dataset.seller.slice(-4)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs md:text-sm text-muted-foreground">Reputation:</span>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 md:h-4 md:w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs md:text-sm">{sellerSummary?.reputation ?? 0}/5</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs md:text-sm text-muted-foreground">
                <div>Verified ratings: {sellerSummary?.verifiedRatings ?? 0}</div>
                <div>Total reviews: {sellerSummary?.totalRatings ?? 0}</div>
                <div>Positive: {sellerSummary?.positiveRatings ?? 0}</div>
                <div>Neutral: {sellerSummary?.neutralRatings ?? 0}</div>
                <div>Negative: {sellerSummary?.negativeRatings ?? 0}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchase Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-base md:text-lg">
                <span>Price:</span>
                <span className="font-bold">{dataset.price} {paymentSymbol}</span>
              </div>

              <div className="text-xs md:text-sm text-muted-foreground">
                <p className="break-all">
                  IPFS Hash: <code className="bg-muted px-1 rounded break-all">{dataset.ipfsHash}</code>
                </p>
              </div>

              <div className="text-xs md:text-sm text-muted-foreground">
                Purchases recorded onchain: {dataset.purchaseCount}
              </div>

              {!isOwner && dataset.active && !isBuyer && account && (
                <Button onClick={handlePurchase} disabled={purchasing} className="w-full">
                  {purchasing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Approve and purchase...
                    </>
                  ) : (
                    `Purchase for ${dataset.price} ${paymentSymbol}`
                  )}
                </Button>
              )}

              {canAccess && metadata?.sourceUrl && (
                <Button asChild variant="secondary" className="w-full">
                  <a href={metadata.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Open Source Listing
                  </a>
                </Button>
              )}

              {canAccess && metadata?.datasetHomepage && (
                <Button asChild variant="outline" className="w-full">
                  <a href={metadata.datasetHomepage} target="_blank" rel="noopener noreferrer">
                    Open Dataset Homepage
                  </a>
                </Button>
              )}

              {canAccess && metadata?.repoUrl && (
                <Button asChild variant="outline" className="w-full">
                  <a href={metadata.repoUrl} target="_blank" rel="noopener noreferrer">
                    Open Repository
                  </a>
                </Button>
              )}

              {metadata?.fileCid && canAccess && (
                <Button asChild variant="secondary" className="w-full">
                  <a href={getIpfsGatewayUrl(metadata.fileCid)} target="_blank" rel="noopener noreferrer">
                    Download Dataset
                  </a>
                </Button>
              )}

              {canAccess && metadata?.unlockType === "metadata_and_source_link" && !metadata.sourceUrl && !metadata.datasetHomepage && (
                <div className="text-center text-muted-foreground">No external source link was attached to this listing.</div>
              )}

              {canAccess && metadata?.fileCid && (
                <div className="text-center text-muted-foreground">Purchased dataset ready for download</div>
              )}

              {isBuyer && (
                <Button variant="secondary" className="w-full" onClick={() => setRatingModalOpen(true)}>
                  Rate Seller
                </Button>
              )}

              {!dataset.active && !isOwner && !isBuyer && (
                <div className="text-center text-muted-foreground">Listing is currently inactive.</div>
              )}

              {isOwner && <div className="text-center text-muted-foreground">You own this dataset</div>}

              {!account && <div className="text-center text-muted-foreground">Connect your wallet to purchase</div>}
            </CardContent>
          </Card>
        </div>

        <RatingModal
          sellerAddress={dataset.seller}
          datasetId={dataset.id}
          open={ratingModalOpen}
          onOpenChange={setRatingModalOpen}
          onRated={refreshReputation}
        />
      </DialogContent>
    </Dialog>
  )
}
