import { NextRequest, NextResponse } from "next/server"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, playerSize, description, preregistrationFee, tournamentDate, location, format, prizePool } = body

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

    let query = "SELECT * FROM tournaments"
    const params: string[] = []

    if (status) {
      query += " WHERE status = ?"
      params.push(status)
    }

    query += " ORDER BY tournament_date ASC"

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
