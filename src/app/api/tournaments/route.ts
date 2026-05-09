import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, playerSize, description, preregistrationFee, tournamentDate, location, format, prizePool } = body

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    // Validate required fields
    if (!name || !playerSize || !description || !tournamentDate) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Create tournament
    const tournamentId = crypto.randomUUID()
    await db
      .prepare(
        `INSERT INTO tournaments (id, name, player_size, description, preregistration_fee, tournament_date, location, format, prize_pool, status, registered_players)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', 0)`
      )
      .bind(tournamentId, name, playerSize, description, preregistrationFee || 0, tournamentDate, location || null, format || null, prizePool || null)
      .run()

    return NextResponse.json({ success: true, tournamentId })
  } catch (error) {
    console.error("Tournament creation error:", error)
    return NextResponse.json({ success: false, error: "Failed to create tournament" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const userId = searchParams.get("userId")

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const conditions: string[] = []
    const params: string[] = []

    // When a userId is supplied, join registrations to mark which ones the user joined
    let selectClause = "SELECT t.*"
    if (userId) {
      selectClause += ", CASE WHEN tr.id IS NOT NULL THEN 1 ELSE 0 END AS user_registered"
    }

    let query = `${selectClause} FROM tournaments t`

    if (userId) {
      query += " LEFT JOIN tournament_registrations tr ON tr.tournament_id = t.id AND tr.user_id = ?"
      params.push(userId)
    }

    if (status) {
      conditions.push("t.status = ?")
      params.push(status)
    }

    if (conditions.length) query += " WHERE " + conditions.join(" AND ")
    query += " ORDER BY t.tournament_date ASC"

    const tournaments = await db
      .prepare(query)
      .bind(...params)
      .all()

    return NextResponse.json({ success: true, tournaments: tournaments.results })
  } catch (error) {
    console.error("Tournaments fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch tournaments" }, { status: 500 })
  }
}
