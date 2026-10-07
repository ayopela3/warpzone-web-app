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
          COALESCE(pl.price, p.price) AS price,
          COALESCE(pl.quantity, p.quantity) AS quantity,
          p.approval_status,
          p.featured,
          p.is_active,
          p.created_at,
          p.created_by,
          pl.id as listing_id,
          pl.seller_id as listing_seller_id,
          pr.full_name as seller_name,
          pr.business_name as seller_business
        FROM products p
        LEFT JOIN product_listings pl
          ON pl.id = (
            SELECT pli.id
            FROM product_listings pli
            WHERE pli.product_id = p.id
              AND pli.in_stock = 1
              AND pli.quantity > 0
            ORDER BY pli.price ASC, pli.created_at ASC
            LIMIT 1
          )
        LEFT JOIN profiles pr ON p.created_by = pr.id
        WHERE p.featured = 1
          AND p.approval_status = 'approved'
          AND p.is_active = 1
          AND (
            pl.id IS NOT NULL
            OR (
              p.quantity > 0
              AND NOT EXISTS (
                SELECT 1
                FROM product_listings pl_any
                WHERE pl_any.product_id = p.id
              )
            )
          )
        ORDER BY p.created_at DESC
      `)
      .all()

    return NextResponse.json({ success: true, products: featuredProducts.results })
  } catch (error) {
    console.error("Featured products fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch featured products" }, { status: 500 })
  }
}
