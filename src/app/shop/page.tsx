"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, ShoppingBag, ArrowUpDown, X, Loader2 } from "lucide-react"

interface Category {
  id: string
  name: string
  slug: string
}

interface Condition {
  id: string
  name: string
  slug: string
}

interface Product {
  id: string
  name: string
  category: string
  rarity: string
  description: string
  image_url: string
  sku: string
  approval_status: string
  created_at: string
}

const categories: Category[] = [
  { id: "pokemon", name: "Pokemon", slug: "pokemon" },
  { id: "mtg", name: "Magic: The Gathering", slug: "mtg" },
  { id: "yugioh", name: "Yu-Gi-Oh!", slug: "yugioh" },
  { id: "sealed", name: "Sealed Product", slug: "sealed" },
]

const conditions: Condition[] = [
  { id: "mint", name: "Mint", slug: "mint" },
  { id: "near-mint", name: "Near Mint", slug: "near-mint" },
  { id: "light-played", name: "Lightly Played", slug: "light-played" },
  { id: "played", name: "Played", slug: "played" },
  { id: "poor", name: "Poor", slug: "poor" },
]

const productsWithoutListings: Array<{
  id: number
  name: string
  category: string
  categoryId: string
  setName: string
  rarity: string
}> = []

type SortOption = "relevance" | "newest"

export default function ShopPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedCondition, setSelectedCondition] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("relevance")
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [productsData, setProductsData] = useState<Product[]>([])

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true)
      try {
        const response = await fetch("/api/products")
        const data = await response.json()
        if (data.success) {
          setProductsData(data.products || [])
        }
      } catch (error) {
        console.error("Failed to fetch products:", error)
      } finally {
        setIsLoadingProducts(false)
      }
    }

    fetchProducts()
  }, [])

  const filteredProducts = useMemo(() => {
    let result = [...productsData]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      )
    }

    if (selectedCategory !== "all") {
      result = result.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase())
    }

    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return result
  }, [searchQuery, selectedCategory, sortBy, productsData])

  const activeFiltersCount = [
    selectedCategory !== "all",
    selectedCondition !== "all",
    searchQuery.trim() !== "",
  ].filter(Boolean).length

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setSelectedCondition("all")
    setSortBy("relevance")
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <h1 className="text-3xl font-black">Shop cards and sealed products</h1>
          <p className="mt-1 text-neutral-600">Browse singles, slabs, booster boxes, accessories, and hobby shop inventory.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search cards..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    No categories available
                  </SelectItem>
                ) : (
                  categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select value={selectedCondition} onValueChange={setSelectedCondition}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Conditions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                {conditions.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    No conditions available
                  </SelectItem>
                ) : (
                  conditions.map((condition) => (
                    <SelectItem key={condition.id} value={condition.id}>
                      {condition.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear ({activeFiltersCount})
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{filteredProducts.length}</span> of {productsData.length} results
          </p>
        </div>

        {/* Product Grid */}
        {isLoadingProducts ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold">Loading products...</h3>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No products found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {activeFiltersCount > 0
                ? "Try adjusting your filters or search query"
                : "Check back later for new listings"}
            </p>
            {activeFiltersCount > 0 && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Link key={product.id} href={`/shop/${product.id}`}>
                <Card className="group h-full cursor-pointer overflow-hidden border-neutral-200 bg-white py-0 shadow-sm transition hover:-translate-y-1 hover:border-black hover:shadow-xl">
                  <CardContent className="flex h-full flex-col p-0">
                    <div className="relative flex h-64 items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#fff7cc,#ffffff)]">
                      <div className="absolute inset-x-8 top-6 h-44 rounded-2xl border border-primary/30 bg-white/70 blur-xl" />
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="relative h-40 w-28 object-contain transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="relative flex h-40 w-28 items-center justify-center rounded-2xl border-2 border-primary bg-white shadow-lg transition-transform group-hover:scale-105">
                          <ShoppingBag className="h-12 w-12 text-primary" />
                        </div>
                      )}
                      <Badge className="absolute top-3 left-3">{product.category}</Badge>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="line-clamp-2 min-h-12 font-black leading-6 text-black">{product.name}</h3>
                      {product.rarity && (
                        <p className="mt-1 line-clamp-1 text-sm text-neutral-600">{product.rarity}</p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-4">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>
                        <Badge variant="outline">SKU: {product.sku}</Badge>
                      </div>
                      <Button
                        className="w-full mt-3"
                        onClick={(event) => {
                          event.preventDefault()
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Products Without Listings */}
        {productsWithoutListings.length > 0 && (
          <div className="mt-12 border-t border-neutral-200 pt-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black">Rare Finds</h2>
                <p className="text-sm text-neutral-600">
                  These cards are in our catalog but have no active listings.
                  <Link href="/seller/listings/new" className="text-primary hover:underline ml-1">
                    Be the first to sell!
                  </Link>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {productsWithoutListings.map((product) => (
                <Card key={product.id} className="group h-full overflow-hidden border-dashed border-2 border-neutral-300 bg-white py-0 shadow-sm transition hover:-translate-y-1 hover:border-black hover:shadow-xl">
                  <CardContent className="flex h-full flex-col p-0">
                    <div className="relative flex h-64 items-center justify-center overflow-hidden bg-neutral-50">
                      <div className="relative flex h-40 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-white">
                        <ShoppingBag className="h-12 w-12 text-neutral-300 transition-transform group-hover:scale-105" />
                      </div>
                      <Badge className="absolute top-3 left-3" variant="secondary">{product.category}</Badge>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="line-clamp-2 min-h-12 font-black leading-6 text-black">{product.name}</h3>
                      <p className="mt-1 line-clamp-1 text-sm text-neutral-600">{product.setName} &bull; {product.rarity}</p>
                      <div className="mt-auto pt-4">
                        <Badge variant="outline">No sellers yet</Badge>
                      </div>
                      <Link href="/seller/listings/new">
                        <Button variant="outline" className="w-full mt-3">
                          Sell This Card
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
