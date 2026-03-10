"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useMarketplace, type MarketplaceDataset } from "@/hooks/useMarketplace"
import { useWeb3Context } from "@/components/web3-provider"
import { DatasetDetailModal } from "@/components/dataset-detail-modal"
import { Loader2, Search, Database, Star } from "lucide-react"
import { useReputation, type ReputationSummary } from "@/hooks/useReputation"
import { buildMetadataMap, type MarketplaceMetadata } from "@/lib/marketplace-metadata"

export default function MarketPage() {
  const { isConnected } = useWeb3Context()
  const { allDatasets, loading, paymentSymbol } = useMarketplace()
  const { getReputationSummary } = useReputation()
  const [selectedDataset, setSelectedDataset] = useState<MarketplaceDataset | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [reputations, setReputations] = useState<Record<string, ReputationSummary>>({})
  const [metadataMap, setMetadataMap] = useState<Record<number, MarketplaceMetadata>>({})

  useEffect(() => {
    if (allDatasets.length === 0) {
      setMetadataMap({})
      return
    }

    buildMetadataMap(allDatasets)
      .then(setMetadataMap)
      .catch((error) => {
        console.error("Error loading dataset metadata:", error)
        setMetadataMap({})
      })
  }, [allDatasets])

  useEffect(() => {
    ;(async () => {
      const uniqueSellers = Array.from(new Set(allDatasets.map((dataset) => dataset.seller.toLowerCase())))
      const repEntries = await Promise.all(
        uniqueSellers.map(async (addr) => [addr, await getReputationSummary(addr)] as [string, ReputationSummary]),
      )
      const map: Record<string, ReputationSummary> = {}
      repEntries.forEach(([addr, rep]) => {
        map[addr] = rep
      })
      setReputations(map)
    })()
  }, [allDatasets, getReputationSummary])

  const filteredDatasets = allDatasets.filter((dataset) => {
    const metadata = metadataMap[dataset.id]
    const haystack = [
      metadata?.title || "",
      metadata?.shortDescription || "",
      metadata?.sourcePlatform || "",
      metadata?.license || "",
      dataset.seller,
      ...(metadata?.modality || []),
      ...(metadata?.taskTags || []),
      ...(metadata?.domainTags || []),
    ]
      .join(" ")
      .toLowerCase()

    return haystack.includes(searchTerm.toLowerCase())
  })

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3 md:mb-4">Dataset Marketplace</h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-4 md:mb-6">Discover and purchase high-quality AI training datasets</p>

        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search title, task, license, modality, or seller..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {!isConnected && (
        <Card className="mb-6 md:mb-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm sm:text-base text-muted-foreground mb-4">Connect your wallet to purchase datasets</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" />
          <span className="ml-2 text-sm md:text-base">Loading datasets...</span>
        </div>
      ) : filteredDatasets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Database className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base md:text-lg font-semibold mb-2">No datasets found</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                {searchTerm ? "Try adjusting your search terms" : "Be the first to list a dataset!"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredDatasets.map((dataset) => {
            const metadata = metadataMap[dataset.id]

            return (
              <Card key={dataset.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="text-base md:text-lg truncate">{metadata?.title || `Dataset #${dataset.id}`}</span>
                    {dataset.active ? (
                      <Badge variant="secondary" className="shrink-0">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">Inactive</Badge>
                    )}
                  </CardTitle>
                  {metadata?.shortDescription && (
                    <div className="text-muted-foreground text-xs md:text-sm mt-1 line-clamp-3">{metadata.shortDescription}</div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {metadata?.sourcePlatform && <Badge variant="outline">{metadata.sourcePlatform}</Badge>}
                      {metadata?.license && <Badge variant="outline">{metadata.license}</Badge>}
                      {metadata?.modality.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>

                    {metadata?.taskTags && metadata.taskTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {metadata.taskTags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="text-xs md:text-sm">
                      <span className="text-muted-foreground">Seller:</span>
                      <p className="font-mono text-xs">
                        {dataset.seller.slice(0, 6)}...{dataset.seller.slice(-4)}
                      </p>
                      {reputations[dataset.seller.toLowerCase()] != null && (
                        <div className="flex items-center gap-1 text-amber-500 text-xs mt-1">
                          <Star className="h-3 w-3 fill-amber-500" />
                          {reputations[dataset.seller.toLowerCase()].reputation}/5
                          <span className="text-muted-foreground">
                            ({reputations[dataset.seller.toLowerCase()].verifiedRatings} verified)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs md:text-sm text-muted-foreground">
                      Purchases: {dataset.purchaseCount}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <span className="text-xl md:text-2xl font-bold">{dataset.price} {paymentSymbol}</span>
                    <Button onClick={() => setSelectedDataset(dataset)} size="sm" className="w-full sm:w-auto">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <DatasetDetailModal
        dataset={selectedDataset}
        open={!!selectedDataset}
        onOpenChange={(open) => !open && setSelectedDataset(null)}
      />
    </div>
  )
}
