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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { pinJSONToIPFS, pinFileToIPFS } from "@/lib/pinata"

export default function ListDatasetPage() {
  const { isConnected, account } = useWeb3Context()
  const { listDataset } = useMarketplace()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    modality: "",
    sourceUrl: "",
    license: "",
    size: "",
    samples: "",
    format: "",
    taskTags: "",
    tags: "",
    price: "",
  })
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

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
      let fileCid: string | undefined
      if (file) {
        fileCid = await pinFileToIPFS(file)
      }

      const qualitySignals = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
      const taskTags = formData.taskTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
      const sizeInfo = [formData.size, formData.samples ? `${formData.samples} samples` : ""]
        .filter(Boolean)
        .join("; ")

      const metadata = {
        schema_version: "datachain.marketplace.dataset/v1",
        listing_source: "manual_upload",
        unlock_type: fileCid ? "file_download" : "metadata_and_source_link",
        title: formData.name,
        short_description: formData.description,
        long_description: formData.description,
        source_platform: "DataChain AI",
        source_url: formData.sourceUrl,
        license: formData.license || "unspecified",
        license_verified: false,
        modality: formData.modality ? [formData.modality] : [],
        task_tags: taskTags,
        domain_tags: [],
        language_tags: [],
        size_info: sizeInfo,
        file_formats: formData.format ? [formData.format] : [],
        maintainer_name: account,
        maintainer_org: "",
        access_type: "public",
        commercial_use_possible: "unknown",
        pii_risk: "unknown",
        quality_signals: qualitySignals,
        recommended_for_pilot: false,
        manual_review_required: false,
        notes: fileCid
          ? "Seller uploaded a dataset file to IPFS for direct delivery."
          : "This listing unlocks metadata and source-link access only.",
        tags: qualitySignals,
        seller_wallet: account,
        file_cid: fileCid,
        timestamp: Date.now(),
      }

      const ipfsHash = await pinJSONToIPFS(metadata)
      await listDataset(ipfsHash, formData.price)

      toast({
        title: "Dataset Listed Successfully",
        description: "Your dataset is now available in the marketplace!",
      })

      setFormData({
        name: "",
        description: "",
        modality: "",
        sourceUrl: "",
        license: "",
        size: "",
        samples: "",
        format: "",
        taskTags: "",
        tags: "",
        price: "",
      })
      setFile(null)
    } catch (error: any) {
      console.error("LIST DATASET RAW ERROR →", error)
      let message = error?.message || "Failed to list dataset"

      switch (error?.code) {
        case "ACTION_REJECTED":
        case 4001:
          message = "Transaction rejected in wallet. Please approve the request to continue."
          break
        case "NETWORK_ERROR":
          message = "Network error: please check your RPC URL or that your node is running."
          break
        default:
          if (message.includes("failed to detect network")) {
            message = "Could not connect to the configured network. Is your RPC endpoint online?"
          }
      }

      toast({
        title: "Listing Failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-6 md:py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 md:mb-4">Connect Your Wallet</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                You need to connect your wallet to list datasets on the marketplace.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3 md:mb-4">List Your Dataset</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Share your AI training data with the community and earn rewards</p>
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

            <div className="space-y-2">
              <Label htmlFor="modality">Modality</Label>
              <Select
                value={formData.modality}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, modality: value }))}
              >
                <SelectTrigger id="modality">
                  <SelectValue placeholder="Select a modality" />
                </SelectTrigger>
                <SelectContent>
                  {["text", "image", "audio", "video", "tabular", "code", "multimodal"].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceUrl">Source URL</Label>
              <Input
                id="sourceUrl"
                value={formData.sourceUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, sourceUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license">License</Label>
              <Input
                id="license"
                value={formData.license}
                onChange={(e) => setFormData((prev) => ({ ...prev, license: e.target.value }))}
                placeholder="e.g., cc-by-4.0, apache-2.0"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Label htmlFor="taskTags">Task Tags (comma-separated)</Label>
              <Input
                id="taskTags"
                value={formData.taskTags}
                onChange={(e) => setFormData((prev) => ({ ...prev, taskTags: e.target.value }))}
                placeholder="e.g., question answering, OCR, object detection"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags / Quality Signals (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., benchmark, labeled, multilingual"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="datasetFile">Dataset File (.zip etc.)</Label>
              <Input
                id="datasetFile"
                type="file"
                accept=".zip,.csv,.json,.txt,.tar,.gz"
                onChange={(e) => {
                  const nextFile = e.target.files?.[0] || null
                  setFile(nextFile)
                }}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (dcUSDC) *</Label>
              <Input
                id="price"
                type="number"
                step="0.001"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="e.g., 5"
                required
              />
            </div>

            <div className="bg-muted p-3 md:p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-sm md:text-base">Preview</h3>
              <div className="text-xs md:text-sm space-y-1">
                <p className="break-words">
                  <span className="font-medium">Title:</span> {formData.name || "Not specified"}
                </p>
                <p>
                  <span className="font-medium">Price:</span> {formData.price || "0"} dcUSDC
                </p>
                <p>
                  <span className="font-medium">Modality:</span> {formData.modality || "Not specified"}
                </p>
                <p>
                  <span className="font-medium">License:</span> {formData.license || "unspecified"}
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
