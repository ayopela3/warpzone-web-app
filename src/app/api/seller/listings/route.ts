import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

/**
 * GET /api/seller/listings
 * Returns the authenticated seller's own product listings (approved products only).
 * Used to populate the auction creation form dropdown.
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    // Authenticate via session cookie or Authorization header
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

    // Get seller profile id
    const profile = await db
      .prepare("SELECT id, role FROM profiles WHERE user_id = ?")
      .bind(session.user_id)
      .first<{ id: string; role: string }>()

    if (!profile || profile.role !== "seller") {
      return NextResponse.json({ success: false, error: "Seller access required" }, { status: 403 })
    }

    const listings = await db
      .prepare(
        `SELECT
           pl.id,
           pl.condition,
           pl.price,
           pl.quantity,
           p.id        AS product_id,
           p.name      AS product_name,
           p.category,
           p.rarity,
           p.image_url
         FROM product_listings pl
         JOIN products p ON pl.product_id = p.id
         WHERE pl.seller_id = ?
           AND p.approval_status = 'approved'
           AND p.is_active = 1
         ORDER BY p.name ASC`
      )
      .bind(profile.id)
      .all()

    return NextResponse.json({ success: true, listings: listings.results })
  } catch (error) {
    console.error("Seller listings fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch listings" }, { status: 500 })
  }
}
