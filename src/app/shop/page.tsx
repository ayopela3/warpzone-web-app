"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Loader2 } from "lucide-react"
import { useApp } from "@/components/shared/app-provider"
import { ProductCard } from "@/features/shop/components/ProductCard"
import { ProductFilters } from "@/features/shop/components/ProductFilters"
import { productsApi } from "@/lib/api-client"
import type { Product } from "@/types"
import type { SortOption } from "@/features/shop/components/ProductFilters"

const CATEGORY_MAP: Record<string, string> = {
  pokemon: "Pokemon",
  mtg: "Magic: The Gathering",
  yugioh: "Yu-Gi-Oh!",
  sealed: "Sealed Product",
}

export default function ShopPage() {
  const { addToCart, fiatSymbol } = useApp()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [sortBy, setSortBy] = useState<SortOption>("relevance")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    productsApi.list()
      .then((d) => { if (d.success) setProducts(d.products) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = [...products]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    }
    if (category !== "all") {
      const name = CATEGORY_MAP[category] ?? category
      result = result.filter((p) => p.category.toLowerCase() === name.toLowerCase())
    }
    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return result
  }, [search, category, sortBy, products])

  const activeFiltersCount = [category !== "all", search.trim() !== ""].filter(Boolean).length
  const clearFilters = () => { setSearch(""); setCategory("all"); setSortBy("relevance") }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Page header ── */}
      <div className="mx-auto max-w-7xl px-4 pt-8 pb-4 lg:px-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
          Shop cards and sealed products
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse singles, slabs, booster boxes, accessories, and hobby shop inventory.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <ProductFilters
          search={search}
          category={category}
          sortBy={sortBy}
          activeFiltersCount={activeFiltersCount}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          onSortChange={setSortBy}
          onClear={clearFilters}
        />

        <p className="text-sm text-muted-foreground mb-5">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {products.length} results
        </p>

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="h-10 w-10 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading products...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-bold text-foreground">No products found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {activeFiltersCount > 0 ? "Try adjusting your filters" : "Check back later for new listings"}
            </p>
            {activeFiltersCount > 0 && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                fiatSymbol={fiatSymbol}
                onAddToCart={(p) => addToCart({ id: p.id, name: p.name, price: p.price, category: p.category }, p.quantity)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
