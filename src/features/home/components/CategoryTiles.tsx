"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"

type Category = {
  id: string
  slug: string
  label: string
  emoji: string | null
  image_url: string | null
  color: string
}

export function CategoryTiles() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d: { success: boolean; categories: Category[] }) => {
        if (d.success) setCategories(d.categories)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">Shop by Category</h2>
      <div className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
            ))
          : categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/shop?category=${encodeURIComponent(cat.slug)}`}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-4 px-2 transition-all duration-150 ${cat.color}`}
              >
                <div className="h-10 w-full flex items-center justify-center">
                  {cat.image_url ? (
                    <Image
                      src={cat.image_url}
                      alt={cat.label}
                      width={80}
                      height={40}
                      className="object-contain max-h-10 w-auto"
                    />
                  ) : (
                    <span className="text-3xl leading-none">{cat.emoji ?? "🏷️"}</span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-center text-foreground leading-tight">{cat.label}</span>
              </Link>
            ))}
      </div>
    </section>
  )
}
