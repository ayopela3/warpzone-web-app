import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function resolveUserId(
  request: NextRequest,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const sessionId =
    request.cookies.get("__Secure-wz_session")?.value ??
      request.cookies.get("wz_session")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "")
  if (!sessionId) return null
  const session = await db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: string; expires_at: string }>()
  if (!session || new Date(session.expires_at) < new Date()) return null
  return session.user_id
}

// ---------------------------------------------------------------------------
// POST /api/user/wallet/refund-request
// Body: { reservation_id: string }
// Converts the 'credit' transaction to a 'refund_request' so the seller sees it
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const db = await getDb()
  if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

  try {
    const userId = await resolveUserId(request, db)
    if (!userId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const body = await request.json() as { reservation_id?: string }
    if (!body.reservation_id) {
      return NextResponse.json({ success: false, error: "reservation_id is required" }, { status: 400 })
    }

    // Find the credit transaction for this reservation
    const creditTx = await db
      .prepare(`
        SELECT id, amount, seller_id FROM wallet_transactions
        WHERE user_id = ? AND source_id = ? AND type = 'credit'
        LIMIT 1
      `)
      .bind(userId, body.reservation_id)
      .first<{ id: string; amount: number; seller_id: string | null }>()

    if (!creditTx) {
      return NextResponse.json({ success: false, error: "No credit found for this reservation" }, { status: 404 })
    }

    // Check if a refund request already exists
    const existing = await db
      .prepare(`
        SELECT id FROM wallet_transactions
        WHERE user_id = ? AND source_id = ? AND type = 'refund_request'
        LIMIT 1
      `)
      .bind(userId, body.reservation_id)
      .first<{ id: string }>()

    if (existing) {
      return NextResponse.json({ success: false, error: "Refund already requested" }, { status: 409 })
    }

    // Get pre-order title for the note
    const reservation = await db
      .prepare(`
        SELECT po.title, po.seller_id
        FROM pre_order_reservations por
        JOIN pre_orders po ON po.id = por.pre_order_id
        WHERE por.id = ?
      `)
      .bind(body.reservation_id)
      .first<{ title: string; seller_id: string | null }>()

    // Insert refund_request transaction (keeps credit too until refunded)
    await db.prepare(`
      INSERT INTO wallet_transactions (id, user_id, type, amount, source_type, source_id, seller_id, note)
      VALUES (?, ?, 'refund_request', ?, 'pre_order_refund', ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      userId,
      creditTx.amount,
      body.reservation_id,
      reservation?.seller_id ?? creditTx.seller_id,
      `Cash refund requested — ${reservation?.title ?? "Pre-order"}`,
    ).run()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/user/wallet/refund-request error:", error)
    return NextResponse.json({ success: false, error: "Failed to submit refund request" }, { status: 500 })
  }
}
