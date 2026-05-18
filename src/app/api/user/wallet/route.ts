import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function resolveUserId(
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
  return session.user_id
}

// ---------------------------------------------------------------------------
// GET /api/user/wallet — buyer's credit balance + transaction history
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const db = await getDb()
  if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

  try {
    const userId = await resolveUserId(request, db)
    if (!userId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const wallet = await db
      .prepare("SELECT amount FROM wallet_credits WHERE user_id = ?")
      .bind(userId)
      .first<{ amount: number }>()

    const transactions = await db
      .prepare(`
        SELECT wt.*, po.title AS pre_order_title, pr.business_name AS seller_name
        FROM wallet_transactions wt
        LEFT JOIN pre_order_reservations por ON wt.source_id = por.id
        LEFT JOIN pre_orders po ON por.pre_order_id = po.id
        LEFT JOIN profiles pr ON wt.seller_id = pr.id
        WHERE wt.user_id = ?
        ORDER BY wt.created_at DESC
        LIMIT 50
      `)
      .bind(userId)
      .all<Record<string, unknown>>()

    return NextResponse.json({
      success: true,
      balance: wallet?.amount ?? 0,
      transactions: transactions.results,
    })
  } catch (error) {
    console.error("GET /api/user/wallet error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch wallet" }, { status: 500 })
  }
}
