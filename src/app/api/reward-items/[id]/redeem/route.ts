import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function resolveUser(
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

/**
 * POST /api/reward-items/[id]/redeem
 * Authenticated user submits a redemption request for a reward item.
 * Deducts points from ledger immediately (pending fulfilment).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rewardItemId } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const userId = await resolveUser(request, db)
    if (!userId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    // Fetch reward item
    const item = await db.prepare(
      "SELECT id, name, points_cost, stock, is_active FROM reward_items WHERE id = ?"
    ).bind(rewardItemId).first<{
      id: string; name: string; points_cost: number; stock: number | null; is_active: number
    }>()

    if (!item || !item.is_active) {
      return NextResponse.json({ success: false, error: "Reward item not found or inactive" }, { status: 404 })
    }

    // Check stock
    if (item.stock !== null && item.stock <= 0) {
      return NextResponse.json({ success: false, error: "This reward is out of stock" }, { status: 400 })
    }

    // Check user balance
    const balanceRow = await db.prepare(
      "SELECT COALESCE(SUM(points), 0) AS balance FROM points_ledger WHERE user_id = ?"
    ).bind(userId).first<{ balance: number }>()
    const balance = balanceRow?.balance ?? 0

    if (balance < item.points_cost) {
      return NextResponse.json({
        success: false,
        error: `Insufficient points. You have ${balance} pts, this item costs ${item.points_cost} pts.`,
      }, { status: 400 })
    }

    const redemptionId = crypto.randomUUID()

    // Deduct points (negative entry)
    await db.prepare(`
      INSERT INTO points_ledger (id, user_id, type, points, source_type, source_id, note, created_at)
      VALUES (?, ?, 'redeem', ?, 'redemption', ?, ?, datetime('now'))
    `).bind(
      crypto.randomUUID(),
      userId,
      -item.points_cost,
      redemptionId,
      `Redeemed: ${item.name}`,
    ).run()

    // Create redemption record
    await db.prepare(`
      INSERT INTO reward_redemptions (id, user_id, reward_item_id, points_spent, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
    `).bind(redemptionId, userId, rewardItemId, item.points_cost).run()

    // Decrement stock if finite
    if (item.stock !== null) {
      await db.prepare("UPDATE reward_items SET stock = stock - 1, updated_at = datetime('now') WHERE id = ?")
        .bind(rewardItemId).run()
    }

    return NextResponse.json({ success: true, redemptionId })
  } catch (error) {
    console.error("POST /api/reward-items/[id]/redeem error:", error)
    return NextResponse.json({ success: false, error: "Failed to submit redemption" }, { status: 500 })
  }
}
