import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// GET /api/admin/payments - get all payments with filtering and pagination
// Query params: status, user_id, seller_id, date_from, date_to, page, limit
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const userId = searchParams.get("user_id")
    const sellerId = searchParams.get("seller_id")
    const dateFrom = searchParams.get("date_from")
    const dateTo = searchParams.get("date_to")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    // Build query
    let whereClause = "WHERE 1=1"
    const params: string[] = []

    if (status) {
      whereClause += " AND o.status = ?"
      params.push(status)
    }
    if (userId) {
      whereClause += " AND o.user_id = ?"
      params.push(userId)
    }
    if (sellerId) {
      whereClause += " AND o.seller_id = ?"
      params.push(sellerId)
    }
    if (dateFrom) {
      whereClause += " AND o.created_at >= ?"
      params.push(dateFrom)
    }
    if (dateTo) {
      whereClause += " AND o.created_at <= ?"
      params.push(dateTo)
    }

    // Get payments with user and seller details
    const paymentsQuery = `
      SELECT 
        o.*,
        u.email as user_email,
        up.full_name as user_name,
        sp.full_name as seller_name,
        sp.business_name as seller_business,
        COUNT(oi.id) as item_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN profiles up ON o.user_id = up.user_id
      LEFT JOIN profiles sp ON o.seller_id = sp.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `

    const payments = await db
      .prepare(paymentsQuery)
      .bind(...params, limit, offset)
      .all()

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      ${whereClause}
    `
    const countResult = await db
      .prepare(countQuery)
      .bind(...params)
      .first<{ total: number }>()

    const totalPages = Math.ceil((countResult?.total || 0) / limit)

    return NextResponse.json({
      success: true,
      payments: payments.results,
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error("Admin payments GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch payments" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/payments - bulk payment operations
// Body: { action: "approve"|"reject", order_ids: string[], notes?: string, reason?: string }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
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

    const { action, order_ids, notes, reason } = await request.json()

    if (!action || !order_ids || !Array.isArray(order_ids)) {
      return NextResponse.json({ success: false, error: "Invalid request parameters" }, { status: 400 })
    }

    const results = []
    const adminUserId = session.user_id

    for (const orderId of order_ids) {
      try {
        await db.exec("BEGIN TRANSACTION")

        // Get current order status
        const order = await db
          .prepare("SELECT status FROM orders WHERE id = ?")
          .bind(orderId)
          .first<{ status: string }>()

        if (!order) {
          results.push({ orderId, success: false, error: "Order not found" })
          await db.exec("ROLLBACK")
          continue
        }

        const oldStatus = order.status

        if (action === "approve") {
          // Update order status
          await db.prepare(`
            UPDATE orders 
            SET status = 'confirmed',
                updated_at = datetime('now')
            WHERE id = ?
          `).bind(orderId).run()

          // Log audit trail
          await db.prepare(`
            INSERT INTO payment_audit_log (id, order_id, action, old_status, new_status, admin_user_id, admin_notes, created_at)
            VALUES (?, ?, 'approved', ?, 'confirmed', ?, ?, datetime('now'))
          `).bind(
            `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            orderId,
            oldStatus,
            adminUserId,
            notes || ""
          ).run()

        } else if (action === "reject") {
          // Update order status
          await db.prepare(`
            UPDATE orders 
            SET status = 'cancelled',
                updated_at = datetime('now')
            WHERE id = ?
          `).bind(orderId).run()

          // Log audit trail
          await db.prepare(`
            INSERT INTO payment_audit_log (id, order_id, action, old_status, new_status, admin_user_id, admin_notes, created_at)
            VALUES (?, ?, 'rejected', ?, 'rejected', ?, ?, datetime('now'))
          `).bind(
            `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            orderId,
            oldStatus,
            adminUserId,
            `Rejected: ${reason || ""} | Notes: ${notes || ""}`
          ).run()
        }

        await db.exec("COMMIT")
        results.push({ orderId, success: true })

      } catch {
        await db.exec("ROLLBACK")
        results.push({ orderId, success: false, error: "Database error" })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    })
  } catch (error) {
    console.error("Admin payments POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to process payments" }, { status: 500 })
  }
}
