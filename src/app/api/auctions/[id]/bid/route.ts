import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

/**
 * POST /api/auctions/:id/bid
 * Places a bid on an active auction.
 * Body: { amount: number }
 * Rules:
 * - Auction must be currently active (start_time <= now <= end_time)
 * - Amount must be >= current_bid + min_bid_increment
 * - User must be authenticated
 * - Seller cannot bid on their own auction
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auctionId } = await params

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

    const body = await request.json()
    const { amount } = body

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ success: false, error: "Invalid bid amount" }, { status: 400 })
    }

    const bidAmount = Number(amount)

    // Fetch auction with computed real-time status and end_time for snipe check
    const auction = await db
      .prepare(
        `SELECT id, seller_id, current_bid, min_bid_increment, starting_price, end_time,
           CASE
             WHEN datetime('now') < start_time THEN 'upcoming'
             WHEN datetime('now') > end_time   THEN 'ended'
             ELSE 'active'
           END AS computed_status
         FROM auctions WHERE id = ?`
      )
      .bind(auctionId)
      .first<{
        id: string
        seller_id: string
        current_bid: number
        min_bid_increment: number
        starting_price: number
        end_time: string
        computed_status: string
      }>()

    if (!auction) {
      return NextResponse.json({ success: false, error: "Auction not found" }, { status: 404 })
    }

    if (auction.computed_status === "upcoming") {
      return NextResponse.json({ success: false, error: "Auction has not started yet" }, { status: 400 })
    }

    if (auction.computed_status === "ended") {
      return NextResponse.json({ success: false, error: "Auction has ended" }, { status: 400 })
    }

    // Prevent seller from bidding on own auction
    const profile = await db
      .prepare("SELECT id FROM profiles WHERE user_id = ?")
      .bind(session.user_id)
      .first<{ id: string }>()

    if (profile?.id === auction.seller_id) {
      return NextResponse.json({ success: false, error: "You cannot bid on your own auction" }, { status: 400 })
    }

    // Validate bid amount: must be at least current_bid + min_bid_increment
    const minRequired = (auction.current_bid || auction.starting_price) + auction.min_bid_increment
    if (bidAmount < minRequired) {
      return NextResponse.json({
        success: false,
        error: `Bid must be at least ${minRequired.toLocaleString()} (current + increment of ${auction.min_bid_increment.toLocaleString()})`,
      }, { status: 400 })
    }

    const bidId = crypto.randomUUID()

    // Record the bid and update current_bid atomically
    await db
      .prepare("INSERT INTO auction_bids (id, auction_id, user_id, bid_amount) VALUES (?, ?, ?, ?)")
      .bind(bidId, auctionId, session.user_id, bidAmount)
      .run()

    // Snipe protection: if bid lands within 60 min of end_time, extend by 30 min
    const SNIPE_WINDOW_MS = 60 * 60 * 1000       // 60 minutes
    const SNIPE_EXTENSION_MIN = 30                // extend by 30 minutes
    const now = Date.now()
    const endMs = new Date(auction.end_time).getTime()
    const timeLeft = endMs - now
    let newEndTime = auction.end_time
    let extended = false

    if (timeLeft > 0 && timeLeft <= SNIPE_WINDOW_MS) {
      newEndTime = new Date(endMs + SNIPE_EXTENSION_MIN * 60 * 1000).toISOString()
      extended = true
    }

    if (extended) {
      await db
        .prepare("UPDATE auctions SET current_bid = ?, end_time = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(bidAmount, newEndTime, auctionId)
        .run()
    } else {
      await db
        .prepare("UPDATE auctions SET current_bid = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(bidAmount, auctionId)
        .run()
    }

    // Auto-register as participant if not already
    const participantId = crypto.randomUUID()
    await db
      .prepare(
        "INSERT OR IGNORE INTO auction_participants (id, auction_id, user_id) VALUES (?, ?, ?)"
      )
      .bind(participantId, auctionId, session.user_id)
      .run()

    return NextResponse.json({
      success: true,
      bidId,
      newAmount: bidAmount,
      extended,
      newEndTime,
    })
  } catch (error) {
    console.error("Place bid error:", error)
    return NextResponse.json({ success: false, error: "Failed to place bid" }, { status: 500 })
  }
}
