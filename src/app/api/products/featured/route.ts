import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function GET() {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
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
          p.price,
          p.quantity,
          p.approval_status,
          p.featured,
          p.is_active,
          p.created_at,
          p.created_by,
          pr.full_name as seller_name,
          pr.business_name as seller_business
        FROM products p
        LEFT JOIN profiles pr ON p.created_by = pr.id
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
