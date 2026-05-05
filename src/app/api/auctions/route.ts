import { NextRequest, NextResponse } from "next/server"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { listing_id, title, description, starting_price, min_bid_increment, start_time, end_time } = body

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

    // Get user from session
    const sessionToken = request.cookies.get("session")?.value
    if (!sessionToken) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const sessionResult = await db
      .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
      .bind(sessionToken)
      .first<{ user_id: string; expires_at: string }>()

    if (!sessionResult) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 })
    }

    // Check if session is expired
    if (new Date(sessionResult.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "Session expired" }, { status: 401 })
    }

    // Get user profile to check if seller
    const profileResult = await db
      .prepare("SELECT role FROM profiles WHERE user_id = ?")
      .bind(sessionResult.user_id)
      .first<{ role: string }>()

    if (!profileResult || profileResult.role !== "seller") {
      return NextResponse.json({ success: false, error: "Only sellers can create auctions" }, { status: 403 })
    }

    // Get product listing details
    const listingResult = await db
      .prepare("SELECT product_id, seller_id FROM product_listings WHERE id = ?")
      .bind(listing_id)
      .first<{ product_id: string; seller_id: string }>()

    if (!listingResult) {
      return NextResponse.json({ success: false, error: "Product listing not found" }, { status: 404 })
    }

    // Verify seller owns the listing
    if (listingResult.seller_id !== sessionResult.user_id) {
      return NextResponse.json({ success: false, error: "You can only create auctions for your own listings" }, { status: 403 })
    }

    // Generate auction ID
    const auctionId = crypto.randomUUID()

    // Create auction
    await db
      .prepare(
        `INSERT INTO auctions (id, seller_id, product_id, listing_id, title, description, starting_price, current_bid, min_bid_increment, start_time, end_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        auctionId,
        sessionResult.user_id,
        listingResult.product_id,
        listing_id,
        title,
        description || null,
        starting_price,
        starting_price,
        min_bid_increment || 1,
        start_time,
        end_time,
        "upcoming"
      )
      .run()

    return NextResponse.json({ success: true, auctionId })
  } catch (error) {
    console.error("Create auction error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create auction" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
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

    // Get active auctions
    const auctions = await db
      .prepare(
        `SELECT a.*, p.name as product_name, p.image_url, pr.full_name as seller_name, pr.business_name
         FROM auctions a
         JOIN products p ON a.product_id = p.id
         JOIN profiles pr ON a.seller_id = pr.id
         WHERE a.status IN ('upcoming', 'active')
         ORDER BY a.start_time ASC`
      )
      .all()

    return NextResponse.json({ success: true, auctions })
  } catch (error) {
    console.error("Get auctions error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch auctions" },
      { status: 500 }
    )
  }
}
