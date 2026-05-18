import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

interface Tournament {
  registered_players: number
  player_size: number
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { userId } = await request.json()

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    // Check if tournament exists and has space
    const tournament = await db
      .prepare("SELECT registered_players, player_size FROM tournaments WHERE id = ?")
      .bind(id)
      .first() as Tournament | null

    if (!tournament) {
      return NextResponse.json({ success: false, error: "Tournament not found" }, { status: 404 })
    }

    if (tournament.registered_players >= tournament.player_size) {
      return NextResponse.json({ success: false, error: "Tournament is full" }, { status: 400 })
    }

    // Check if user is already registered
    const existingRegistration = await db
      .prepare("SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?")
      .bind(id, userId)
      .first()

    if (existingRegistration) {
      return NextResponse.json({ success: false, error: "Already registered for this tournament" }, { status: 400 })
    }

    // Create registration
    const registrationId = crypto.randomUUID()
    await db
      .prepare(
        `INSERT INTO tournament_registrations (id, tournament_id, user_id, registered_at, created_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(registrationId, id, userId)
      .run()

    // Update tournament registered count
    await db
      .prepare("UPDATE tournaments SET registered_players = registered_players + 1 WHERE id = ?")
      .bind(id)
      .run()

    return NextResponse.json({ success: true, registrationId })
  } catch (error) {
    console.error("Tournament registration error:", error)
    return NextResponse.json({ success: false, error: "Failed to register for tournament" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/tournaments/[id]/register — cancel a user's registration
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Only allow cancellation for upcoming tournaments
    const tournament = await db
      .prepare("SELECT id, status FROM tournaments WHERE id = ?")
      .bind(id)
      .first<{ id: string; status: string }>()

    if (!tournament) {
      return NextResponse.json({ success: false, error: "Tournament not found" }, { status: 404 })
    }

    if (tournament.status !== "upcoming") {
      return NextResponse.json(
        { success: false, error: "Cannot cancel registration for a tournament that is already active or ended" },
        { status: 400 }
      )
    }

    const existing = await db
      .prepare("SELECT id FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?")
      .bind(id, session.user_id)
      .first<{ id: string }>()

    if (!existing) {
      return NextResponse.json({ success: false, error: "No registration found" }, { status: 404 })
    }

    await db
      .prepare("DELETE FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?")
      .bind(id, session.user_id)
      .run()

    await db
      .prepare("UPDATE tournaments SET registered_players = MAX(0, registered_players - 1) WHERE id = ?")
      .bind(id)
      .run()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Tournament cancel registration error:", error)
    return NextResponse.json({ success: false, error: "Failed to cancel registration" }, { status: 500 })
  }
}
