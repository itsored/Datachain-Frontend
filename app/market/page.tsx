"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useMarketplace } from "@/hooks/useMarketplace"
import { useWeb3Context } from "@/components/web3-provider"
import { DatasetDetailModal } from "@/components/dataset-detail-modal"
import { Loader2, Search, Database, Star } from "lucide-react"
import { useReputation } from "@/hooks/useReputation"

interface Dataset {
  id: number
  ipfsHash: string
  price: string
  priceWei: bigint
  seller: string
  buyer: string
}

export default function MarketPage() {
  const { isConnected } = useWeb3Context()
  const { allDatasets, loading } = useMarketplace()
  const { getReputation } = useReputation()
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [reputations, setReputations] = useState<Record<string, number>>({})
  const [datasetNames, setDatasetNames] = useState<Record<number, string>>({})
  const [datasetDescriptions, setDatasetDescriptions] = useState<Record<number, string>>({})

  // Fetch dataset names and descriptions from IPFS metadata
  useEffect(() => {
    const fetchNamesAndDescriptions = async () => {
      const entries = await Promise.all(
        allDatasets.map(async (dataset) => {
          try {
            const res = await fetch(`https://gateway.pinata.cloud/ipfs/${dataset.ipfsHash}`)
            if (!res.ok) throw new Error("Failed to fetch metadata")
            const json = await res.json()
            return [dataset.id, json.name, json.description] as [number, string, string]
          } catch {
            return [dataset.id, undefined, undefined] as [number, string | undefined, string | undefined]
          }
        })
      )
      const nameMap: Record<number, string> = {}
      const descMap: Record<number, string> = {}
      entries.forEach(([id, name, desc]) => {
        if (name) nameMap[id] = name
        if (desc) descMap[id] = desc
      })
      setDatasetNames(nameMap)
      setDatasetDescriptions(descMap)
    }
    if (allDatasets.length > 0) fetchNamesAndDescriptions()
  }, [allDatasets])

  // load reputations once datasets fetched
  useEffect(() => {
    ;(async () => {
      const uniqueSellers = Array.from(new Set(allDatasets.map((d) => d.seller.toLowerCase())))
      const repEntries = await Promise.all(
        uniqueSellers.map(async (addr) => [addr, await getReputation(addr)] as [string, number]),
      )
      const map: Record<string, number> = {}
      repEntries.forEach(([addr, rep]) => (map[addr] = rep))
      setReputations(map)
    })()
  }, [allDatasets, getReputation])

  const filteredDatasets = allDatasets.filter(
    (dataset) =>
      dataset.ipfsHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dataset.seller.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Dataset Marketplace</h1>
        <p className="text-muted-foreground mb-6">Discover and purchase high-quality AI training datasets</p>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search datasets or sellers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {!isConnected && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Connect your wallet to purchase datasets</p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading datasets...</span>
        </div>
      ) : filteredDatasets.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No datasets found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try adjusting your search terms" : "Be the first to list a dataset!"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDatasets.map((dataset) => (
            <Card key={dataset.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{datasetNames[dataset.id] || `Dataset #${dataset.id}`}</span>
                  {dataset.buyer === "0x0000000000000000000000000000000000000000" ? (
                    <Badge variant="secondary">Active</Badge>
                  ) : (
                    <Badge variant="outline">Sold</Badge>
                  )}
                </CardTitle>
                {datasetDescriptions[dataset.id] && (
                  <div className="text-muted-foreground text-sm mt-1 line-clamp-2">{datasetDescriptions[dataset.id]}</div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">IPFS Hash:</span>
                    <p className="font-mono text-xs bg-muted p-1 rounded mt-1 break-all max-w-full truncate" title={dataset.ipfsHash}>
                      {dataset.ipfsHash}
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Seller:</span>
                    <p className="font-mono text-xs">
                      {dataset.seller.slice(0, 6)}...{dataset.seller.slice(-4)}
                    </p>
                    {reputations[dataset.seller.toLowerCase()] != null && (
                      <div className="flex items-center gap-1 text-amber-500 text-xs mt-1">
                        <Star className="h-3 w-3 fill-amber-500" />
                        {reputations[dataset.seller.toLowerCase()]}/5
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{dataset.price} POL</span>
                  <Button onClick={() => setSelectedDataset(dataset)}>View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
