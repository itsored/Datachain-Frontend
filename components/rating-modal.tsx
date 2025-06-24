"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useReputation } from "@/hooks/useReputation"
import { Star, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface RatingModalProps {
  sellerAddress: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RatingModal({ sellerAddress, open, onOpenChange }: RatingModalProps) {
  const { submitRating, loading } = useReputation()
  const { toast } = useToast()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)

  const handleSubmit = async () => {
    if (!sellerAddress || rating === 0) return

    try {
      await submitRating(sellerAddress, rating)
      toast({
        title: "Rating Submitted",
        description: "Thank you for your feedback!",
      })
      onOpenChange(false)
      setRating(0)
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate Seller</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">How was your experience with this seller?</p>
            <p className="text-sm font-mono bg-muted p-2 rounded">
              {sellerAddress?.slice(0, 6)}...{sellerAddress?.slice(-4)}
            </p>
          </div>

          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className="p-1 hover:scale-110 transition-transform"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoveredRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {rating > 0 && `You selected ${rating} star${rating > 1 ? "s" : ""}`}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={rating === 0 || loading} className="flex-1">
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
