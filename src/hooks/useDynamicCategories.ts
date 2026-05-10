"use client"

import { useEffect, useState } from "react"

export type DynamicCategory = {
  id: string
  slug: string
  label: string
}

/**
 * Fetches active categories from /api/categories and returns them as a
 * simple {id, slug, label} list suitable for <Select> or filter chips.
 * Results are cached for the lifetime of the component.
 */
export function useDynamicCategories() {
  const [categories, setCategories] = useState<DynamicCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d: { success: boolean; categories: DynamicCategory[] }) => {
        if (d.success) setCategories(d.categories)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return { categories, loading }
}
