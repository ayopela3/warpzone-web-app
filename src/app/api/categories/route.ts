import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

type Category = {
  id: string
  slug: string
  label: string
  emoji: string | null
  image_url: string | null
  color: string
  sort_order: number
  is_active: number
}

/** Fallback seed rows — used when the table is empty (first deploy) */
const SEED: Omit<Category, "is_active">[] = [
  { id: "cat_pokemon",  slug: "pokemon",     label: "Pokémon",               emoji: "🔴", image_url: "/images/pokemon-logo.png",             color: "bg-red-50 border-red-200 hover:border-red-400 hover:bg-red-100",         sort_order: 1 },
  { id: "cat_mtg",      slug: "mtg",         label: "Magic: The Gathering",   emoji: "🟤", image_url: "/images/Magic-The-Gathering-Logo.jpg", color: "bg-amber-50 border-amber-200 hover:border-amber-400 hover:bg-amber-100", sort_order: 2 },
  { id: "cat_yugioh",   slug: "yugioh",      label: "Yu-Gi-Oh!",             emoji: "🟣", image_url: "/images/Yugioh-logo.png",              color: "bg-purple-50 border-purple-200 hover:border-purple-400 hover:bg-purple-100", sort_order: 3 },
  { id: "cat_sealed",   slug: "sealed",      label: "Sealed Products",        emoji: "📦", image_url: null,                                  color: "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100",    sort_order: 4 },
  { id: "cat_plushies", slug: "Plushies",    label: "Plushies",               emoji: "🧸", image_url: null,                                  color: "bg-pink-50 border-pink-200 hover:border-pink-400 hover:bg-pink-100",    sort_order: 5 },
  { id: "cat_access",   slug: "Accessories", label: "Accessories",            emoji: "🎴", image_url: null,                                  color: "bg-green-50 border-green-200 hover:border-green-400 hover:bg-green-100", sort_order: 6 },
  { id: "cat_others",   slug: "others",      label: "Others",                 emoji: "🃏", image_url: null,                                  color: "bg-gray-50 border-gray-200 hover:border-gray-400 hover:bg-gray-100",   sort_order: 7 },
]

export async function GET() {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    // Ensure table exists (idempotent)
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, label TEXT NOT NULL,
        emoji TEXT, image_url TEXT,
        color TEXT NOT NULL DEFAULT 'bg-gray-50 border-gray-200 hover:border-gray-400 hover:bg-gray-100',
        sort_order INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run()

    const result = await db.prepare(
      "SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, label ASC"
    ).all<Category>()

    // Auto-seed on first use
    if (result.results.length === 0) {
      for (const row of SEED) {
        await db.prepare(
          `INSERT OR IGNORE INTO categories (id, slug, label, emoji, image_url, color, sort_order, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
        ).bind(row.id, row.slug, row.label, row.emoji, row.image_url, row.color, row.sort_order).run()
      }
      const seeded = await db.prepare(
        "SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC"
      ).all<Category>()
      return NextResponse.json({ success: true, categories: seeded.results })
    }

    return NextResponse.json({ success: true, categories: result.results })
  } catch (error) {
    console.error("GET /api/categories error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch categories" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const body = await request.json() as {
      slug: string; label: string; emoji?: string; image_url?: string; color?: string; sort_order?: number
    }
    const { slug, label, emoji, image_url, color, sort_order } = body

    if (!slug?.trim() || !label?.trim()) {
      return NextResponse.json({ success: false, error: "slug and label are required" }, { status: 400 })
    }

    const id = `cat_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`
    await db.prepare(
      `INSERT INTO categories (id, slug, label, emoji, image_url, color, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    ).bind(
      id,
      slug.trim(),
      label.trim(),
      emoji?.trim() || null,
      image_url?.trim() || null,
      color?.trim() || "bg-gray-50 border-gray-200 hover:border-gray-400 hover:bg-gray-100",
      sort_order ?? 99,
    ).run()

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("POST /api/categories error:", error)
    return NextResponse.json({ success: false, error: "Failed to create category" }, { status: 500 })
  }
}
