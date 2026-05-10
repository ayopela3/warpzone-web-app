"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Loader2 } from "lucide-react"
import { useApp } from "@/components/shared/app-provider"
import { ProductCard } from "@/features/shop/components/ProductCard"
import { ProductFilters } from "@/features/shop/components/ProductFilters"
import { productsApi } from "@/lib/api-client"
import type { Product } from "@/types"
import type { SortOption } from "@/features/shop/components/ProductFilters"

type ApiCategory = { id: string; slug: string; label: string }

function ShopPageInner() {
  const { addToCart, fiatSymbol } = useApp()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState(searchParams.get("category") ?? "all")
  const [sortBy, setSortBy] = useState<SortOption>("relevance")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([])

  /** Slug → label lookup built from API categories */
  const categoryLabel = (slug: string) =>
    apiCategories.find((c) => c.slug === slug)?.label ?? slug

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d: { success: boolean; categories: ApiCategory[] }) => { if (d.success) setApiCategories(d.categories) })
      .catch(console.error)
  }, [])

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
      const label = categoryLabel(category)
      result = result.filter((p) => p.category.toLowerCase() === label.toLowerCase() || p.category.toLowerCase() === category.toLowerCase())
    }
    if (sortBy === "newest")     result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    if (sortBy === "price_asc")  result.sort((a, b) => a.price - b.price)
    if (sortBy === "price_desc") result.sort((a, b) => b.price - a.price)
    return result
  }, [search, category, sortBy, products, apiCategories])

  const activeFiltersCount = [category !== "all", search.trim() !== ""].filter(Boolean).length
  const clearFilters = () => { setSearch(""); setCategory("all"); setSortBy("relevance") }

  const activeCategory = category === "all" ? "All Products" : (categoryLabel(category) || "All Products")

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ── Page header ── */}
      <div className="bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-5 lg:px-8 lg:pt-8 lg:pb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                {category === "all" ? "All Categories" : categoryLabel(category)}
              </p>
              <h1 className="text-xl font-black tracking-tight text-neutral-900 sm:text-2xl lg:text-3xl">
                {activeCategory}
              </h1>
            </div>
            <p className="text-sm text-neutral-400 shrink-0 mt-1">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
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

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="h-10 w-10 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-sm text-neutral-400">Loading products...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-neutral-700">No products found</h3>
            <p className="text-sm text-neutral-400 mt-1">
              {activeFiltersCount > 0 ? "Try adjusting your filters" : "Check back later for new listings"}
            </p>
            {activeFiltersCount > 0 && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                fiatSymbol={fiatSymbol}
                onAddToCart={(p, qty) => addToCart({ id: p.id, name: p.name, price: p.price, category: p.category, seller_id: p.created_by ?? undefined }, qty)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ShopPage() {
  return (
    <Suspense>
      <ShopPageInner />
    </Suspense>
  )
}
