import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function resolveAdmin(
  request: NextRequest,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<{ id: string } | null> {
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
// PATCH /api/admin/cashouts/[id]
// Body: { action: 'settle'; admin_note?: string }
// Marks the cashout request as settled.
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = await getDb()
  if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

  try {
    const admin = await resolveAdmin(request, db)
    if (!admin) return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })

    const body = await request.json() as { action?: string; admin_note?: string }

    if (body.action !== "settle") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    const existing = await db
      .prepare("SELECT id, status FROM cashout_requests WHERE id = ?")
      .bind(id)
      .first<{ id: string; status: string }>()

    if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
    if (existing.status === "settled") {
      return NextResponse.json({ success: false, error: "Already settled" }, { status: 409 })
    }

    await db
      .prepare(`
        UPDATE cashout_requests
        SET status = 'settled',
            settled_at = datetime('now'),
            settled_by = ?,
            admin_note = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(admin.id, body.admin_note?.trim() ?? null, id)
      .run()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PATCH /api/admin/cashouts/[id] error:", error)
    return NextResponse.json({ success: false, error: "Failed to settle cashout" }, { status: 500 })
  }
}
