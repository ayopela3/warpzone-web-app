import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

/**
 * GET /api/user/stats
 * Returns dashboard statistics for the authenticated regular user:
 * - totalOrders: number of orders placed
 * - activeBids: number of auctions the user has joined (active/upcoming status)
 * - tournaments: number of tournament registrations
 * - totalSpent: sum of all completed order totals
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

    const userId = session.user_id

    const [ordersRow, bidsRow, tournamentsRow, spentRow] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS count FROM orders WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare(
        `SELECT COUNT(*) AS count FROM auction_participants ap
         JOIN auctions a ON ap.auction_id = a.id
         WHERE ap.user_id = ? AND datetime('now') <= a.end_time`
      ).bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) AS count FROM tournament_registrations WHERE user_id = ?").bind(userId).first<{ count: number }>(),
      db.prepare("SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE user_id = ?").bind(userId).first<{ total: number }>(),
    ])

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders: ordersRow?.count ?? 0,
        activeBids: bidsRow?.count ?? 0,
        tournaments: tournamentsRow?.count ?? 0,
        totalSpent: spentRow?.total ?? 0,
      },
    })
  } catch (error) {
    console.error("User stats error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 })
  }
}
