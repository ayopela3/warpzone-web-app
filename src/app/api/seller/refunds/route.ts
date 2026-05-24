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
// GET /api/seller/refunds — list pending + settled refund requests for seller
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const db = await getDb()
  if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

  try {
    const profile = await resolveSellerProfile(request, db)
    if (!profile) return NextResponse.json({ success: false, error: "Not authorised" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const showSettled = searchParams.get("settled") === "true"

    const typeFilter = showSettled ? "wt.type IN ('refund_request', 'refunded')" : "wt.type = 'refund_request'"

    const rows = await db
      .prepare(`
        SELECT
          wt.id,
          wt.user_id,
          wt.type,
          wt.amount,
          wt.source_id   AS reservation_id,
          wt.note,
          wt.created_at,
          p.full_name    AS buyer_name,
          p.email        AS buyer_email,
          u.email        AS user_email,
          po.title       AS pre_order_title
        FROM wallet_transactions wt
        LEFT JOIN users u ON wt.user_id = u.id
        LEFT JOIN profiles p ON p.user_id = u.id
        LEFT JOIN pre_order_reservations por ON wt.source_id = por.id
        LEFT JOIN pre_orders po ON por.pre_order_id = po.id
        WHERE wt.seller_id = ? AND ${typeFilter}
        ORDER BY wt.created_at DESC
      `)
      .bind(profile.id)
      .all<Record<string, unknown>>()

    return NextResponse.json({ success: true, refunds: rows.results })
  } catch (error) {
    console.error("GET /api/seller/refunds error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch refunds" }, { status: 500 })
  }
}
