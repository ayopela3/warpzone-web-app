import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

/** Resolve the authenticated user's ID and profile ID from session cookie or Authorization header. */
async function resolveSession(request: NextRequest, db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const sessionId =
    request.cookies.get("wz_session")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "")

  if (!sessionId) return null

  const session = await db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: string; expires_at: string }>()

  if (!session || new Date(session.expires_at) < new Date()) return null
  return session.user_id
}

// ---------------------------------------------------------------------------
// POST /api/orders — create order from cart
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const userId = await resolveSession(request, db)
    if (!userId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const body = await request.json() as {
      items: { product_id: string; listing_id: string; seller_id: string; quantity: number; price: number; pre_order_id?: string }[]
      seller_id: string
      total: number
      fulfillment_type: "pickup" | "shipping"
      notes?: string
    }

    const { items, seller_id, total, fulfillment_type, notes } = body

    if (!items?.length) {
      return NextResponse.json({ success: false, error: "Order must have at least one item" }, { status: 400 })
    }
    if (!seller_id) {
      return NextResponse.json({ success: false, error: "seller_id is required" }, { status: 400 })
    }

    const orderId = crypto.randomUUID()

    await db
      .prepare(
        `INSERT INTO orders (id, user_id, seller_id, status, total, fulfillment_type, notes, created_at, updated_at)
         VALUES (?, ?, ?, 'pending_payment', ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(orderId, userId, seller_id, total, fulfillment_type, notes ?? null)
      .run()

    for (const item of items) {
      await db
        .prepare(
          `INSERT INTO order_items (id, order_id, product_id, listing_id, seller_id, quantity, price, pre_order_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .bind(
          crypto.randomUUID(),
          orderId,
          item.product_id,
          item.listing_id,
          item.seller_id,
          item.quantity,
          item.price,
          item.pre_order_id ?? null
        )
        .run()
    }

    return NextResponse.json({ success: true, orderId })
  } catch (error) {
    console.error("Order creation error:", error)
    return NextResponse.json({ success: false, error: "Failed to create order" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// GET /api/orders — list orders for authenticated buyer
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const userId = await resolveSession(request, db)
    if (!userId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const ordersResult = await db
      .prepare(
        `SELECT
           o.*,
           sp.full_name  AS seller_name,
           sp.business_name AS seller_business,
           sp.payment_qr_url AS seller_payment_qr_url
         FROM orders o
         LEFT JOIN profiles sp ON o.seller_id = sp.id
         WHERE o.user_id = ?
         ORDER BY o.created_at DESC`
      )
      .bind(userId)
      .all<Record<string, unknown>>()

    const orders = ordersResult.results

    await Promise.all(
      orders.map(async (order) => {
        const itemsResult = await db
          .prepare(
            `SELECT
               oi.*,
               p.name       AS product_name,
               p.image_url  AS product_image_url,
               p.category   AS product_category
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?`
          )
          .bind(order.id as string)
          .all<Record<string, unknown>>()
        order.items = itemsResult.results
      })
    )

    return NextResponse.json({ success: true, orders })
  } catch (error) {
    console.error("Orders fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 })
  }
}
