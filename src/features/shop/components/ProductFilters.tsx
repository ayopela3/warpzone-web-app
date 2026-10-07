"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { ArrowUpDown, Search } from "lucide-react"

type ApiCategory = {
  id: string
  slug: string
  label: string
}

export type SortOption = "relevance" | "newest" | "price_asc" | "price_desc"

type Props = {
  search: string
  category: string
  sortBy: SortOption
  activeFiltersCount: number
  onSearchChange: (v: string) => void
  onCategoryChange: (v: string) => void
  onSortChange: (v: SortOption) => void
  onClear: () => void
}

export function ProductFilters({ search, category, sortBy, onSearchChange, onCategoryChange, onSortChange }: Props) {
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([])

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d: { success: boolean; categories: ApiCategory[] }) => {
        if (d.success) setApiCategories(d.categories)
      })
      .catch(console.error)
  }, [])

  const cycleSortPrice = () => {
    if (sortBy === "price_asc") onSortChange("price_desc")
    else onSortChange("price_asc")
  }

  const priceLabel =
    sortBy === "price_asc"  ? "Price: Low → High" :
    sortBy === "price_desc" ? "Price: High → Low" :
    "Price"

  return (
    <div className="mb-6 border-b border-border pb-5">
      {/* Row 1: sort button left · category chips centre · search right */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Price sort pill */}
        <button
          type="button"
          onClick={cycleSortPrice}
          className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors ${
            sortBy === "price_asc" || sortBy === "price_desc"
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          <ArrowUpDown className="h-3 w-3" />
          {priceLabel}
        </button>

        {/* Category pill chips */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Static "All" pill */}
          <button
            type="button"
            onClick={() => onCategoryChange("all")}
            className={`h-10 rounded-full border px-3.5 text-xs font-bold transition-colors ${
              category === "all"
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            All
          </button>

          {/* Dynamic category pills from API */}
          {apiCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.slug)}
              className={`h-10 rounded-full border px-3.5 text-xs font-bold transition-colors ${
                category === cat.slug
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative shrink-0 w-52">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="h-10 rounded-md border-border pl-9 text-sm"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
