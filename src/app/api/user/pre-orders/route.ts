import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// GET /api/user/pre-orders — buyer's own reservations with pre-order details
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
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

    const result = await db
      .prepare(
        `SELECT
           por.id, por.pre_order_id, por.user_id, por.quantity, por.reserved_at,
           po.title, po.game, po.image_url, po.price, po.release_date, po.status
         FROM pre_order_reservations por
         JOIN pre_orders po ON por.pre_order_id = po.id
         WHERE por.user_id = ?
         ORDER BY por.reserved_at DESC`
      )
      .bind(session.user_id)
      .all<Record<string, unknown>>()

    return NextResponse.json({ success: true, reservations: result.results })
  } catch (error) {
    console.error("User pre-orders fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch pre-orders" }, { status: 500 })
  }
}
