import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// POST /api/pre-orders/[id]/reserve — buyer reserves a slot
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

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

    const { quantity = 1 } = await request.json() as { quantity?: number }

    if (quantity < 1 || !Number.isInteger(quantity)) {
      return NextResponse.json({ success: false, error: "Quantity must be a positive integer" }, { status: 400 })
    }

    // Verify pre-order exists, is active, and is approved - get price info too
    const preOrder = await db
      .prepare("SELECT id, status, approval_status, max_slots, price, full_price, downpayment_amount, cutoff_date FROM pre_orders WHERE id = ?")
      .bind(id)
      .first<{
        id: string
        status: string
        approval_status: string
        max_slots: number | null
        price: number
        full_price: number
        downpayment_amount: number | null
        cutoff_date: string | null
      }>()

    if (!preOrder) return NextResponse.json({ success: false, error: "Pre-order not found" }, { status: 404 })
    if (preOrder.status !== "active") {
      return NextResponse.json({ success: false, error: "This pre-order is closed" }, { status: 400 })
    }
    if (preOrder.approval_status !== "approved") {
      return NextResponse.json({ success: false, error: "Pre-order is not yet available" }, { status: 400 })
    }
    // Enforce cutoff date
    if (preOrder.cutoff_date && new Date(preOrder.cutoff_date) < new Date()) {
      return NextResponse.json({ success: false, error: "The reservation cutoff date has passed" }, { status: 400 })
    }

    // Check max_slots if set
    if (preOrder.max_slots !== null) {
      const countRow = await db
        .prepare("SELECT COUNT(*) as total FROM pre_order_reservations WHERE pre_order_id = ?")
        .bind(id)
        .first<{ total: number }>()
      if ((countRow?.total ?? 0) >= preOrder.max_slots) {
        return NextResponse.json({ success: false, error: "All slots are taken for this pre-order" }, { status: 409 })
      }
    }

    // Check if user already reserved — update quantity if so
    const existing = await db
      .prepare("SELECT id FROM pre_order_reservations WHERE pre_order_id = ? AND user_id = ?")
      .bind(id, session.user_id)
      .first<{ id: string }>()

    if (existing) {
      await db
        .prepare("UPDATE pre_order_reservations SET quantity = ? WHERE id = ?")
        .bind(quantity, existing.id)
        .run()
      return NextResponse.json({ success: true, reservationId: existing.id, updated: true })
    }

    // Calculate payment amounts
    const isDownpayment = preOrder.downpayment_amount !== null && preOrder.downpayment_amount > 0
    const downpaymentAmount = isDownpayment ? preOrder.downpayment_amount! * quantity : 0
    const fullAmount = preOrder.full_price * quantity
    const remainingBalance = isDownpayment ? fullAmount - downpaymentAmount : 0

    const reservationId = crypto.randomUUID()
    await db
      .prepare(
        `INSERT INTO pre_order_reservations 
           (id, pre_order_id, user_id, quantity, unit_price, unit_full_price, downpayment_amount, remaining_balance, reserved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        reservationId, 
        id, 
        session.user_id, 
        quantity,
        preOrder.price,
        preOrder.full_price,
        downpaymentAmount,
        remainingBalance
      )
      .run()

    return NextResponse.json({ 
      success: true, 
      reservationId,
      payment: {
        type: isDownpayment ? 'downpayment' : 'full',
        amount: isDownpayment ? downpaymentAmount : fullAmount,
        remaining_balance: remainingBalance,
        full_total: fullAmount
      }
    })
  } catch (error) {
    console.error("Pre-order reserve error:", error)
    return NextResponse.json({ success: false, error: "Failed to reserve pre-order" }, { status: 500 })
  }
}
