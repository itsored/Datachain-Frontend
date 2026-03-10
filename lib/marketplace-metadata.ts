"use client"

export interface MarketplaceMetadata {
  title: string
  shortDescription: string
  longDescription: string
  sourcePlatform: string
  sourceUrl: string
  repoUrl: string
  datasetHomepage: string
  license: string
  licenseVerified: boolean
  licenseNotes: string
  modality: string[]
  domainTags: string[]
  taskTags: string[]
  languageTags: string[]
  sizeInfo: string
  fileFormats: string[]
  maintainerName: string
  maintainerOrg: string
  provenanceConfidence: number | null
  redistributionConfidence: number | null
  qualitySignals: string[]
  seedPriority: string
  recommendedForPilot: boolean
  manualReviewRequired: boolean
  unlockType: "metadata_and_source_link" | "file_download"
  fileCid: string
  tags: string[]
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
}

export function getIpfsGatewayUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${cid}`
}

export function getIpfsMetadataProxyUrl(cid: string): string {
  return `/api/ipfs/${cid}`
}

export function normalizeMarketplaceMetadata(input: any): MarketplaceMetadata {
  const title = (input?.title || input?.name || "").trim()
  const shortDescription = (input?.short_description || input?.description || "").trim()
  const longDescription = (input?.long_description || input?.description || shortDescription).trim()
  const modality = toStringArray(input?.modality)
  const domainTags = toStringArray(input?.domain_tags)
  const taskTags = toStringArray(input?.task_tags)
  const qualitySignals = toStringArray(input?.quality_signals)
  const tags = Array.from(new Set([...toStringArray(input?.tags), ...modality, ...domainTags, ...taskTags]))
  const fileFormats = toStringArray(input?.file_formats)
  const fallbackFormats = typeof input?.format === "string" && input.format.trim() ? [input.format.trim()] : []

  return {
    title: title || "Untitled dataset",
    shortDescription,
    longDescription,
    sourcePlatform: (input?.source_platform || "").trim(),
    sourceUrl: (input?.source_url || "").trim(),
    repoUrl: (input?.repo_url || "").trim(),
    datasetHomepage: (input?.dataset_homepage || "").trim(),
    license: (input?.license || "").trim(),
    licenseVerified: Boolean(input?.license_verified),
    licenseNotes: (input?.license_notes || "").trim(),
    modality,
    domainTags,
    taskTags,
    languageTags: toStringArray(input?.language_tags),
    sizeInfo: (input?.size_info || input?.size || "").trim(),
    fileFormats: fileFormats.length > 0 ? fileFormats : fallbackFormats,
    maintainerName: (input?.maintainer_name || input?.seller || "").trim(),
    maintainerOrg: (input?.maintainer_org || "").trim(),
    provenanceConfidence: Number.isFinite(Number(input?.provenance_confidence)) ? Number(input?.provenance_confidence) : null,
    redistributionConfidence: Number.isFinite(Number(input?.redistribution_confidence))
      ? Number(input?.redistribution_confidence)
      : null,
    qualitySignals,
    seedPriority: (input?.seed_priority || "normal").trim(),
    recommendedForPilot: Boolean(input?.recommended_for_pilot),
    manualReviewRequired: Boolean(input?.manual_review_required),
    unlockType: input?.unlock_type === "file_download" ? "file_download" : "metadata_and_source_link",
    fileCid: (input?.file_cid || input?.fileCid || "").trim(),
    tags,
  }
}

export async function fetchMarketplaceMetadata(cid: string): Promise<MarketplaceMetadata> {
  const res = await fetch(getIpfsMetadataProxyUrl(cid), { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Failed to fetch metadata for ${cid}`)
  }

  return normalizeMarketplaceMetadata(await res.json())
}

export async function buildMetadataMap(items: Array<{ id: number; ipfsHash: string }>): Promise<Record<number, MarketplaceMetadata>> {
  const entries = await Promise.all(
    items.map(async (item) => {
      try {
        return [item.id, await fetchMarketplaceMetadata(item.ipfsHash)] as const
      } catch {
        return null
      }
    }),
  )

  return entries.reduce<Record<number, MarketplaceMetadata>>((acc, entry) => {
    if (entry) {
      acc[entry[0]] = entry[1]
    }
    return acc
  }, {})
}
