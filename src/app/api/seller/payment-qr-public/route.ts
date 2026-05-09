import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

/**
 * GET /api/seller/payment-qr-public?sellerId=<profileId>
 *
 * Public endpoint — no auth required.
 * Returns the seller's payment_qr_url, business_name, and full_name
 * so the checkout page can display the QR without the buyer needing
 * seller credentials.
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get("sellerId")

    if (!sellerId) {
      return NextResponse.json({ success: false, error: "sellerId is required" }, { status: 400 })
    }

    // Try by profiles.id first (canonical path), then fall back to user_id
    let profile = await db
      .prepare("SELECT full_name, business_name, payment_qr_url FROM profiles WHERE id = ?")
      .bind(sellerId)
      .first<{ full_name: string; business_name: string | null; payment_qr_url: string | null }>()

    if (!profile) {
      profile = await db
        .prepare("SELECT full_name, business_name, payment_qr_url FROM profiles WHERE user_id = ?")
        .bind(sellerId)
        .first<{ full_name: string; business_name: string | null; payment_qr_url: string | null }>()
    }

    if (!profile) {
      return NextResponse.json({ success: false, error: "Seller not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      payment_qr_url: profile.payment_qr_url,
      seller_name: profile.full_name,
      seller_business: profile.business_name,
    })
  } catch (error) {
    console.error("Public QR fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch QR" }, { status: 500 })
  }
}
