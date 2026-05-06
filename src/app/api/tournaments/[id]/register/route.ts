import { NextRequest, NextResponse } from "next/server"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = "edge"

interface Tournament {
  registered_players: number
  player_size: number
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { userId } = await request.json()

    // Get D1 database binding from Cloudflare context
    let db: CloudflareEnv["DB"] | null = null
    try {
      const { getRequestContext } = await import("@cloudflare/next-on-pages")
      const { env } = getRequestContext()
      db = (env as CloudflareEnv).DB
    } catch {
      return NextResponse.json(
        { success: false, error: "Database connection failed. Ensure you're running in Cloudflare environment." },
        { status: 500 }
      )
    }

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
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
