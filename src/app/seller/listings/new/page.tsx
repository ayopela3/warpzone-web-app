"use client"

import { useState, useEffect, useCallback } from "react"
import { useDynamicCategories } from "@/hooks/useDynamicCategories"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  ArrowLeft,
  Package,
  Check,
  Plus,
  AlertCircle,
  ChevronRight,
  Loader2
} from "lucide-react"

type CatalogProduct = {
  id: string
  name: string
  category: string
  rarity: string | null
  image_url: string | null
  sku: string
  hasListings: boolean
}

type Step = "search" | "match" | "create-listing" | "create-product"

export default function NewListingPage() {
  const { categories: dynamicCategories } = useDynamicCategories()
  const [step, setStep] = useState<Step>("search")
  const [searchQuery, setSearchQuery] = useState("")
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Listing form state (step 2)
  const [listingForm, setListingForm] = useState({
    price: "",
    condition: "NEW",
    quantity: "1",
  })

  // Product form state
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    category: "",
    price: "",
    quantity: "",
    rarity: "",
    condition: "NEW",
    description: "",
    imageUrl: ""
  })

  // Search catalog products from real API
  const searchCatalog = useCallback(async (query: string) => {
    if (query.length <= 2) { setCatalogProducts([]); return }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=10`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}` },
      })
      const data = await res.json() as { success: boolean; products?: CatalogProduct[] }
      if (data.success) setCatalogProducts(data.products ?? [])
    } catch {
      setCatalogProducts([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchCatalog(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery, searchCatalog])

  // Condition display mapping
  const conditionOptions = [
    { value: "NEW", label: "BRAND NEW" },
    { value: "LIKE NEW", label: "NEAR MINT CONDITION" },
    { value: "GOOD", label: "LIGHTLY PLAYED" },
    { value: "FAIR", label: "MODERATELY PLAYED" },
    { value: "POOR", label: "HEAVILY PLAYED" },
    { value: "DAMAGED", label: "DAMAGED OR DEFECTS" }
  ]

  // Image upload state
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)

  const handleProductSelect = (product: CatalogProduct) => {
    setSelectedProduct(product)
    setStep("create-listing")
  }

  const handleCreateNewProduct = () => {
    setProductForm({ ...productForm, name: searchQuery })
    setStep("create-product")
  }

  const handleCreateListing = async () => {
    if (!selectedProduct) return
    if (!listingForm.price || !listingForm.condition || !listingForm.quantity) {
      setSubmitError("Price, condition and quantity are required")
      return
    }
    setIsSubmitting(true)
    setSubmitError("")
    try {
      const profileId = localStorage.getItem("warpzone-profile-id")
      const res = await fetch("/api/product-listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
        },
        body: JSON.stringify({
          productId:  selectedProduct.id,
          sellerId:   profileId,
          condition:  listingForm.condition,
          price:      parseFloat(listingForm.price),
          quantity:   parseInt(listingForm.quantity, 10),
        }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) throw new Error(data.error ?? "Failed to create listing")
      setSubmitSuccess(true)
      setTimeout(() => {
        setSubmitSuccess(false)
        setStep("search")
        setSearchQuery("")
        setSelectedProduct(null)
        setListingForm({ price: "", condition: "NEW", quantity: "1" })
        setCatalogProducts([])
      }, 2500)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create listing")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles = Array.from(files)
    const totalImages = imageFiles.length + newFiles.length

    if (totalImages > 5) {
      setSubmitError("You can upload up to 5 images only")
      return
    }

    setUploadingImages(true)

    try {
      // Upload each file to R2
      const uploadPromises = newFiles.map(async (file) => {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to upload image")
        }

        return {
          file,
          url: data.url,
          preview: URL.createObjectURL(file)
        }
      })

      const results = await Promise.all(uploadPromises)

      // Update state with uploaded images
      setImageFiles([...imageFiles, ...results.map(r => r.file)])
      setImagePreviews([...imagePreviews, ...results.map(r => r.preview)])
      setImageUrls([...imageUrls, ...results.map(r => r.url)])
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to upload images")
    } finally {
      setUploadingImages(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    const newUrls = imageUrls.filter((_, i) => i !== index)
    setImageFiles(newFiles)
    setImagePreviews(newPreviews)
    setImageUrls(newUrls)
  }

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError("")

    try {
      // Validate at least one image is uploaded
      if (imageUrls.length === 0) {
        throw new Error("Please upload at least one product image")
      }

      // Validate SKU is provided
      if (!productForm.sku.trim()) {
        throw new Error("SKU is required")
      }

      // Use the first uploaded image as the main image
      const imageUrl = imageUrls[0]

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: productForm.sku.trim(),
          name: productForm.name,
          category: productForm.category,
          setName: "",
          rarity: productForm.rarity,
          condition: productForm.condition,
          description: productForm.description,
          imageUrl,
          sellerId: localStorage.getItem("warpzone-user-id"),
          price: parseFloat(productForm.price) || 0,
          quantity: parseInt(productForm.quantity) || 1
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to submit product")
      }

      setSubmitSuccess(true)
      // Reset form after successful submission
      setTimeout(() => {
        setSubmitSuccess(false)
        setStep("search")
        setSearchQuery("")
        setProductForm({
          name: "",
          sku: "",
          category: "",
          price: "",
          quantity: "",
          rarity: "",
          condition: "NEW",
          description: "",
          imageUrl: ""
        })
        setImageFiles([])
        setImagePreviews([])
        setImageUrls([])
      }, 3000)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit product")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/seller">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Create New Listing</h1>
            <p className="text-sm text-muted-foreground">
              {step === "search" && "Search for the product you want to sell"}
              {step === "match" && "Select the matching product from our catalog"}
              {step === "create-listing" && "Add your listing details"}
              {step === "create-product" && "Create a new product (requires admin approval)"}
            </p>
          </div>
        </div>

        {/* Step 1: Search */}
        {step === "search" && (
          <Card>
            <CardContent className="p-6">
              <Label htmlFor="search" className="text-lg font-semibold">
                What are you selling?
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Enter product name or category to find existing products
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="e.g., Charizard VMAX, Pokemon, Booster Pack..."
                  className="pl-10 h-14 text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Search Results */}
              {searchLoading && (
                <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />Searching catalog…
                </div>
              )}
              {!searchLoading && catalogProducts.length > 0 && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">We found these matching products:</p>
                  {catalogProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleProductSelect(product)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative h-16 w-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                              {product.image_url
                                ? <Image src={product.image_url} alt={product.name} fill className="object-contain" />
                                : <Package className="h-8 w-8 text-primary/30" />}
                            </div>
                            <div>
                              <h3 className="font-semibold">{product.name}</h3>
                              <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs capitalize">{product.category}</Badge>
                                {product.rarity && <Badge variant="outline" className="text-xs">{product.rarity}</Badge>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {product.hasListings ? (
                              <Badge variant="secondary" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />Sellers active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Be the first to sell</Badge>
                            )}
                            <ChevronRight className="h-5 w-5 text-muted-foreground mt-2 ml-auto" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* No matches - Create new */}
              {searchQuery.length > 2 && !searchLoading && catalogProducts.length === 0 && (
                <div className="mt-6">
                  <Card className="border-dashed">
                    <CardContent className="p-6 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold text-lg mb-2">No matching products found</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        This product does not exist in our catalog yet. You can create it, but it will require admin approval before going live.
                      </p>
                      <Button onClick={handleCreateNewProduct}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Product
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Create Listing for Existing Product */}
        {step === "create-listing" && selectedProduct && (
          <div className="space-y-6">
            {/* Selected Product Info */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center">
                    <Package className="h-8 w-8 text-primary/30" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{selectedProduct.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedProduct.category}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{selectedProduct.category}</Badge>
                      {selectedProduct.rarity && <Badge variant="outline" className="text-xs">{selectedProduct.rarity}</Badge>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setStep("search")}>
                    Change
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Listing Form */}
            {submitSuccess && (
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-800">Listing Created!</h3>
                    <p className="text-sm text-green-700">Your listing is now live in the shop.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {submitError && (
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-700">{submitError}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Listing Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="listing-price">Your Price *</Label>
                    <Input
                      id="listing-price" type="number" step="0.01" placeholder="299.99"
                      value={listingForm.price}
                      onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })}
                      className="placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="listing-qty">Quantity Available *</Label>
                    <Input
                      id="listing-qty" type="number" min="1" placeholder="1"
                      value={listingForm.quantity}
                      onChange={(e) => setListingForm({ ...listingForm, quantity: e.target.value })}
                      className="placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="listing-condition">Condition *</Label>
                  <Select value={listingForm.condition} onValueChange={(v) => setListingForm({ ...listingForm, condition: v })}>
                    <SelectTrigger id="listing-condition"><SelectValue placeholder="Select condition" /></SelectTrigger>
                    <SelectContent>
                      {conditionOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t">
                  <Button className="w-full" size="lg" onClick={handleCreateListing} disabled={isSubmitting}>
                    {isSubmitting
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
                      : "Create Listing"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">Your listing will be active immediately.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Create New Product (Admin Approval Required) */}
        {step === "create-product" && (
          <div className="space-y-6">
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-800">Admin Approval Required</h3>
                    <p className="text-sm text-amber-700">
                      This product does not exist in our catalog. You are creating a new product entry that will require admin review before it goes live. This typically takes 24-48 hours.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {submitSuccess && (
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-800">Product Submitted Successfully</h3>
                      <p className="text-sm text-green-700">
                        Your product has been submitted for approval. You will be redirected to the search page shortly.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {submitError && (
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-red-800">Submission Failed</h3>
                      <p className="text-sm text-red-700">{submitError}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <form onSubmit={handleProductSubmit}>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name *</Label>
                    <Input
                      id="productName"
                      placeholder="e.g., Charizard VMAX Booster Pack"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="placeholder:text-gray-400"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      placeholder="e.g., PKM-CHAR-001"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      className="placeholder:text-gray-400 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={productForm.category} onValueChange={(value) => setProductForm({ ...productForm, category: value })}>
                      <SelectTrigger>
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
                    <Label htmlFor="rarity">Rarity (Optional)</Label>
                    <Input
                      id="rarity"
                      placeholder="e.g., Ultra Rare, Limited Edition"
                      value={productForm.rarity}
                      onChange={(e) => setProductForm({ ...productForm, rarity: e.target.value })}
                      className="placeholder:text-gray-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition *</Label>
                    <Select value={productForm.condition} onValueChange={(value) => setProductForm({ ...productForm, condition: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {conditionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        placeholder="299.99"
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        className="placeholder:text-gray-400"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="1"
                        value={productForm.quantity}
                        onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                        className="placeholder:text-gray-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <textarea
                      id="description"
                      className="w-full min-h-[100px] p-3 border rounded-md text-sm placeholder:text-gray-400"
                      placeholder="Describe the product details, condition, contents, etc."
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image">Product Images (Up to 5 images) *</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <input
                        id="image"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        disabled={imageFiles.length >= 5 || uploadingImages}
                        className="hidden"
                      />
                      <label htmlFor="image" className={`cursor-pointer ${imageFiles.length >= 5 || uploadingImages ? "opacity-50 cursor-not-allowed" : ""}`}>
                        <div className="flex flex-col items-center">
                          {uploadingImages ? (
                            <>
                              <Loader2 className="h-12 w-12 text-muted-foreground mb-2 animate-spin" />
                              <p className="text-sm text-muted-foreground">
                                Uploading images...
                              </p>
                            </>
                          ) : (
                            <>
                              <Package className="h-12 w-12 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">
                                {imageFiles.length >= 5
                                  ? "Maximum 5 images reached"
                                  : "Click to upload or drag and drop"}
                              </p>
                            </>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG, GIF up to 10MB each
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {imageFiles.length}/5 images uploaded
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Image Previews */}
                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-5 gap-2 mt-4">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from createObjectURL, not an external URL */}
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-20 object-cover rounded-md border"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <Button type="submit" className="w-full" size="lg" variant="secondary" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit for Approval"
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      After approval, you will be able to create your listing
                    </p>
                  </div>
                </CardContent>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
