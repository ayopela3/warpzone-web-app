import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function resolveSellerProfile(
  request: NextRequest,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const sessionId =
    request.cookies.get("wz_session")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "")
  if (!sessionId) return null

  const session = await db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: string; expires_at: string }>()
  if (!session || new Date(session.expires_at) < new Date()) return null

  const profile = await db
    .prepare("SELECT id, role FROM profiles WHERE user_id = ?")
    .bind(session.user_id)
    .first<{ id: string; role: string }>()

  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) return null
  return profile
}

// ---------------------------------------------------------------------------
// GET /api/seller/orders — all incoming orders for the seller
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const profile = await resolveSellerProfile(request, db)
    if (!profile) return NextResponse.json({ success: false, error: "Not authorised" }, { status: 403 })

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
      .bind(profile.id)
      .all<Record<string, unknown>>()

    const orders = ordersResult.results

    for (const order of orders) {
      const itemsResult = await db
        .prepare(
          `SELECT
             oi.*,
             p.name      AS product_name,
             p.image_url AS product_image_url,
             p.category  AS product_category
           FROM order_items oi
           LEFT JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = ?`
        )
        .bind(order.id as string)
        .all<Record<string, unknown>>()
      order.items = itemsResult.results
    }

    return NextResponse.json({ success: true, orders })
  } catch (error) {
    console.error("Seller orders fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 })
  }
}
