import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

/**
 * PUT /api/seller/auctions/:id
 * Allows the auction's seller to update the auction details.
 * Only upcoming auctions can be edited (not live or ended).
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auctionId } = await params
    const body = await request.json()
    const { title, description, category, condition, rarity, image_url, starting_price, min_bid_increment, start_time, end_time } = body

    if (!title || !category || !condition || !starting_price || !start_time || !end_time) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const sessionId =
      request.cookies.get("wz_session")?.value ??
      request.headers.get("Authorization")?.replace("Bearer ", "")

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const session = await db
      .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string; expires_at: string }>()

    if (!session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 401 })
    }

    const profile = await db
      .prepare("SELECT id, role FROM profiles WHERE user_id = ?")
      .bind(session.user_id)
      .first<{ id: string; role: string }>()

    if (!profile || profile.role !== "seller") {
      return NextResponse.json({ success: false, error: "Only sellers can edit auctions" }, { status: 403 })
    }

    // Verify auction exists and belongs to this seller
    const auction = await db
      .prepare("SELECT id, seller_id, status FROM auctions WHERE id = ?")
      .bind(auctionId)
      .first<{ id: string; seller_id: string; status: string }>()

    if (!auction) {
      return NextResponse.json({ success: false, error: "Auction not found" }, { status: 404 })
    }

    if (auction.seller_id !== profile.id) {
      return NextResponse.json({ success: false, error: "You can only edit your own auctions" }, { status: 403 })
    }

    if (auction.status === "active") {
      return NextResponse.json({ success: false, error: "Cannot edit a live auction" }, { status: 400 })
    }

    if (auction.status === "ended") {
      return NextResponse.json({ success: false, error: "Cannot edit an ended auction" }, { status: 400 })
    }

    await db
      .prepare(
        `UPDATE auctions
         SET title = ?, description = ?, category = ?, condition = ?, rarity = ?, image_url = ?,
             starting_price = ?, current_bid = ?, min_bid_increment = ?, start_time = ?, end_time = ?,
             updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        title,
        description ?? null,
        category,
        condition,
        rarity ?? null,
        image_url ?? null,
        starting_price,
        starting_price, // reset current_bid to new starting_price when edited
        min_bid_increment ?? 1,
        start_time,
        end_time,
        auctionId
      )
      .run()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Edit auction error:", error)
    return NextResponse.json({ success: false, error: "Failed to update auction" }, { status: 500 })
  }
}
