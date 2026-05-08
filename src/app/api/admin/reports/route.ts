import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function resolveAdmin(
  request: NextRequest,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
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
// GET /api/admin/reports — list all reports with reporter + reported user info
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db)
      return NextResponse.json(
        { success: false, error: "Database not available" },
        { status: 503 },
      )

    const admin = await resolveAdmin(request, db)
    if (!admin)
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      )

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status") ?? "pending"

    const reports = await db
      .prepare(
        `
        SELECT
          r.id,
          r.reason,
          r.details,
          r.reference_type,
          r.reference_id,
          r.status,
          r.admin_note,
          r.created_at,
          r.resolved_at,
          -- reporter (seller)
          rp.id          AS reporter_profile_id,
          rp.full_name   AS reporter_name,
          ru.email       AS reporter_email,
          -- reported user (buyer)
          rpu.id         AS reported_profile_id,
          rpu.full_name  AS reported_name,
          rpu.is_banned  AS reported_is_banned,
          ruu.id         AS reported_user_id,
          ruu.email      AS reported_email
        FROM user_reports r
        LEFT JOIN profiles rp  ON r.reporter_id      = rp.id
        LEFT JOIN users    ru  ON rp.user_id          = ru.id
        LEFT JOIN users    ruu ON r.reported_user_id  = ruu.id
        LEFT JOIN profiles rpu ON rpu.user_id         = ruu.id
        WHERE r.status = ?
        ORDER BY r.created_at DESC
      `,
      )
      .bind(statusFilter)
      .all<Record<string, unknown>>()

    return NextResponse.json({ success: true, reports: reports.results })
  } catch (error) {
    console.error("Admin reports list error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch reports" },
      { status: 500 },
    )
  }
}
