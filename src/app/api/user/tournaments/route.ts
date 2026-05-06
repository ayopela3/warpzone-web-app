import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

/**
 * GET /api/user/tournaments
 * Returns tournaments the authenticated user has registered for.
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
           t.id, t.name, t.description, t.tournament_date, t.location, t.format,
           t.prize_pool, t.status, t.player_size, t.registered_players, t.preregistration_fee,
           tr.registered_at
         FROM tournament_registrations tr
         JOIN tournaments t ON tr.tournament_id = t.id
         WHERE tr.user_id = ?
         ORDER BY t.tournament_date ASC`
      )
      .bind(session.user_id)
      .all()

    return NextResponse.json({ success: true, tournaments: result.results })
  } catch (error) {
    console.error("User tournaments error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch tournaments" }, { status: 500 })
  }
}
