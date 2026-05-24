import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// POST /api/admin/reservations/[id]/approve-payment — admin approves payment
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

    // Get reservation details
    const reservation = await db
      .prepare(`
        SELECT pre_order_id, quantity, unit_price, downpayment_amount
        FROM pre_order_reservations 
        WHERE id = ?
      `)
      .bind(id)
      .first<{ pre_order_id: string; quantity: number; unit_price: number; downpayment_amount: number | null }>()

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 })
    }

    // Calculate payment amount
    const totalAmount = reservation.quantity * reservation.unit_price

    // Update reservation as paid
    await db.prepare(`
      UPDATE pre_order_reservations 
      SET paid = 1, is_paid = 1, total_paid = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(totalAmount, id).run()

    return NextResponse.json({ success: true, message: "Payment approved successfully" })
  } catch (error) {
    console.error("Payment approval error:", error)
    return NextResponse.json({ success: false, error: "Failed to approve payment" }, { status: 500 })
  }
}
