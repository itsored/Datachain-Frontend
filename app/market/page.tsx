"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useMarketplace } from "@/hooks/useMarketplace"
import { useWeb3Context } from "@/components/web3-provider"
import { DatasetDetailModal } from "@/components/dataset-detail-modal"
import { Loader2, Search, Database } from "lucide-react"

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
  const { datasets, loading } = useMarketplace()
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredDatasets = datasets.filter(
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
                  <span>Dataset #{dataset.id}</span>
                  <Badge variant="secondary">Active</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">IPFS Hash:</span>
                    <p className="font-mono text-xs bg-muted p-1 rounded mt-1">{dataset.ipfsHash}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Seller:</span>
                    <p className="font-mono text-xs">
                      {dataset.seller.slice(0, 6)}...{dataset.seller.slice(-4)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{dataset.price} ETH</span>
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
