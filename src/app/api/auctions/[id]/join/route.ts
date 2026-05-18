import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { resolveSession } from "@/lib/auth"

export const runtime = "edge"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: auctionId } = await params

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const session = await resolveSession(request, db)
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Check if auction exists and hasn't ended (using real-time computed status)
    const auctionResult = await db
      .prepare(
        `SELECT id, start_time, end_time,
           CASE
             WHEN datetime('now') < start_time THEN 'upcoming'
             WHEN datetime('now') > end_time   THEN 'ended'
             ELSE 'active'
           END AS computed_status
         FROM auctions WHERE id = ?`
      )
      .bind(auctionId)
      .first<{ id: string; start_time: string; end_time: string; computed_status: string }>()

    if (!auctionResult) {
      return NextResponse.json({ success: false, error: "Auction not found" }, { status: 404 })
    }

    if (auctionResult.computed_status === "ended") {
      return NextResponse.json({ success: false, error: "Auction has ended" }, { status: 400 })
    }

    // Check if user is already a participant
    const existingParticipant = await db
      .prepare("SELECT id FROM auction_participants WHERE auction_id = ? AND user_id = ?")
      .bind(auctionId, session.userId)
      .first<{ id: string }>()

    if (existingParticipant) {
      return NextResponse.json({ success: false, error: "You are already participating in this auction" }, { status: 400 })
    }

    // Generate participant ID
    const participantId = crypto.randomUUID()

    // Add user to auction participants
    await db
      .prepare("INSERT INTO auction_participants (id, auction_id, user_id) VALUES (?, ?, ?)")
      .bind(participantId, auctionId, session.userId)
      .run()

    return NextResponse.json({ success: true, participantId })
  } catch (error) {
    console.error("Join auction error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to join auction" },
      { status: 500 }
    )
  }
}
