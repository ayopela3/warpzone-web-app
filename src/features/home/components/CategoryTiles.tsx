"use client"

import Link from "next/link"
import Image from "next/image"

type Category = {
  label: string
  slug: string
  /** Path to image in /public, or null to use emoji fallback */
  image: string | null
  /** Emoji fallback when no image is available */
  emoji: string
  color: string
}

const CATEGORIES: Category[] = [
  { label: "Pokémon",              slug: "pokemon",      image: "/images/pokemon-logo.png",           emoji: "🔴", color: "bg-red-50    border-red-200    hover:border-red-400    hover:bg-red-100" },
  { label: "Magic: The Gathering", slug: "mtg",          image: "/images/Magic-The-Gathering-Logo.jpg", emoji: "🟤", color: "bg-amber-50  border-amber-200  hover:border-amber-400  hover:bg-amber-100" },
  { label: "Yu-Gi-Oh!",           slug: "yugioh",       image: "/images/Yugioh-logo.png",            emoji: "🟣", color: "bg-purple-50 border-purple-200 hover:border-purple-400 hover:bg-purple-100" },
  { label: "Sealed Products",      slug: "sealed",       image: null,                                  emoji: "📦", color: "bg-blue-50   border-blue-200   hover:border-blue-400   hover:bg-blue-100" },
  { label: "Plushies",             slug: "Plushies",     image: null,                                  emoji: "🧸", color: "bg-pink-50   border-pink-200   hover:border-pink-400   hover:bg-pink-100" },
  { label: "Accessories",          slug: "Accessories",  image: null,                                  emoji: "🎴", color: "bg-green-50  border-green-200  hover:border-green-400  hover:bg-green-100" },
  { label: "Others",               slug: "others",       image: null,                                  emoji: "🃏", color: "bg-gray-50   border-gray-200   hover:border-gray-400   hover:bg-gray-100" },
]

export function CategoryTiles() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">Shop by Category</h2>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/shop?category=${encodeURIComponent(cat.slug)}`}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 py-4 px-2 transition-all duration-150 ${cat.color}`}
          >
            <div className="h-10 w-full flex items-center justify-center">
              {cat.image ? (
                <Image
                  src={cat.image}
                  alt={cat.label}
                  width={80}
                  height={40}
                  className="object-contain max-h-10 w-auto"
                />
              ) : (
                <span className="text-3xl leading-none">{cat.emoji}</span>
              )}
            </div>
            <span className="text-[11px] font-bold text-center text-foreground leading-tight">{cat.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
