import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

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
// GET /api/orders/[id] — single order detail (buyer or seller)
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const userId = await resolveSession(request, db)
    if (!userId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const order = await db
      .prepare(
        `SELECT
           o.*,
           bp.full_name    AS buyer_name,
           bp.phone_number AS buyer_phone,
           bu.email        AS buyer_email,
           sp.full_name    AS seller_name,
           sp.business_name AS seller_business,
           sp.payment_qr_url AS seller_payment_qr_url
         FROM orders o
         LEFT JOIN users bu      ON o.user_id   = bu.id
         LEFT JOIN profiles bp   ON o.user_id   = bp.user_id
         LEFT JOIN profiles sp   ON o.seller_id = sp.id
         WHERE o.id = ?`
      )
      .bind(id)
      .first<Record<string, unknown>>()

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    const profile = await db
      .prepare("SELECT id, role FROM profiles WHERE user_id = ?")
      .bind(userId)
      .first<{ id: string; role: string }>()

    const isBuyer = order.user_id === userId
    const isSeller = profile && order.seller_id === profile.id
    const isAdmin = profile?.role === "admin"

    if (!isBuyer && !isSeller && !isAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

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
      .bind(id)
      .all<Record<string, unknown>>()

    order.items = itemsResult.results

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error("Order detail error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch order" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/orders/[id]
//   Buyer:  { payment_proof_url: string } — attach proof of payment
//   Seller: { action: "mark_paid" }       — confirm payment received
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const userId = await resolveSession(request, db)
    if (!userId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const order = await db
      .prepare("SELECT id, user_id, seller_id, status FROM orders WHERE id = ?")
      .bind(id)
      .first<{ id: string; user_id: string; seller_id: string; status: string }>()

    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })

    const profile = await db
      .prepare("SELECT id, role FROM profiles WHERE user_id = ?")
      .bind(userId)
      .first<{ id: string; role: string }>()

    const isBuyer  = order.user_id === userId
    const isSeller = profile && order.seller_id === profile.id
    const isAdmin  = profile?.role === "admin"

    const body = await request.json() as {
      payment_proof_url?: string
      action?: "mark_paid"
    }

    if (body.payment_proof_url !== undefined) {
      if (!isBuyer) {
        return NextResponse.json({ success: false, error: "Only the buyer can upload payment proof" }, { status: 403 })
      }
      await db
        .prepare("UPDATE orders SET payment_proof_url = ?, status = 'payment_submitted', updated_at = datetime('now') WHERE id = ?")
        .bind(body.payment_proof_url, id)
        .run()
      return NextResponse.json({ success: true })
    }

    if (body.action === "mark_paid") {
      if (!isSeller && !isAdmin) {
        return NextResponse.json({ success: false, error: "Only the seller can confirm payment" }, { status: 403 })
      }
      await db
        .prepare("UPDATE orders SET status = 'confirmed', updated_at = datetime('now') WHERE id = ?")
        .bind(id)
        .run()
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: "No valid action provided" }, { status: 400 })
  } catch (error) {
    console.error("Order patch error:", error)
    return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 })
  }
}
