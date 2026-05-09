"use client"

import { Input } from "@/components/ui/input"
import { ArrowUpDown, Search } from "lucide-react"

const CATEGORIES = [
  { id: "all",         name: "All" },
  { id: "pokemon",     name: "Pokémon" },
  { id: "mtg",         name: "MTG" },
  { id: "yugioh",      name: "Yu-Gi-Oh!" },
  { id: "sealed",      name: "Sealed" },
  { id: "plushies",    name: "Plushies" },
  { id: "accessories", name: "Accessories" },
  { id: "others",      name: "Others" },
]

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
  const cycleSortPrice = () => {
    if (sortBy === "price_asc") onSortChange("price_desc")
    else onSortChange("price_asc")
  }

  const priceLabel =
    sortBy === "price_asc"  ? "Price: Low → High" :
    sortBy === "price_desc" ? "Price: High → Low" :
    "Price"

  return (
    <div className="mb-6">
      {/* Row 1: sort button left · category chips centre · search right */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Price sort pill */}
        <button
          type="button"
          onClick={cycleSortPrice}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 h-8 text-xs font-semibold transition-colors shrink-0 ${
            sortBy === "price_asc" || sortBy === "price_desc"
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500"
          }`}
        >
          <ArrowUpDown className="h-3 w-3" />
          {priceLabel}
        </button>

        {/* Category pill chips */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={`rounded-full border px-3.5 h-8 text-xs font-semibold transition-colors ${
                category === cat.id
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative shrink-0 w-52">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Search products..."
            className="pl-9 h-8 text-xs rounded-full border-neutral-300"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
