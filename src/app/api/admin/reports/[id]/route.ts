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
// PATCH /api/admin/reports/[id]
// Body: { action: "dismiss" | "ban"; admin_note?: string; ban_reason?: string }
// "ban" → marks report resolved + bans the reported user + kills their sessions
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const admin = await resolveAdmin(request, db)
    if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

    const report = await db
      .prepare("SELECT id, reported_user_id, status FROM user_reports WHERE id = ?")
      .bind(reportId)
      .first<{ id: string; reported_user_id: string; status: string }>()

    if (!report) return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 })
    if (report.status !== "pending") {
      return NextResponse.json({ success: false, error: "Report already resolved" }, { status: 409 })
    }

    const body = await request.json() as {
      action: "dismiss" | "ban"
      admin_note?: string
      ban_reason?: string
    }

    if (!body.action || !["dismiss", "ban"].includes(body.action)) {
      return NextResponse.json({ success: false, error: "action must be 'dismiss' or 'ban'" }, { status: 400 })
    }

    const newStatus = body.action === "ban" ? "banned" : "dismissed"

    /** Update the report record */
    await db
      .prepare(`
        UPDATE user_reports
        SET status = ?, admin_note = ?, resolved_at = datetime('now')
        WHERE id = ?
      `)
      .bind(newStatus, body.admin_note ?? null, reportId)
      .run()

    /** If banning: update profile + invalidate sessions */
    if (body.action === "ban") {
      /** Verify target is not an admin */
      const targetProfile = await db
        .prepare("SELECT id, role FROM profiles WHERE user_id = ?")
        .bind(report.reported_user_id)
        .first<{ id: string; role: string }>()

      if (targetProfile?.role === "admin") {
        return NextResponse.json({ success: false, error: "Cannot ban an admin" }, { status: 400 })
      }

      await db
        .prepare(`
          UPDATE profiles
          SET is_banned = 1, ban_reason = ?, updated_at = datetime('now')
          WHERE user_id = ?
        `)
        .bind(body.ban_reason ?? body.admin_note ?? "Reported by seller", report.reported_user_id)
        .run()

      await db
        .prepare("DELETE FROM sessions WHERE user_id = ?")
        .bind(report.reported_user_id)
        .run()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Resolve report error:", error)
    return NextResponse.json({ success: false, error: "Failed to resolve report" }, { status: 500 })
  }
}
