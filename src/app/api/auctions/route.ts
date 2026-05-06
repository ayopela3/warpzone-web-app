import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title, description, category, condition, rarity, image_url,
      starting_price, min_bid_increment, start_time, end_time,
    } = body

    if (!title || !category || !condition || !starting_price || !start_time || !end_time) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    // Authenticate via cookie (set by signin) or Authorization header
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
      return NextResponse.json({ success: false, error: "Only sellers can create auctions" }, { status: 403 })
    }

    const auctionId = crypto.randomUUID()

    await db
      .prepare(
        `INSERT INTO auctions
           (id, seller_id, title, description, category, condition, rarity, image_url,
            starting_price, current_bid, min_bid_increment, start_time, end_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        auctionId,
        profile.id,
        title,
        description ?? null,
        category,
        condition,
        rarity ?? null,
        image_url ?? null,
        starting_price,
        starting_price, // current_bid starts at starting_price
        min_bid_increment ?? 1,
        start_time,
        end_time,
        "upcoming"
      )
      .run()

    return NextResponse.json({ success: true, auctionId })
  } catch (error) {
    console.error("Create auction error:", error)
    return NextResponse.json({ success: false, error: "Failed to create auction" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    // Auctions are standalone — all fields live on the auctions table itself
    const auctions = await db
      .prepare(
        `SELECT
           a.id,
           a.title,
           a.description,
           a.category,
           a.condition,
           a.rarity,
           a.image_url,
           a.starting_price,
           a.current_bid,
           a.min_bid_increment,
           a.start_time,
           a.end_time,
           CASE
             WHEN datetime('now') < a.start_time THEN 'upcoming'
             WHEN datetime('now') > a.end_time   THEN 'ended'
             ELSE 'active'
           END AS status,
           pr.full_name   AS seller_name,
           pr.business_name
         FROM auctions a
         LEFT JOIN profiles pr ON a.seller_id = pr.id
         ORDER BY a.start_time ASC`
      )
      .all()

    return NextResponse.json({ success: true, auctions: auctions.results })
  } catch (error) {
    console.error("Get auctions error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch auctions" },
      { status: 500 }
    )
  }
}
