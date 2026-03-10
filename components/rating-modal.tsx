"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useReputation } from "@/hooks/useReputation"
import { Textarea } from "@/components/ui/textarea"
import { Star, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface RatingModalProps {
  sellerAddress: string | null
  datasetId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRated?: () => void
}

export function RatingModal({ sellerAddress, datasetId, open, onOpenChange, onRated }: RatingModalProps) {
  const { submitRating, hasRated, loading } = useReputation()
  const { toast } = useToast()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [review, setReview] = useState("")
  const [alreadyRated, setAlreadyRated] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(false)

  useEffect(() => {
    if (!open || !sellerAddress || !datasetId) {
      setAlreadyRated(false)
      return
    }

    setCheckingExisting(true)
    hasRated(sellerAddress, datasetId)
      .then(setAlreadyRated)
      .catch((error) => {
        console.error("Error checking existing rating:", error)
        setAlreadyRated(false)
      })
      .finally(() => setCheckingExisting(false))
  }, [datasetId, hasRated, open, sellerAddress])

  const handleSubmit = async () => {
    if (!sellerAddress || !datasetId || rating === 0 || alreadyRated) return

    try {
      await submitRating(sellerAddress, datasetId, rating, review.trim())
      toast({
        title: "Rating Submitted",
        description: "Your verified review was recorded onchain.",
      })
      onOpenChange(false)
      setRating(0)
      setReview("")
      setAlreadyRated(true)
      onRated?.()
    } catch (error: any) {
      toast({
        title: "Rating Failed",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Rate Seller</DialogTitle>
          <DialogDescription>Verified ratings are limited to one review per purchased dataset.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          <div className="text-center">
            <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">How was your experience with this seller?</p>
            <p className="text-xs md:text-sm font-mono bg-muted p-2 rounded break-all">
              {sellerAddress?.slice(0, 6)}...{sellerAddress?.slice(-4)}
            </p>
            {datasetId != null && <p className="text-xs text-muted-foreground mt-2">Dataset #{datasetId}</p>}
          </div>

          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className="p-1 hover:scale-110 active:scale-95 transition-transform touch-manipulation"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              >
                <Star
                  className={`h-6 w-6 md:h-8 md:w-8 ${
                    star <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="text-center text-xs md:text-sm text-muted-foreground">
            {rating > 0 && `You selected ${rating} star${rating > 1 ? "s" : ""}`}
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Optional review for future trust signals and ops review."
              value={review}
              onChange={(event) => setReview(event.target.value.slice(0, 280))}
              disabled={alreadyRated || checkingExisting}
              rows={4}
            />
            <div className="text-right text-xs text-muted-foreground">{review.length}/280</div>
          </div>

          {checkingExisting && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking rating status...
            </div>
          )}

          {alreadyRated && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              You already submitted a verified rating for this dataset.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setRating(0)
                setReview("")
              }}
              className="flex-1 w-full sm:w-auto"
            >
              {alreadyRated ? "Close" : "Cancel"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || loading || alreadyRated || checkingExisting || !datasetId}
              className="flex-1 w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Rating"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
