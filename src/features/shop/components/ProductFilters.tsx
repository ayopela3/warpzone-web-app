"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ArrowUpDown, X } from "lucide-react"

const CATEGORIES = [
  { id: "pokemon", name: "Pokemon" },
  { id: "mtg", name: "Magic: The Gathering" },
  { id: "yugioh", name: "Yu-Gi-Oh!" },
  { id: "sealed", name: "Sealed Product" },
]

export type SortOption = "relevance" | "newest"

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

export function ProductFilters({ search, category, sortBy, activeFiltersCount, onSearchChange, onCategoryChange, onSortChange, onClear }: Props) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search cards..."
          className="pl-10"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
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
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
            <X className="h-4 w-4 mr-1" />
            Clear ({activeFiltersCount})
          </Button>
        )}
      </div>
    </div>
  )
}
