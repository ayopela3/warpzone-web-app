import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

export const runtime = "edge"

const LUDUS_BASE = "https://www.ludusproducts.com"

/** Collections exposed as importable sources */
const LUDUS_COLLECTIONS = [
  { slug: "magic-the-gathering",         game: "Magic: The Gathering" },
  { slug: "riftbound-tcg",               game: "League of Legends: Rift Bound" },
  { slug: "flesh-and-blood",             game: "Flesh and Blood TCG" },
  { slug: "starcraft-miniatures-preorder", game: "Starcraft Miniatures" },
  { slug: "cyberpunk-2077",              game: "Cyberpunk 2077 TCG" },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
}

function extractDate(text: string): string | null {
  // ISO format
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/)
  if (iso) {
    const d = new Date(iso[1])
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }
  // "ETA: June 2026" or "ETA: June 15, 2026"
  const eta = text.match(/ETA[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4}|[A-Za-z]+ \d{4})/i)
  if (eta) {
    const d = new Date(eta[1])
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }
  // "release date: May 22, 2026"
  const rel = text.match(/release\s*date[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/i)
  if (rel) {
    const d = new Date(rel[1])
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }
  // "shipping and release will begin on this date" with preceding date
  const shipRel = text.match(/([A-Za-z]+ \d{1,2},?\s*\d{4})\s*\(shipping and release/i)
  if (shipRel) {
    const d = new Date(shipRel[1])
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }
  // Month + year only → 1st of that month
  const monthYear = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
  )
  if (monthYear) {
    const d = new Date(`${monthYear[1]} 1, ${monthYear[2]}`)
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }
  return null
}

function extractPrice(text: string, shopifyPriceStr: string): number {
  // MSRP in USD — convert to PHP at a rough rate (admin can override before saving)
  const msrp = text.match(/MSRP[:\s₱$]*([\d,.]+)\s*(USD|PHP|₱)?/i)
  if (msrp) {
    const raw = parseFloat(msrp[1].replace(/,/g, ""))
    if (raw > 0) {
      const currency = (msrp[2] ?? "USD").toUpperCase()
      // Use ~56 PHP/USD as a default — admin edits before importing
      return currency === "PHP" || currency === "₱" ? raw : Math.round(raw * 56)
    }
  }
  return parseFloat(shopifyPriceStr) || 0
}

// ---------------------------------------------------------------------------
// Shopify product type (subset)
// ---------------------------------------------------------------------------

interface ShopifyVariant {
  price: string
  available: boolean
}

interface ShopifyImage {
  src: string
}

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  body_html: string
  variants: ShopifyVariant[]
  images: ShopifyImage[]
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[]
}

// ---------------------------------------------------------------------------
// Public return type for the preview list
// ---------------------------------------------------------------------------

export interface ScrapedPreOrderItem {
  /** Temporary key used only in the UI — not stored */
  _key: string
  source: string
  game: string
  title: string
  description: string | null
  image_url: string | null
  full_price: number
  release_date: string | null
  cutoff_date: string | null
  source_url: string
  /** Whether this product already exists in pre_orders (matched by title) */
  already_exists: boolean
}

// ---------------------------------------------------------------------------
// GET /api/admin/scrape-preorders?source=ludus[&collection=riftbound-tcg]
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    // Admin-only — also checks is_banned via requireAdmin()
    try {
      await requireAdmin(request, db)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Forbidden"
      const status = msg === "Not authenticated" ? 401 : 403
      return NextResponse.json({ success: false, error: msg }, { status })
    }

    const { searchParams } = new URL(request.url)
    const source = searchParams.get("source") ?? "ludus"
    const collectionFilter = searchParams.get("collection") // optional — filter to one slug

    if (source !== "ludus") {
      return NextResponse.json({ success: false, error: `Unknown source: ${source}` }, { status: 400 })
    }

    // Fetch existing pre-order titles to flag duplicates
    const existing = await db
      .prepare("SELECT title FROM pre_orders")
      .all<{ title: string }>()
    const existingTitles = new Set(
      (existing.results ?? []).map((r) => r.title.toLowerCase().trim()),
    )

    // Determine which collections to fetch
    const collections = collectionFilter
      ? LUDUS_COLLECTIONS.filter((c) => c.slug === collectionFilter)
      : LUDUS_COLLECTIONS

    const items: ScrapedPreOrderItem[] = []
    const seenTitles = new Set<string>()

    for (const { slug, game } of collections) {
      let page = 1
      while (true) {
        const url = `${LUDUS_BASE}/collections/${slug}/products.json?limit=250&page=${page}`
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 WarpzoneAdmin/1.0" },
        })
        if (!res.ok) break

        const data = await res.json() as ShopifyProductsResponse
        const products = data.products ?? []
        if (!products.length) break

        for (const p of products) {
          const titleNorm = p.title.toLowerCase().trim()
          if (seenTitles.has(titleNorm)) continue
          seenTitles.add(titleNorm)

          const descText = stripHtml(p.body_html ?? "")
          const shopifyPrice = p.variants?.[0]?.price ?? "0"
          const full_price = extractPrice(descText, shopifyPrice)
          const release_date = extractDate(descText)
          const image_url = p.images?.[0]?.src ?? null

          items.push({
            _key: `${slug}-${p.id}`,
            source: "ludus",
            game,
            title: p.title,
            description: descText || null,
            image_url,
            full_price,
            release_date,
            cutoff_date: null,
            source_url: `${LUDUS_BASE}/products/${p.handle}`,
            already_exists: existingTitles.has(titleNorm),
          })
        }

        if (products.length < 250) break
        page++
      }
    }

    return NextResponse.json({ success: true, items, collections: LUDUS_COLLECTIONS })
  } catch (error) {
    console.error("Scrape pre-orders error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch distributor data" }, { status: 500 })
  }
}
