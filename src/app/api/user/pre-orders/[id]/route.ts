import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// GET /api/user/pre-orders/[id] — buyer's own reservation detail for one pre-order
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const sessionId =
      request.cookies.get("wz_session")?.value ??
      request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!sessionId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const session = await db
      .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string; expires_at: string }>()
    if (!session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 401 })
    }

    // Fetch the pre-order with seller info
    const preOrder = await db
      .prepare(
        `SELECT
           po.*,
           pr.full_name    AS seller_name,
           pr.business_name AS seller_business
         FROM pre_orders po
         LEFT JOIN profiles pr ON po.seller_id = pr.id
         WHERE po.id = ?`
      )
      .bind(id)
      .first<Record<string, unknown>>()

    if (!preOrder) {
      return NextResponse.json({ success: false, error: "Pre-order not found" }, { status: 404 })
    }

    // Fetch the buyer's specific reservation
    const reservation = await db
      .prepare(
        `SELECT
           por.id, por.pre_order_id, por.user_id, por.quantity, por.reserved_at,
           por.paid, por.downpayment_paid, por.downpayment_amount, por.total_paid,
           por.remaining_balance, por.allocation_status
         FROM pre_order_reservations por
         WHERE por.pre_order_id = ? AND por.user_id = ?`
      )
      .bind(id, session.user_id)
      .first<Record<string, unknown>>()

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 })
    }

    // Fetch the linked order for this pre-order item (buyer may have checked out)
    const linkedOrder = await db
      .prepare(
        `SELECT o.id, o.status
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         WHERE oi.pre_order_id = ? AND o.user_id = ?
         ORDER BY o.created_at DESC
         LIMIT 1`
      )
      .bind(id, session.user_id)
      .first<{ id: string; status: string } | null>()

    return NextResponse.json({ success: true, preOrder, reservation, linkedOrder: linkedOrder ?? null })
  } catch (error) {
    console.error("User pre-order detail error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch pre-order detail" }, { status: 500 })
  }
}
