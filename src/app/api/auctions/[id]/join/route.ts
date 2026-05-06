import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: auctionId } = await params

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    // Get user from session cookie or Authorization header
    const sessionId =
      request.cookies.get("wz_session")?.value ??
      request.headers.get("Authorization")?.replace("Bearer ", "")

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const sessionResult = await db
      .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string; expires_at: string }>()

    if (!sessionResult || new Date(sessionResult.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 401 })
    }

    // Check if auction exists and is active
    const auctionResult = await db
      .prepare("SELECT id, status, end_time FROM auctions WHERE id = ?")
      .bind(auctionId)
      .first<{ id: string; status: string; end_time: string }>()

    if (!auctionResult) {
      return NextResponse.json({ success: false, error: "Auction not found" }, { status: 404 })
    }

    if (auctionResult.status !== "upcoming" && auctionResult.status !== "active") {
      return NextResponse.json({ success: false, error: "Auction is not accepting participants" }, { status: 400 })
    }

    // Check if auction has ended
    if (new Date(auctionResult.end_time) < new Date()) {
      return NextResponse.json({ success: false, error: "Auction has ended" }, { status: 400 })
    }

    // Check if user is already a participant
    const existingParticipant = await db
      .prepare("SELECT id FROM auction_participants WHERE auction_id = ? AND user_id = ?")
      .bind(auctionId, sessionResult.user_id)
      .first<{ id: string }>()

    if (existingParticipant) {
      return NextResponse.json({ success: false, error: "You are already participating in this auction" }, { status: 400 })
    }

    // Generate participant ID
    const participantId = crypto.randomUUID()

    // Add user to auction participants
    await db
      .prepare("INSERT INTO auction_participants (id, auction_id, user_id) VALUES (?, ?, ?)")
      .bind(participantId, auctionId, sessionResult.user_id)
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
