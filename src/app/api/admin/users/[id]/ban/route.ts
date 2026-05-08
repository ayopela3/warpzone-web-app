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
// PATCH /api/admin/users/[id]/ban
// Body: { banned: boolean; reason?: string }
// [id] is the user_id (from users table)
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const admin = await resolveAdmin(request, db)
    if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

    const body = await request.json() as { banned: boolean; reason?: string }

    /** Prevent admin from banning themselves */
    const targetProfile = await db
      .prepare("SELECT id, role FROM profiles WHERE user_id = ?")
      .bind(userId)
      .first<{ id: string; role: string }>()

    if (!targetProfile) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }
    if (targetProfile.role === "admin") {
      return NextResponse.json({ success: false, error: "Cannot ban another admin" }, { status: 400 })
    }

    await db
      .prepare(
        `UPDATE profiles
         SET is_banned = ?, ban_reason = ?, updated_at = datetime('now')
         WHERE user_id = ?`
      )
      .bind(body.banned ? 1 : 0, body.banned ? (body.reason ?? null) : null, userId)
      .run()

    /** Invalidate all sessions for the banned user so they are logged out immediately */
    if (body.banned) {
      await db
        .prepare("DELETE FROM sessions WHERE user_id = ?")
        .bind(userId)
        .run()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Ban user error:", error)
    return NextResponse.json({ success: false, error: "Failed to update ban status" }, { status: 500 })
  }
}
