import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function GET() {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    // Fetch products with pending approval status along with seller information
    const pendingProducts = await db
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
          p.created_by,
          p.created_at,
          pr.full_name as seller_name,
          pr.business_name as seller_business
        FROM products p
        LEFT JOIN profiles pr ON p.created_by = pr.id
        WHERE p.approval_status = 'pending'
        ORDER BY p.created_at DESC
      `)
      .all()

    return NextResponse.json({ success: true, products: pendingProducts.results })
  } catch (error) {
    console.error("Pending approvals fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch pending approvals" }, { status: 500 })
  }
}
