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
 * GET /api/user/points
 * Returns the authenticated user's current point balance and last 20 transactions.
 * The point monetary value is intentionally NOT returned to the user.
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const userId = await resolveUser(request, db)
    if (!userId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const [balanceRow, history] = await Promise.all([
      db.prepare("SELECT COALESCE(SUM(points), 0) AS balance FROM points_ledger WHERE user_id = ?")
        .bind(userId)
        .first<{ balance: number }>(),
      db.prepare(`
        SELECT id, type, points, source_type, source_id, note, created_at
        FROM points_ledger
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
      `).bind(userId).all<{
        id: string
        type: string
        points: number
        source_type: string | null
        source_id: string | null
        note: string | null
        created_at: string
      }>(),
    ])

    return NextResponse.json({
      success: true,
      balance: balanceRow?.balance ?? 0,
      history: history.results,
    })
  } catch (error) {
    console.error("GET /api/user/points error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch points" }, { status: 500 })
  }
}
