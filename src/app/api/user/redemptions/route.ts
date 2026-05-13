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
 * GET /api/user/redemptions
 * Returns all redemption requests for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const userId = await resolveUser(request, db)
    if (!userId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const rows = await db.prepare(`
      SELECT
        rr.id,
        rr.reward_item_id,
        rr.points_spent,
        rr.status,
        rr.note,
        rr.created_at,
        ri.name      AS item_name,
        ri.image_url AS item_image_url
      FROM reward_redemptions rr
      LEFT JOIN reward_items ri ON rr.reward_item_id = ri.id
      WHERE rr.user_id = ?
      ORDER BY rr.created_at DESC
    `).bind(userId).all()

    return NextResponse.json({ success: true, redemptions: rows.results })
  } catch (error) {
    console.error("GET /api/user/redemptions error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch redemptions" }, { status: 500 })
  }
}
