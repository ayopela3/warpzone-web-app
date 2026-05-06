import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

/**
 * GET /api/user/auctions
 * Returns auctions the authenticated user has joined as a participant.
 */
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
           a.id, a.title, a.category, a.condition, a.rarity, a.image_url,
           a.starting_price, a.current_bid, a.start_time, a.end_time,
           ap.joined_at,
           CASE
             WHEN datetime('now') < a.start_time THEN 'upcoming'
             WHEN datetime('now') > a.end_time   THEN 'ended'
             ELSE 'active'
           END AS status
         FROM auction_participants ap
         JOIN auctions a ON ap.auction_id = a.id
         WHERE ap.user_id = ?
         ORDER BY ap.joined_at DESC`
      )
      .bind(session.user_id)
      .all()

    return NextResponse.json({ success: true, auctions: result.results })
  } catch (error) {
    console.error("User auctions error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch auctions" }, { status: 500 })
  }
}
