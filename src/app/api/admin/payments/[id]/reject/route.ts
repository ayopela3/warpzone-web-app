import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// POST /api/admin/payments/[id]/reject - reject a specific payment
// Body: { reason: string, notes?: string }
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

    const { reason } = await request.json()
    
    if (!reason || reason.trim() === "") {
      return NextResponse.json({ success: false, error: "Rejection reason is required" }, { status: 400 })
    }

    try {
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

      // Update order status and payment status
      const result = await db.prepare(`
        UPDATE orders 
        SET status = 'cancelled',
            payment_status = 'rejected',
            payment_rejected_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(id).run()

      if (result.meta.changes === 0) {
        return NextResponse.json({ success: false, error: "No rows updated" }, { status: 400 })
      }

      // Check if this order has pre-order items and update corresponding reservations
      const preOrderItems = await db.prepare(`
        SELECT oi.pre_order_id, o.user_id
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.order_id = ? AND oi.pre_order_id IS NOT NULL
      `).bind(id).all<{ pre_order_id: string; user_id: string }>()

      for (const item of preOrderItems.results) {
        await db.prepare(`
          UPDATE pre_order_reservations
          SET allocation_status = 'refunded', updated_at = datetime('now')
          WHERE pre_order_id = ? AND user_id = ?
        `).bind(item.pre_order_id, item.user_id).run()
      }

      return NextResponse.json({
        success: true,
        message: "Payment rejected successfully",
        order_id: id,
        status: "cancelled",
        rejection_reason: reason.trim()
      })
    } catch (error) {
      console.error("Payment rejection error:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : ""
      console.error("Error stack:", errorStack)
      return NextResponse.json({
        success: false,
        error: `Failed to reject payment: ${errorMessage}`,
        details: errorMessage,
        stack: errorStack
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Payment rejection error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ""
    console.error("Error stack:", errorStack)
    return NextResponse.json({
      success: false,
      error: `Failed to reject payment: ${errorMessage}`,
      details: errorMessage,
      stack: errorStack
    }, { status: 500 })
  }
}
