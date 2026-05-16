import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

const SETTING_KEY = "platform_payment_qr_url"

// ---------------------------------------------------------------------------
// GET /api/settings/payment-qr — public, used by checkout to show admin QR
// ---------------------------------------------------------------------------
export async function GET() {
  const db = await getDb()
  if (!db) return NextResponse.json({ success: true, payment_qr_url: null })

  try {
    const row = await db
      .prepare("SELECT value FROM settings WHERE key = ?")
      .bind(SETTING_KEY)
      .first<{ value: string }>()

    return NextResponse.json({ success: true, payment_qr_url: row?.value ?? null })
  } catch (error) {
    console.error("GET /api/settings/payment-qr error:", error)
    return NextResponse.json({ success: true, payment_qr_url: null })
  }
}

// ---------------------------------------------------------------------------
// PUT /api/settings/payment-qr — admin only, saves the platform payment QR URL
// Body: { payment_qr_url: string }
// ---------------------------------------------------------------------------
export async function PUT(request: NextRequest) {
  const db = await getDb()
  if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

  try {
    // Verify admin session
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
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    const { payment_qr_url } = await request.json() as { payment_qr_url: string }

    const existing = await db
      .prepare("SELECT id FROM settings WHERE key = ?")
      .bind(SETTING_KEY)
      .first<{ id: string }>()

    if (existing) {
      await db
        .prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?")
        .bind(payment_qr_url ?? "", SETTING_KEY)
        .run()
    } else {
      await db
        .prepare("INSERT INTO settings (id, key, value) VALUES (?, ?, ?)")
        .bind(crypto.randomUUID(), SETTING_KEY, payment_qr_url ?? "")
        .run()
    }

    return NextResponse.json({ success: true, payment_qr_url: payment_qr_url ?? null })
  } catch (error) {
    console.error("PUT /api/settings/payment-qr error:", error)
    return NextResponse.json({ success: false, error: "Failed to save payment QR" }, { status: 500 })
  }
}
