"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ListPage() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    format: "",
    size: "",
    samples: "",
    tags: "",
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">List a Dataset</h1>

      <form className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Dataset title"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your dataset, its contents, and potential use cases..."
            rows={4}
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
          >
            <SelectTrigger id="category" className="w-full" />
            <SelectContent>
              {[
                "Computer Vision",
                "Natural Language Processing",
                "Audio",
                "Time Series",
                "Tabular",
                "Other",
              ].map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Input
              id="format"
              value={formData.format}
              onChange={(e) => setFormData((prev) => ({ ...prev, format: e.target.value }))}
              placeholder="e.g., JSON, CSV, Images"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="size">Dataset Size</Label>
            <Input
              id="size"
              value={formData.size}
              onChange={(e) => setFormData((prev) => ({ ...prev, size: e.target.value }))}
              placeholder="e.g., 1.2 GB"
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="samples">Number of Samples</Label>
            <Input
              id="samples"
              type="number"
              value={formData.samples}
              onChange={(e) => setFormData((prev) => ({ ...prev, samples: e.target.value }))}
              placeholder="e.g., 10000"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="e.g., images, classification, labeled"
              className="w-full"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="datasetFile">Dataset File (.zip etc.)</Label>
          <Input
            id="datasetFile"
            type="file"
            accept=".zip,.csv,.json,.txt,.tar,.gz"
            className="w-full"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Button type="submit" className="w-full sm:w-auto">
            Publish Dataset
          </Button>
          <Link href="/market" className="w-full sm:w-auto">
            <Button variant="ghost" className="w-full sm:w-auto">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
