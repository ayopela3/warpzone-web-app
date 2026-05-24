import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function resolveSellerProfile(
  request: NextRequest,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const sessionId =
    request.cookies.get("__Secure-wz_session")?.value ??
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
// GET /api/seller/stats — summary stats for the seller dashboard header cards
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const profile = await resolveSellerProfile(request, db)
    if (!profile) return NextResponse.json({ success: false, error: "Not authorised" }, { status: 403 })

    const sellerId = profile.id

    // Pending orders (not yet fulfilled / not cancelled)
    const pendingOrdersRow = await db
      .prepare(
        `SELECT COUNT(*) AS cnt
         FROM orders
         WHERE seller_id = ?
           AND status NOT IN ('cancelled', 'ready_for_pickup', 'out_of_stock')`
      )
      .bind(sellerId)
      .first<{ cnt: number }>()

    // Total revenue from confirmed/ready orders
    const revenueRow = await db
      .prepare(
        `SELECT COALESCE(SUM(total), 0) AS total
         FROM orders
         WHERE seller_id = ?
           AND status IN ('confirmed', 'ready_for_pickup')`
      )
      .bind(sellerId)
      .first<{ total: number }>()

    // Active pre-order reservation count (reservations across the seller's pre-orders)
    const preOrderReservationsRow = await db
      .prepare(
        `SELECT COUNT(por.id) AS cnt
         FROM pre_order_reservations por
         JOIN pre_orders po ON por.pre_order_id = po.id
         WHERE po.seller_id = ?`
      )
      .bind(sellerId)
      .first<{ cnt: number }>()

    return NextResponse.json({
      success: true,
      stats: {
        pendingOrders:        pendingOrdersRow?.cnt     ?? 0,
        revenue:              revenueRow?.total         ?? 0,
        preOrderReservations: preOrderReservationsRow?.cnt ?? 0,
      },
    })
  } catch (error) {
    console.error("Seller stats error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 })
  }
}
