import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// GET /api/pre-orders/[id]/reservations — get detailed customer reservations for admin
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    // Admin-only endpoint
    try {
      await requireAdmin(request, db)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Forbidden"
      const status = msg === "Not authenticated" ? 401 : 403
      return NextResponse.json({ success: false, error: msg }, { status })
    }

    // Get detailed reservation information
    const reservations = await db.prepare(`
      SELECT
        por.id,
        por.user_id,
        por.quantity,
        por.reserved_at,
        por.paid,
        por.is_paid,
        por.total_paid,
        por.unit_price,
        por.unit_full_price,
        por.downpayment_paid,
        por.downpayment_amount,
        por.remaining_balance,
        por.allocation_status,
        pr.full_name AS buyer_name,
        u.email AS buyer_email
      FROM pre_order_reservations por
      JOIN users u ON por.user_id = u.id
      LEFT JOIN profiles pr ON por.user_id = pr.user_id
      WHERE por.pre_order_id = ?
      ORDER BY por.reserved_at DESC
    `).bind(id).all<{
      id: string
      user_id: string
      quantity: number
      reserved_at: string
      paid: number
      is_paid: number
      total_paid: number
      unit_price: number
      unit_full_price: number
      downpayment_paid: number
      downpayment_amount: number
      remaining_balance: number
      allocation_status: string
      buyer_name: string
      buyer_email: string
    }>()

    return NextResponse.json({ 
      success: true, 
      reservations: reservations.results 
    })
  } catch (error) {
    console.error("Pre-order reservations error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch reservations" }, { status: 500 })
  }
}
