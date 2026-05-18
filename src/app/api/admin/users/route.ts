import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { requireAdmin } from "@/lib/auth"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// GET /api/admin/users — list all users with profile + ban state
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    await requireAdmin(request, db)

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
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
    console.error("Admin users list error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 })
  }
}
