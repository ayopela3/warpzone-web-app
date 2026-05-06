import { NextResponse } from "next/server"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = "edge"

export async function GET() {
  try {
    let db: CloudflareEnv["DB"] | null = null
    try {
      const { getRequestContext } = await import("@cloudflare/next-on-pages")
      const { env } = getRequestContext()
      db = (env as CloudflareEnv).DB
    } catch {
      return NextResponse.json(
        { success: false, error: "Database connection failed. Ensure you're running in Cloudflare environment." },
        { status: 500 }
      )
    }

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    const featuredProducts = await db
      .prepare(`
        SELECT 
          p.id,
          p.sku,
          p.name,
          p.category,
          p.rarity,
          p.description,
          p.image_url,
          p.approval_status,
          p.created_at,
          pr.full_name as seller_name
        FROM products p
        LEFT JOIN profiles pr ON p.created_by = pr.user_id
        WHERE p.featured = 1 AND p.approval_status = 'approved' AND p.is_active = 1
        ORDER BY p.created_at DESC
      `)
      .all()

    return NextResponse.json({ success: true, products: featuredProducts.results })
  } catch (error) {
    console.error("Featured products fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch featured products" }, { status: 500 })
  }
}
