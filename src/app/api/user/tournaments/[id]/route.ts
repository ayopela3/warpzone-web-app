import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// GET /api/user/tournaments/[id] — buyer's own registration detail for one tournament
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
      request.cookies.get("__Secure-wz_session")?.value ??
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

    // Fetch tournament details
    const tournament = await db
      .prepare(
        `SELECT
           t.id, t.name, t.description, t.tournament_date, t.location, t.format,
           t.prize_pool, t.status, t.player_size, t.registered_players, t.preregistration_fee
         FROM tournaments t
         WHERE t.id = ?`
      )
      .bind(id)
      .first<Record<string, unknown>>()

    if (!tournament) {
      return NextResponse.json({ success: false, error: "Tournament not found" }, { status: 404 })
    }

    // Fetch the user's registration
    const registration = await db
      .prepare(
        `SELECT id, registered_at
         FROM tournament_registrations
         WHERE tournament_id = ? AND user_id = ?`
      )
      .bind(id, session.user_id)
      .first<{ id: string; registered_at: string }>()

    if (!registration) {
      return NextResponse.json({ success: false, error: "You are not registered for this tournament" }, { status: 404 })
    }

    return NextResponse.json({ success: true, tournament, registration })
  } catch (error) {
    console.error("User tournament detail error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch tournament detail" }, { status: 500 })
  }
}
