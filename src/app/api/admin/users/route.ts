import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function resolveAdmin(
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
  if (!profile || profile.role !== "admin") return null
  return profile
}

// ---------------------------------------------------------------------------
// GET /api/admin/users — list all users with profile + ban state
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const admin = await resolveAdmin(request, db)
    if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

    const users = await db
      .prepare(`
        SELECT
          u.id          AS user_id,
          u.email,
          u.created_at,
          p.id          AS profile_id,
          p.full_name,
          p.role,
          p.business_name,
          p.is_banned,
          p.ban_reason,
          COALESCE((
            SELECT SUM(pl.points)
            FROM points_ledger pl
            WHERE pl.user_id = u.id
          ), 0) AS points_balance
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        ORDER BY u.created_at DESC
      `)
      .all<Record<string, unknown>>()

    return NextResponse.json({ success: true, users: users.results })
  } catch (error) {
    console.error("Admin users list error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 })
  }
}
