import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

/**
 * GET /api/seller/auctions
 * Returns all auctions created by the authenticated seller.
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const sessionId =
      request.cookies.get("wz_session")?.value ??
      request.headers.get("Authorization")?.replace("Bearer ", "")

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const session = await db
      .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string; expires_at: string }>()

    if (!session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 401 })
    }

    const profile = await db
      .prepare("SELECT id, role FROM profiles WHERE user_id = ?")
      .bind(session.user_id)
      .first<{ id: string; role: string }>()

    if (!profile || profile.role !== "seller") {
      return NextResponse.json({ success: false, error: "Only sellers can access this endpoint" }, { status: 403 })
    }

    const result = await db
      .prepare(
        `SELECT
           id, title, description, category, condition, rarity, image_url,
           starting_price, current_bid, min_bid_increment,
           start_time, end_time, created_at,
           CASE
             WHEN datetime('now') < start_time THEN 'upcoming'
             WHEN datetime('now') > end_time   THEN 'ended'
             ELSE 'active'
           END AS status
         FROM auctions
         WHERE seller_id = ?
         ORDER BY created_at DESC`
      )
      .bind(profile.id)
      .all()

    return NextResponse.json({ success: true, auctions: result.results })
  } catch (error) {
    console.error("Seller auctions fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch auctions" }, { status: 500 })
  }
}
