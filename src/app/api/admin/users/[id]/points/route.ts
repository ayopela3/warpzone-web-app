import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function requireAdmin(
  request: NextRequest,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<boolean> {
  const sessionId =
    request.cookies.get("wz_session")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "")
  if (!sessionId) return false
  const session = await db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: string; expires_at: string }>()
  if (!session || new Date(session.expires_at) < new Date()) return false
  const profile = await db
    .prepare("SELECT role FROM profiles WHERE user_id = ?")
    .bind(session.user_id)
    .first<{ role: string }>()
  return profile?.role === "admin"
}

/**
 * POST /api/admin/users/[id]/points
 * Admin-only. Manually award or deduct points for a user.
 * Body: { points: number (positive = award, negative = deduct), note?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    if (!(await requireAdmin(request, db))) {
      return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 })
    }

    const body = await request.json() as { points: number; note?: string }

    if (!body.points || body.points === 0) {
      return NextResponse.json({ success: false, error: "points must be non-zero" }, { status: 400 })
    }

    const user = await db
      .prepare("SELECT id FROM users WHERE id = ?")
      .bind(userId)
      .first<{ id: string }>()
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })

    // Guard against deductions leaving a negative balance
    if (body.points < 0) {
      const balanceRow = await db
        .prepare("SELECT COALESCE(SUM(points), 0) AS balance FROM points_ledger WHERE user_id = ?")
        .bind(userId)
        .first<{ balance: number }>()
      const balance = balanceRow?.balance ?? 0
      if (balance + body.points < 0) {
        return NextResponse.json({
          success: false,
          error: `Deduction exceeds current balance of ${balance} pts`,
        }, { status: 400 })
      }
    }

    await db.prepare(`
      INSERT INTO points_ledger (id, user_id, type, points, source_type, source_id, note, created_at)
      VALUES (?, ?, 'adjust', ?, 'manual', NULL, ?, datetime('now'))
    `).bind(
      crypto.randomUUID(),
      userId,
      body.points,
      body.note?.trim() || (body.points > 0 ? "Admin award" : "Admin deduction"),
    ).run()

    const newBalance = await db
      .prepare("SELECT COALESCE(SUM(points), 0) AS balance FROM points_ledger WHERE user_id = ?")
      .bind(userId)
      .first<{ balance: number }>()

    return NextResponse.json({ success: true, newBalance: newBalance?.balance ?? 0 })
  } catch (error) {
    console.error("POST /api/admin/users/[id]/points error:", error)
    return NextResponse.json({ success: false, error: "Failed to adjust points" }, { status: 500 })
  }
}
