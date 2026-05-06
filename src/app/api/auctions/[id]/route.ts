import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

/**
 * GET /api/auctions/:id
 * Returns a single auction with computed real-time status and recent bid history.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auctionId } = await params

    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const [auction, bidsResult] = await Promise.all([
      db
        .prepare(
          `SELECT
             a.id, a.seller_id, a.title, a.description, a.category, a.condition, a.rarity, a.image_url,
             a.starting_price, a.current_bid, a.min_bid_increment, a.start_time, a.end_time,
             CASE
               WHEN datetime('now') < a.start_time THEN 'upcoming'
               WHEN datetime('now') > a.end_time   THEN 'ended'
               ELSE 'active'
             END AS status,
             pr.full_name AS seller_name,
             pr.business_name
           FROM auctions a
           LEFT JOIN profiles pr ON a.seller_id = pr.id
           WHERE a.id = ?`
        )
        .bind(auctionId)
        .first(),

      db
        .prepare(
          `SELECT ab.bid_amount, ab.bid_time, p.full_name AS bidder_name
           FROM auction_bids ab
           LEFT JOIN profiles p ON ab.user_id = p.user_id
           WHERE ab.auction_id = ?
           ORDER BY ab.bid_time DESC`
        )
        .bind(auctionId)
        .all(),
    ])

    if (!auction) {
      return NextResponse.json({ success: false, error: "Auction not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      auction,
      bids: bidsResult.results,
    })
  } catch (error) {
    console.error("Get auction error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch auction" }, { status: 500 })
  }
}
