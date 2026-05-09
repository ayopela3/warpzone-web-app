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
    .prepare("SELECT role FROM profiles WHERE user_id = ?")
    .bind(session.user_id)
    .first<{ role: string }>()
  if (!profile || profile.role !== "admin") return null
  return true
}

/**
 * GET /api/admin/sellers
 * Returns all pending-seller applications.
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    if (!await resolveAdmin(request, db)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

    const sellers = await db
      .prepare(`
        SELECT
          u.id          AS user_id,
          u.email,
          u.created_at,
          p.full_name,
          p.business_name,
          p.phone_number,
          p.city,
          p.province,
          p.role
        FROM users u
        JOIN profiles p ON p.user_id = u.id
        WHERE p.role IN ('pending-seller', 'seller')
        ORDER BY u.created_at DESC
      `)
      .all<Record<string, unknown>>()

    return NextResponse.json({ success: true, sellers: sellers.results })
  } catch (error) {
    console.error("Admin sellers list error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch sellers" }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/sellers
 * Body: { userId: string, action: "approve" | "reject" }
 * Approve sets role → "seller", reject sets role → "regular-user".
 */
export async function PATCH(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    if (!await resolveAdmin(request, db)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

    const { userId, action } = await request.json() as { userId: string; action: "approve" | "reject" }

    if (!userId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 })
    }

    const newRole = action === "approve" ? "seller" : "regular-user"

    await db
      .prepare("UPDATE profiles SET role = ?, updated_at = datetime('now') WHERE user_id = ?")
      .bind(newRole, userId)
      .run()

    return NextResponse.json({ success: true, role: newRole })
  } catch (error) {
    console.error("Admin seller approval error:", error)
    return NextResponse.json({ success: false, error: "Failed to update seller status" }, { status: 500 })
  }
}
