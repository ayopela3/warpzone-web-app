import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function resolveProfile(
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
  return db
    .prepare("SELECT id, role FROM profiles WHERE user_id = ?")
    .bind(session.user_id)
    .first<{ id: string; role: string }>()
}

// ---------------------------------------------------------------------------
// POST /api/reports — seller reports a buyer
// Body: { reported_user_id, reason, details?, reference_type?, reference_id? }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const reporter = await resolveProfile(request, db)
    if (!reporter) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    if (reporter.role !== "seller" && reporter.role !== "admin") {
      return NextResponse.json({ success: false, error: "Only sellers can submit reports" }, { status: 403 })
    }

    const body = await request.json() as {
      reported_user_id: string
      reason: string
      details?: string
      reference_type?: string
      reference_id?: string
    }

    if (!body.reported_user_id || !body.reason) {
      return NextResponse.json({ success: false, error: "reported_user_id and reason are required" }, { status: 400 })
    }

    /** Prevent duplicate pending report for the same reporter+user+reference */
    const existing = await db
      .prepare(`
        SELECT id FROM user_reports
        WHERE reporter_id = ? AND reported_user_id = ?
          AND reference_id = ? AND status = 'pending'
      `)
      .bind(reporter.id, body.reported_user_id, body.reference_id ?? null)
      .first<{ id: string }>()

    if (existing) {
      return NextResponse.json({ success: false, error: "You already have a pending report for this." }, { status: 409 })
    }

    const id = crypto.randomUUID()
    await db
      .prepare(`
        INSERT INTO user_reports
          (id, reporter_id, reported_user_id, reason, details, reference_type, reference_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
      `)
      .bind(
        id,
        reporter.id,
        body.reported_user_id,
        body.reason,
        body.details ?? null,
        body.reference_type ?? null,
        body.reference_id ?? null,
      )
      .run()

    return NextResponse.json({ success: true, reportId: id })
  } catch (error) {
    console.error("Submit report error:", error)
    return NextResponse.json({ success: false, error: "Failed to submit report" }, { status: 500 })
  }
}
