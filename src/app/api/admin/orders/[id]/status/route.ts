import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// PATCH /api/admin/orders/[id]/status - update order status
// Body: { status: OrderStatus, notes?: string }
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validate ID format
    if (!id || id.length < 10) {
      return NextResponse.json({ success: false, error: "Invalid order ID" }, { status: 400 })
    }

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

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
    }

    const { status } = body

    // Validate status
    const validStatuses = [
      "pending_payment",
      "payment_submitted", 
      "confirming_payment",
      "confirmed",
      "processing",
      "ready_for_pickup",
      "shortlisted",
      "out_of_stock",
      "cancelled"
    ]

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 })
    }

    // Get current order (simplified query without joins)
    const order = await db
      .prepare(`
        SELECT status, user_id, seller_id
        FROM orders
        WHERE id = ?
      `)
      .bind(id)
      .first<{ status: string; user_id: string; seller_id: string }>()

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    // Update order status and sync payment_status
    let paymentStatus = "pending"
    if (status === "confirmed") {
      paymentStatus = "approved"
    } else if (status === "cancelled") {
      paymentStatus = "rejected"
    } else if (status === "confirming_payment") {
      paymentStatus = "pending"
    }

    const result = await db.prepare(`
      UPDATE orders 
      SET status = ?,
          payment_status = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(status, paymentStatus, id).run()

    if (result.meta.changes === 0) {
      return NextResponse.json({ success: false, error: "No rows updated" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Order status updated successfully",
      order_id: id,
      old_status: order.status,
      new_status: status
    })
  } catch (error) {
    console.error("Order status update error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ""
    console.error("Error stack:", errorStack)
    return NextResponse.json({ 
      success: false, 
      error: `Failed to update order status: ${errorMessage}`,
      details: errorMessage,
      stack: errorStack
    }, { status: 500 })
  }
}
