import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

/**
 * POST /api/auctions/:id/settle
 * Admin-only. Marks the auction as settled and records the 10% service fee
 * (configurable via settings.auction_service_fee_rate).
 * Idempotent — guarded by the fee_recorded column on auctions.
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

    const profile = await db
      .prepare("SELECT role FROM profiles WHERE user_id = ?")
      .bind(session.user_id)
      .first<{ role: string }>()
    if (profile?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 })
    }

    const auction = await db
      .prepare(`
        SELECT id, seller_id, title, current_bid, starting_price, fee_recorded,
               CASE WHEN datetime('now') > end_time THEN 'ended' ELSE 'active' END AS computed_status
        FROM auctions WHERE id = ?
      `)
      .bind(auctionId)
      .first<{
        id: string
        seller_id: string
        title: string
        current_bid: number
        starting_price: number
        fee_recorded: number
        computed_status: string
      }>()

    if (!auction) return NextResponse.json({ success: false, error: "Auction not found" }, { status: 404 })
    if (auction.computed_status !== "ended") {
      return NextResponse.json({ success: false, error: "Auction has not ended yet" }, { status: 400 })
    }
    if (auction.fee_recorded) {
      return NextResponse.json({ success: false, error: "Fee already recorded for this auction" }, { status: 409 })
    }

    const rateSetting = await db
      .prepare("SELECT value FROM settings WHERE key = 'auction_service_fee_rate'")
      .first<{ value: string }>()
    const feeRate    = rateSetting ? parseFloat(rateSetting.value) : 0.10
    const finalBid   = auction.current_bid || auction.starting_price
    const feeAmount  = Math.round(finalBid * feeRate * 100) / 100

    await db.prepare(`
      INSERT OR IGNORE INTO service_fees
        (id, seller_id, source_type, source_id, description, gross_amount, fee_rate, fee_amount, status, created_at, updated_at)
      VALUES (?, ?, 'auction', ?, ?, ?, ?, ?, 'unpaid', datetime('now'), datetime('now'))
    `).bind(
      crypto.randomUUID(),
      auction.seller_id,
      auctionId,
      `Auction settlement — "${auction.title}" — final bid ${finalBid}`,
      finalBid,
      feeRate,
      feeAmount,
    ).run()

    await db.prepare("UPDATE auctions SET fee_recorded = 1, updated_at = datetime('now') WHERE id = ?")
      .bind(auctionId).run()

    return NextResponse.json({ success: true, feeAmount, feeRate })
  } catch (error) {
    console.error("Settle auction error:", error)
    return NextResponse.json({ success: false, error: "Failed to settle auction" }, { status: 500 })
  }
}
