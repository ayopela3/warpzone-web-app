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

/** GET /api/admin/redemptions — all redemption requests with user + item info */
export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    if (!(await requireAdmin(request, db))) {
      return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const where = status ? "WHERE rr.status = ?" : ""
    const params = status ? [status] : []

    const rows = await db.prepare(`
      SELECT
        rr.id,
        rr.user_id,
        rr.reward_item_id,
        rr.points_spent,
        rr.status,
        rr.note,
        rr.created_at,
        rr.updated_at,
        ri.name        AS item_name,
        ri.image_url   AS item_image_url,
        ri.points_cost AS item_points_cost,
        p.full_name    AS user_name,
        u.email        AS user_email
      FROM reward_redemptions rr
      LEFT JOIN reward_items ri ON rr.reward_item_id = ri.id
      LEFT JOIN users u         ON rr.user_id = u.id
      LEFT JOIN profiles p      ON rr.user_id = p.user_id
      ${where}
      ORDER BY rr.created_at DESC
    `).bind(...params).all()

    return NextResponse.json({ success: true, redemptions: rows.results })
  } catch (error) {
    console.error("GET /api/admin/redemptions error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch redemptions" }, { status: 500 })
  }
}
