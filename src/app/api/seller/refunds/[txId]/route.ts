import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function resolveSellerProfile(
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
  const profile = await db
    .prepare("SELECT id, role FROM profiles WHERE user_id = ?")
    .bind(session.user_id)
    .first<{ id: string; role: string }>()
  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) return null
  return profile
}

// ---------------------------------------------------------------------------
// PATCH /api/seller/refunds/[txId] — seller marks a refund as settled
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ txId: string }> }
) {
  const db = await getDb()
  if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

  try {
    const { txId } = await params
    const profile = await resolveSellerProfile(request, db)
    if (!profile) return NextResponse.json({ success: false, error: "Not authorised" }, { status: 403 })

    // Verify this refund request belongs to this seller
    const tx = await db
      .prepare("SELECT id, user_id, amount, type, seller_id, source_id FROM wallet_transactions WHERE id = ?")
      .bind(txId)
      .first<{ id: string; user_id: string; amount: number; type: string; seller_id: string | null; source_id: string | null }>()

    if (!tx) return NextResponse.json({ success: false, error: "Refund request not found" }, { status: 404 })
    if (tx.seller_id !== profile.id && profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
    if (tx.type !== "refund_request") {
      return NextResponse.json({ success: false, error: "Not a pending refund request" }, { status: 400 })
    }

    // Mark the request as refunded
    await db.prepare("UPDATE wallet_transactions SET type = 'refunded' WHERE id = ?").bind(txId).run()

    // Deduct from buyer's wallet credit (credit consumed by cash refund)
    await db.prepare(`
      UPDATE wallet_credits
      SET amount = MAX(0, amount - ?), updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(tx.amount, tx.user_id).run()

    // Log the debit
    await db.prepare(`
      INSERT INTO wallet_transactions (id, user_id, type, amount, source_type, source_id, seller_id, note)
      VALUES (?, ?, 'debit', ?, 'pre_order_refund', ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      tx.user_id,
      tx.amount,
      tx.source_id,
      profile.id,
      "Cash refund settled by seller",
    ).run()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PATCH /api/seller/refunds/[txId] error:", error)
    return NextResponse.json({ success: false, error: "Failed to settle refund" }, { status: 500 })
  }
}
