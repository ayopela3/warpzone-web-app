"use client"

import { useState } from "react"
import Link from "next/link"
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
  ChevronRight
} from "lucide-react"

const existingProducts: Array<{
  id: string
  name: string
  setName: string
  cardNumber: string
  category: string
  rarity: string
  hasListings: boolean
}> = []

type Step = "search" | "match" | "create-listing" | "create-product"

export default function NewListingPage() {
  const [step, setStep] = useState<Step>("search")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<typeof existingProducts[0] | null>(null)
  const [showNewProductForm, setShowNewProductForm] = useState(false)

  const filteredProducts = searchQuery.length > 2 
    ? existingProducts.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.setName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.cardNumber.includes(searchQuery)
      )
    : []

  const handleProductSelect = (product: typeof existingProducts[0]) => {
    setSelectedProduct(product)
    setStep("create-listing")
  }

  const handleCreateNewProduct = () => {
    setShowNewProductForm(true)
    setStep("create-product")
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
                Enter card name, set name, or card number to find existing products
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="e.g., Charizard VMAX, Darkness Ablaze, 020/189..."
                  className="pl-10 h-14 text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Search Results */}
              {filteredProducts.length > 0 && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    We found these matching products:
                  </p>
                  {filteredProducts.map((product) => (
                    <Card 
                      key={product.id} 
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleProductSelect(product)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-16 w-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center">
                              <Package className="h-8 w-8 text-primary/30" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{product.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {product.setName} &bull; #{product.cardNumber}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                                <Badge variant="outline" className="text-xs">{product.rarity}</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {product.hasListings ? (
                              <Badge variant="secondary" className="text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Sellers active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Be the first to sell
                              </Badge>
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
              {searchQuery.length > 2 && filteredProducts.length === 0 && (
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
                      {selectedProduct.setName} &bull; #{selectedProduct.cardNumber}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{selectedProduct.category}</Badge>
                      <Badge variant="outline" className="text-xs">{selectedProduct.rarity}</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setStep("search")}>
                    Change
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Listing Form */}
            <Card>
              <CardHeader>
                <CardTitle>Listing Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Your Price *</Label>
                    <Input id="price" type="number" step="0.01" placeholder="299.99" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comparePrice">Compare at Price (optional)</Label>
                    <Input id="comparePrice" type="number" step="0.01" placeholder="349.99" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MINT">Mint</SelectItem>
                        <SelectItem value="NM">Near Mint</SelectItem>
                        <SelectItem value="LP">Lightly Played</SelectItem>
                        <SelectItem value="MP">Moderately Played</SelectItem>
                        <SelectItem value="HP">Heavily Played</SelectItem>
                        <SelectItem value="DAMAGED">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">Quantity Available *</Label>
                    <Input id="stock" type="number" placeholder="1" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shipping">Shipping Cost</Label>
                    <Select defaultValue="0">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Free Shipping</SelectItem>
                        <SelectItem value="5.99">$5.99</SelectItem>
                        <SelectItem value="9.99">$9.99</SelectItem>
                        <SelectItem value="14.99">$14.99</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery">Ships Within</Label>
                    <Select defaultValue="1-2">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-2">1-2 business days</SelectItem>
                        <SelectItem value="3-5">3-5 business days</SelectItem>
                        <SelectItem value="1 week">1 week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button className="w-full" size="lg">
                    Create Listing
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Your listing will be active immediately
                  </p>
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

            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="productName">Card Name *</Label>
                  <Input id="productName" placeholder="e.g., Charizard VMAX" defaultValue={searchQuery} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="setName">Set Name *</Label>
                    <Input id="setName" placeholder="e.g., Darkness Ablaze" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number *</Label>
                    <Input id="cardNumber" placeholder="e.g., 020/189" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pokemon">Pokemon</SelectItem>
                        <SelectItem value="mtg">Magic: The Gathering</SelectItem>
                        <SelectItem value="yugioh">Yu-Gi-Oh!</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rarity">Rarity</Label>
                    <Input id="rarity" placeholder="e.g., Ultra Rare" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea 
                    id="description" 
                    className="w-full min-h-[100px] p-3 border rounded-md text-sm"
                    placeholder="Describe the card details, artwork, etc."
                  />
                </div>

                <div className="pt-4 border-t">
                  <Button className="w-full" size="lg" variant="secondary">
                    Submit for Approval
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    After approval, you will be able to create your listing
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
