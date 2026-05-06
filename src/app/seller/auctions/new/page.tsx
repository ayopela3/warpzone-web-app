"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Gavel } from "lucide-react"
import { toast } from "sonner"
import { useApp } from "@/components/shared/app-provider"
import { auctionsApi } from "@/lib/api-client"

export default function NewAuctionPage() {
  const router = useRouter()
  const { isAuthenticated, userRole } = useApp()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    listing_id: "",
    title: "",
    description: "",
    starting_price: "",
    min_bid_increment: "1",
    start_time: "",
    end_time: "",
  })

  if (!isAuthenticated || userRole !== "seller") {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = await auctionsApi.create({
        ...formData,
        starting_price: parseFloat(formData.starting_price),
        min_bid_increment: parseFloat(formData.min_bid_increment),
      })

      if (data.success) {
        toast.success("Auction created successfully!")
        router.push("/dashboard")
      } else {
        toast.error(data.error || "Failed to create auction")
      }
    } catch {
      toast.error("Failed to create auction")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create Auction</h1>
          <p className="text-gray-600 mt-1">Set up an auction for your product listing</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
        <Card className="bg-white shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Auction Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="listing_id">Product Listing ID</Label>
                <Input
                  id="listing_id"
                  value={formData.listing_id}
                  onChange={(e) => setFormData({ ...formData, listing_id: e.target.value })}
                  placeholder="Enter your product listing ID"
                  required
                />
                <p className="text-sm text-gray-600 mt-1">The ID of the product listing you want to auction</p>
              </div>

              <div>
                <Label htmlFor="title">Auction Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Rare Charizard Holographic Card"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your item and why it's valuable..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="starting_price">Starting Price ($)</Label>
                  <Input
                    id="starting_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.starting_price}
                    onChange={(e) => setFormData({ ...formData, starting_price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="min_bid_increment">Min Bid Increment ($)</Label>
                  <Input
                    id="min_bid_increment"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.min_bid_increment}
                    onChange={(e) => setFormData({ ...formData, min_bid_increment: e.target.value })}
                    placeholder="1.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
                  {loading ? "Creating..." : "Create Auction"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
