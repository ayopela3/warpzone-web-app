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

type ApiCategory = { id: string; slug: string; label: string; image_url?: string | null }

function ShopPageInner() {
  const { addToCart, fiatSymbol } = useApp()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get("search") ?? "")
  const [category, setCategory] = useState(searchParams.get("category") ?? "all")
  const [sortBy, setSortBy] = useState<SortOption>("relevance")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([])

  /** Slug → label lookup built from API categories */
  const categoryLabel = useMemo(() => {
    const map = new Map(apiCategories.map((c) => [c.slug, c]))
    return (slug: string) => map.get(slug)?.label ?? slug
  }, [apiCategories])

  /** Slug → image_url lookup */
  const categoryImage = useMemo(() => {
    const map = new Map(apiCategories.map((c) => [c.slug, c.image_url]))
    return (slug: string) => map.get(slug) ?? null
  }, [apiCategories])

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d: { success: boolean; categories: ApiCategory[] }) => { if (d.success) setApiCategories(d.categories) })
      .catch(console.error)
  }, [])

  /** React to external URL changes (e.g. navbar search while on /shop) */
  useEffect(() => {
    const newSearch = searchParams.get("search") ?? ""
    const newCategory = searchParams.get("category") ?? "all"
    setSearch(newSearch)
    setCategory(newCategory)
  }, [searchParams])

  /** Sync search + category to URL without triggering navigation */
  useEffect(() => {
    const url = new URL(window.location.href)
    if (search.trim()) url.searchParams.set("search", search.trim())
    else url.searchParams.delete("search")
    if (category !== "all") url.searchParams.set("category", category)
    else url.searchParams.delete("category")
    window.history.replaceState({}, "", url.toString())
  }, [search, category])

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
  }, [search, category, sortBy, products, categoryLabel])

  const activeFiltersCount = [category !== "all", search.trim() !== ""].filter(Boolean).length
  const clearFilters = () => { setSearch(""); setCategory("all"); setSortBy("relevance") }

  const activeCategory = category === "all" ? "All Products" : (categoryLabel(category) || "All Products")

  return (
    <div className="min-h-screen bg-background">
      {/* ── Page header ── */}
      <div
        className="relative overflow-hidden border-b border-border"
        style={{
          backgroundImage: category !== "all" && categoryImage(category)
            ? `url(${categoryImage(category)})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay for readability when banner image is present */}
        {category !== "all" && categoryImage(category) && (
          <div className="absolute inset-0 bg-black/40" />
        )}
        <div className="relative mx-auto max-w-7xl px-4 pt-6 pb-5 lg:px-8 lg:pt-8 lg:pb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`label-meta mb-2 ${category !== "all" && categoryImage(category) ? "text-white/80" : "text-foreground"}`}>
                {category === "all" ? "All Categories" : categoryLabel(category)}
              </p>
              <h1 className={`text-3xl font-black sm:text-4xl ${category !== "all" && categoryImage(category) ? "text-white" : "text-foreground"}`}>
                {activeCategory}
              </h1>
            </div>
            <p className={`label-meta mt-1 shrink-0 ${category !== "all" && categoryImage(category) ? "text-white/70" : "text-muted-foreground"}`}>
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
            <p className="text-sm text-muted-foreground">Loading products...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground/45" />
            <h3 className="text-lg font-bold text-foreground">No products found</h3>
            {search.trim() ? (
              <>
                <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">&ldquo;{search.trim()}&rdquo;</span> is not found in the Warp.
                  Would you like to request this product?
                </p>
                <a
                  href="https://www.facebook.com/warpzonePH/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-md border border-[#1877F2] bg-[#1877F2] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#166fe5]"
                >
                  {/* Facebook icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.271h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                  </svg>
                  Message us on Facebook
                </a>
                {activeFiltersCount > 0 && (
                  <div className="mt-3">
                    <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeFiltersCount > 0 ? "Try adjusting your filters" : "Check back later for new listings"}
                </p>
                {activeFiltersCount > 0 && (
                  <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                fiatSymbol={fiatSymbol}
                onAddToCart={(p, qty) => addToCart({ id: p.id, name: p.name, price: p.price, category: p.category, listing_id: p.listing_id ?? undefined, seller_id: p.listing_seller_id ?? p.created_by ?? undefined, maxQuantity: p.quantity }, qty, p.quantity)}
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
