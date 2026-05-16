"use client"

import { useState } from "react"
import { useDynamicCategories } from "@/hooks/useDynamicCategories"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Gavel, ImagePlus, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { useApp } from "@/components/shared/app-provider"
import { auctionsApi } from "@/lib/api-client"

const CONDITION_OPTIONS = [
  { value: "NEW", label: "Brand New" },
  { value: "LIKE NEW", label: "Near Mint" },
  { value: "GOOD", label: "Lightly Played" },
  { value: "FAIR", label: "Moderately Played" },
  { value: "POOR", label: "Heavily Played" },
  { value: "DAMAGED", label: "Damaged" },
]

export default function NewAuctionPage() {
  const router = useRouter()
  const { isAuthenticated, userRole } = useApp()
  const { categories: dynamicCategories } = useDynamicCategories()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    condition: "NEW",
    rarity: "",
    starting_price: "",
    min_bid_increment: "1",
    start_time: "",
    end_time: "",
  })

  // Image upload state
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)

  if (!isAuthenticated || userRole !== "seller") return null

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newFiles = Array.from(files)
    if (imageFiles.length + newFiles.length > 3) {
      toast.error("You can upload up to 3 images")
      return
    }
    setUploadingImages(true)
    try {
      const results = await Promise.all(
        newFiles.map(async (file) => {
          const fd = new FormData()
          fd.append("file", file)
          const res = await fetch("/api/upload", { method: "POST", body: fd })
          const data = await res.json()
          if (!res.ok || !data.success) throw new Error(data.error || "Upload failed")
          return { file, url: data.url as string, preview: URL.createObjectURL(file) }
        })
      )
      setImageFiles((prev) => [...prev, ...results.map((r) => r.file)])
      setImagePreviews((prev) => [...prev, ...results.map((r) => r.preview)])
      setImageUrls((prev) => [...prev, ...results.map((r) => r.url)])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image")
    } finally {
      setUploadingImages(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.category) { toast.error("Please select a category"); return }
    setLoading(true)
    try {
      const data = await auctionsApi.create({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        rarity: formData.rarity || null,
        image_url: imageUrls[0] ?? null,
        starting_price: parseFloat(formData.starting_price),
        min_bid_increment: parseFloat(formData.min_bid_increment),
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
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
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create Auction</h1>
          <p className="text-gray-600 mt-1">List any item for auction — independent of your shop listings</p>
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

              {/* ── Title ───────────────────────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="title">Auction Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., 1st Edition Charizard Holographic"
                  required
                />
              </div>

              {/* ── Category + Condition ─────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {dynamicCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.label}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition *</Label>
                  <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                    <SelectTrigger id="condition">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Rarity ──────────────────────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="rarity">Rarity <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="rarity"
                  value={formData.rarity}
                  onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                  placeholder="e.g., Ultra Rare, Secret Rare, Limited Edition"
                />
              </div>

              {/* ── Description ──────────────────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the item — what it is, its condition, why it's valuable…"
                  rows={4}
                />
              </div>

              {/* ── Images ───────────────────────────────────────────── */}
              <div className="space-y-2">
                <Label>Item Images <span className="text-gray-400 font-normal">(up to 3)</span></Label>
                <div className="border-2 border-dashed rounded-lg p-5 text-center">
                  <input
                    id="auction-image"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={imageFiles.length >= 3 || uploadingImages}
                    className="hidden"
                  />
                  <label
                    htmlFor="auction-image"
                    className={`cursor-pointer flex flex-col items-center gap-2 ${imageFiles.length >= 3 || uploadingImages ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {uploadingImages
                      ? <><Loader2 className="h-8 w-8 text-gray-400 animate-spin" /><span className="text-sm text-gray-500">Uploading…</span></>
                      : <><ImagePlus className="h-8 w-8 text-gray-400" /><span className="text-sm text-gray-500">{imageFiles.length >= 3 ? "Max 3 images reached" : "Click to upload or drag and drop"}</span></>
                    }
                    <span className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB · {imageFiles.length}/3 uploaded</span>
                  </label>
                </div>
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {imagePreviews.map((preview, i) => (
                      <div key={i} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt={`Preview ${i + 1}`} className="h-20 w-20 object-cover rounded-md border" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(i)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Pricing ──────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="starting_price">Starting Bid *</Label>
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
                  {formData.starting_price && parseFloat(formData.starting_price) > 0 && (() => {
                    const price = parseFloat(formData.starting_price)
                    const fee = Math.round(price * 0.10 * 100) / 100
                    const payout = Math.round((price - fee) * 100) / 100
                    return (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs space-y-1">
                        <p className="text-amber-700 font-medium mb-1">If auction settles at starting bid:</p>
                        <div className="flex justify-between text-gray-600">
                          <span>Winning bid</span>
                          <span className="font-semibold text-gray-800">{price.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Platform fee (10%)</span>
                          <span className="font-semibold">− {fee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-amber-200 pt-1 text-green-700">
                          <span className="font-semibold">You receive</span>
                          <span className="font-bold">{payout.toLocaleString()}</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_bid_increment">Min Bid Increment *</Label>
                  <Input
                    id="min_bid_increment"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.min_bid_increment}
                    onChange={(e) => setFormData({ ...formData, min_bid_increment: e.target.value })}
                    placeholder="1.00"
                    required
                  />
                </div>
              </div>

              {/* ── Timing ───────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : "Create Auction"}
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
