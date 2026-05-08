import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function resolveSellerProfile(
  request: NextRequest,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const sessionId =
    request.cookies.get("wz_session")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "")
  if (!sessionId) return null

  const session = await db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: string; expires_at: string }>()
  if (!session || new Date(session.expires_at) < new Date()) return null

  const profile = await db
    .prepare("SELECT id, role, payment_qr_url FROM profiles WHERE user_id = ?")
    .bind(session.user_id)
    .first<{ id: string; role: string; payment_qr_url: string | null }>()

  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) return null
  return profile
}

// ---------------------------------------------------------------------------
// GET /api/seller/payment-qr — fetch current QR URL
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const profile = await resolveSellerProfile(request, db)
    if (!profile) return NextResponse.json({ success: false, error: "Not authorised" }, { status: 403 })

    return NextResponse.json({ success: true, payment_qr_url: profile.payment_qr_url })
  } catch (error) {
    console.error("Payment QR fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch QR" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PUT /api/seller/payment-qr — save QR URL (after uploading via /api/upload)
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const profile = await resolveSellerProfile(request, db)
    if (!profile) return NextResponse.json({ success: false, error: "Not authorised" }, { status: 403 })

    const { payment_qr_url } = await request.json() as { payment_qr_url: string }

    if (!payment_qr_url) {
      return NextResponse.json({ success: false, error: "payment_qr_url is required" }, { status: 400 })
    }

    await db
      .prepare("UPDATE profiles SET payment_qr_url = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(payment_qr_url, profile.id)
      .run()

    return NextResponse.json({ success: true, payment_qr_url })
  } catch (error) {
    console.error("Payment QR update error:", error)
    return NextResponse.json({ success: false, error: "Failed to update QR" }, { status: 500 })
  }
}
