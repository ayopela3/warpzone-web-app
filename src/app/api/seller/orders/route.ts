import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { requireSeller } from "@/lib/auth"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// GET /api/seller/orders — all incoming orders for the seller
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const user = await requireSeller(request, db)

    const ordersResult = await db
      .prepare(
        `SELECT
           o.*,
           bu.email        AS buyer_email,
           bp.full_name    AS buyer_name,
           bp.phone_number AS buyer_phone
         FROM orders o
         LEFT JOIN users    bu ON o.user_id = bu.id
         LEFT JOIN profiles bp ON o.user_id = bp.user_id
         WHERE o.seller_id = ?
         ORDER BY o.created_at DESC`
      )
      .bind(user.profileId)
      .all<Record<string, unknown>>()

    const orders = ordersResult.results

    // Fetch all items in a single query (fixes N+1)
    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id as string)
      const placeholders = orderIds.map(() => "?").join(",")

      const itemsResult = await db
        .prepare(
          `SELECT
             oi.*,
             p.name       AS product_name,
             p.image_url  AS product_image_url,
             p.category   AS product_category,
             po.title     AS pre_order_title,
             po.image_url AS pre_order_image_url,
             po.game      AS pre_order_game
           FROM order_items oi
           LEFT JOIN products   p  ON oi.product_id   = p.id
           LEFT JOIN pre_orders po ON oi.pre_order_id = po.id
           WHERE oi.order_id IN (${placeholders})`
        )
        .bind(...orderIds)
        .all<Record<string, unknown>>()

      // Group items by order_id
      const itemsByOrder = itemsResult.results.reduce<Record<string, Record<string, unknown>[]>>((acc, item) => {
        const orderId = item.order_id as string
        if (!acc[orderId]) acc[orderId] = []
        acc[orderId].push({
          ...item,
          product_name: item.pre_order_title ?? item.product_name,
          product_image_url: item.pre_order_image_url ?? item.product_image_url,
        })
        return acc
      }, {})

      // Attach items to each order
      orders.forEach((order) => {
        order.items = itemsByOrder[order.id as string] ?? []
      })
    }

    return NextResponse.json({ success: true, orders })
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
    console.error("Seller orders fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 })
  }
}
