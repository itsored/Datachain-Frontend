"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useMarketplace } from "@/hooks/useMarketplace"
import { useWeb3Context } from "@/components/web3-provider"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload } from "lucide-react"

export default function ListDatasetPage() {
  const { isConnected, account } = useWeb3Context()
  const { listDataset } = useMarketplace()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    size: "",
    samples: "",
    format: "",
    tags: "",
    price: "",
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected || !account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to list a dataset",
        variant: "destructive",
      })
      return
    }

    if (!formData.name || !formData.description || !formData.price) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Create mock IPFS hash based on form data
      const metadata = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        size: formData.size,
        samples: Number.parseInt(formData.samples) || 0,
        format: formData.format,
        tags: formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        timestamp: Date.now(),
        seller: account,
      }

      // In a real app, this would upload to IPFS
      const mockIpfsHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

      await listDataset(mockIpfsHash, formData.price)

      toast({
        title: "Dataset Listed Successfully",
        description: "Your dataset is now available in the marketplace!",
      })

      // Reset form
      setFormData({
        name: "",
        description: "",
        category: "",
        size: "",
        samples: "",
        format: "",
        tags: "",
        price: "",
      })
    } catch (error: any) {
      toast({
        title: "Listing Failed",
        description: error.message || "Failed to list dataset",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-muted-foreground">
                You need to connect your wallet to list datasets on the marketplace.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">List Your Dataset</h1>
        <p className="text-muted-foreground">Share your AI training data with the community and earn rewards</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Dataset Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Dataset Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Computer Vision Dataset"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your dataset, its contents, and potential use cases..."
                rows={4}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Computer Vision"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="format">Format</Label>
                <Input
                  id="format"
                  value={formData.format}
                  onChange={(e) => setFormData((prev) => ({ ...prev, format: e.target.value }))}
                  placeholder="e.g., JSON, CSV, Images"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="size">Dataset Size</Label>
                <Input
                  id="size"
                  value={formData.size}
                  onChange={(e) => setFormData((prev) => ({ ...prev, size: e.target.value }))}
                  placeholder="e.g., 1.2 GB"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="samples">Number of Samples</Label>
                <Input
                  id="samples"
                  type="number"
                  value={formData.samples}
                  onChange={(e) => setFormData((prev) => ({ ...prev, samples: e.target.value }))}
                  placeholder="e.g., 10000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., images, classification, labeled"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (ETH) *</Label>
              <Input
                id="price"
                type="number"
                step="0.001"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="e.g., 0.1"
                required
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Preview</h3>
              <div className="text-sm space-y-1">
                <p>
                  <span className="font-medium">Name:</span> {formData.name || "Not specified"}
                </p>
                <p>
                  <span className="font-medium">Price:</span> {formData.price || "0"} ETH
                </p>
                <p>
                  <span className="font-medium">Category:</span> {formData.category || "Not specified"}
                </p>
                <p>
                  <span className="font-medium">Seller:</span> {account?.slice(0, 6)}...{account?.slice(-4)}
                </p>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Listing Dataset...
                </>
              ) : (
                "List Dataset"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
