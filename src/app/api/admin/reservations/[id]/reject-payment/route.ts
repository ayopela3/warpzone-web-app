import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// POST /api/admin/reservations/[id]/reject-payment — admin rejects payment
// Body: { reason?: string }
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    // Verify admin session
    const sessionId =
      request.cookies.get("__Secure-wz_session")?.value ??
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

    const body = await request.json().catch(() => ({}))

    // Check reservation exists
    const reservation = await db
      .prepare("SELECT id FROM pre_order_reservations WHERE id = ?")
      .bind(id)
      .first<{ id: string }>()

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 })
    }

    // Update reservation as rejected/refunded
    await db.prepare(`
      UPDATE pre_order_reservations
      SET paid = 0, is_paid = 0, total_paid = 0, allocation_status = 'refunded'
      WHERE id = ?
    `).bind(id).run()

    return NextResponse.json({
      success: true,
      message: "Payment rejected successfully",
      reason: body.reason || null
    })
  } catch (error) {
    console.error("Payment rejection error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ""
    return NextResponse.json({
      success: false,
      error: `Failed to reject payment: ${errorMessage}`,
      details: errorMessage,
      stack: errorStack
    }, { status: 500 })
  }
}
