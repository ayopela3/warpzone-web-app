import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import type { OrderStatus } from "@/types"

export const runtime = "edge"

const ALLOWED_STATUSES: OrderStatus[] = [
  "confirming_payment",
  "confirmed",
  "ready_for_pickup",
  "shortlisted",
  "out_of_stock",
  "cancelled",
]

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
    .prepare("SELECT id, role FROM profiles WHERE user_id = ?")
    .bind(session.user_id)
    .first<{ id: string; role: string }>()

  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) return null
  return profile
}

// ---------------------------------------------------------------------------
// PUT /api/seller/orders/[id]/status — seller updates order status
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const profile = await resolveSellerProfile(request, db)
    if (!profile) return NextResponse.json({ success: false, error: "Not authorised" }, { status: 403 })

    const body = await request.json() as { status: OrderStatus }
    const { status } = body

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: `Invalid status: ${status}` }, { status: 400 })
    }

    const order = await db
      .prepare("SELECT id, seller_id FROM orders WHERE id = ?")
      .bind(id)
      .first<{ id: string; seller_id: string }>()

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    if (order.seller_id !== profile.id && profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    await db
      .prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(status, id)
      .run()

    // ── Award loyalty points and create service fee when order is positively confirmed (idempotent) ──
    const POSITIVE_STATUSES = ["confirmed", "ready_for_pickup", "shortlisted"]
    if (POSITIVE_STATUSES.includes(status)) {
      const fullOrder = await db
        .prepare("SELECT user_id, seller_id, total, points_awarded FROM orders WHERE id = ?")
        .bind(id)
        .first<{ user_id: string; seller_id: string; total: number; points_awarded: number }>()

      if (fullOrder && !fullOrder.points_awarded) {
        const rateSetting = await db
          .prepare("SELECT value FROM settings WHERE key = 'points_earn_rate'")
          .first<{ value: string }>()
        const earnRate = rateSetting ? parseInt(rateSetting.value, 10) : 100
        const pointsEarned = Math.floor(fullOrder.total / earnRate)

        if (pointsEarned > 0) {
          await db.prepare(`
            INSERT INTO points_ledger (id, user_id, type, points, source_type, source_id, note, created_at)
            VALUES (?, ?, 'earn', ?, 'order', ?, ?, datetime('now'))
          `).bind(
            crypto.randomUUID(),
            fullOrder.user_id,
            pointsEarned,
            id,
            `Earned from order #${id.slice(0, 8).toUpperCase()} — ₱${fullOrder.total.toLocaleString()}`,
          ).run()

          await db.prepare("UPDATE orders SET points_awarded = 1, updated_at = datetime('now') WHERE id = ?")
            .bind(id).run()
        }
      }

      // Check if any items in this order are pre-order items
      const preOrderItems = await db
        .prepare(`
          SELECT oi.pre_order_id, oi.quantity, oi.price,
                 por.id AS reservation_id, por.fee_recorded
          FROM order_items oi
          LEFT JOIN pre_order_reservations por
            ON por.pre_order_id = oi.pre_order_id AND por.user_id = (SELECT user_id FROM orders WHERE id = ?)
          WHERE oi.order_id = ? AND oi.pre_order_id IS NOT NULL
        `)
        .bind(id, id)
        .all<{ pre_order_id: string; quantity: number; price: number; reservation_id: string | null; fee_recorded: number | null }>()

      if (preOrderItems.results.length > 0) {
        // Handle pre-order items — mark reservations paid and record pre-order fees
        const preOrderFeeRateSetting = await db
          .prepare("SELECT value FROM settings WHERE key = 'pre_order_service_fee_rate'")
          .first<{ value: string }>()
        const preOrderFeeRate = preOrderFeeRateSetting ? parseFloat(preOrderFeeRateSetting.value) : 0.05

        for (const item of preOrderItems.results) {
          // Mark reservation as paid if found and not yet recorded
          if (item.reservation_id && !item.fee_recorded) {
            const gross = item.price * item.quantity
            const fee   = Math.round(gross * preOrderFeeRate * 100) / 100

            await db.prepare(`
              INSERT OR IGNORE INTO service_fees
                (id, seller_id, source_type, source_id, description, gross_amount, fee_rate, fee_amount, status, created_at, updated_at)
              VALUES (?, ?, 'pre_order', ?, ?, ?, ?, ?, 'unpaid', datetime('now'), datetime('now'))
            `).bind(
              crypto.randomUUID(),
              fullOrder!.seller_id,
              item.pre_order_id,
              `Pre-order payment — order #${id.slice(0, 8).toUpperCase()} qty ${item.quantity}`,
              gross,
              preOrderFeeRate,
              fee,
            ).run()

            await db.prepare(`
              UPDATE pre_order_reservations
              SET paid = 1, is_paid = 1, fee_recorded = 1,
                  total_paid = ?, updated_at = datetime('now')
              WHERE id = ?
            `).bind(item.price * item.quantity, item.reservation_id).run()
          }
        }
      } else {
        // Regular product order — record generic order-level service fee
        const existingFee = await db
          .prepare("SELECT id FROM service_fees WHERE source_type = 'order' AND source_id = ?")
          .bind(id)
          .first()

        if (!existingFee && fullOrder) {
          const feeRate   = 0.05
          const feeAmount = Math.round(fullOrder.total * feeRate * 100) / 100

          await db.prepare(`
            INSERT INTO service_fees (id, seller_id, source_type, source_id, description, gross_amount, fee_rate, fee_amount, status, created_at, updated_at)
            VALUES (?, ?, 'order', ?, ?, ?, ?, ?, 'unpaid', datetime('now'), datetime('now'))
          `).bind(
            crypto.randomUUID(),
            fullOrder.seller_id,
            id,
            `Order #${id.slice(0, 8).toUpperCase()} - Product sale`,
            fullOrder.total,
            feeRate,
            feeAmount,
          ).run()
        }
      }
    }

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error("Order status update error:", error)
    return NextResponse.json({ success: false, error: "Failed to update order status" }, { status: 500 })
  }
}
