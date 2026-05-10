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

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/admin/service-fees/[id]
// Marks a specific fee as paid (or bulk if id = seller_id).
// Body: { action: 'mark_paid' } | { action: 'mark_paid_all_for_seller', seller_id: string }
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    if (!(await requireAdmin(request, db))) {
      return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 })
    }

    const body = await request.json() as { action: string; seller_id?: string }

    if (body.action === "mark_paid_all_for_seller" && body.seller_id) {
      // Mark ALL unpaid fees for a seller as paid
      await db.prepare(`
        UPDATE service_fees
        SET status = 'paid', paid_at = datetime('now'), updated_at = datetime('now')
        WHERE seller_id = ? AND status = 'unpaid'
      `).bind(body.seller_id).run()
    } else if (body.action === "mark_paid") {
      // Mark a single fee
      await db.prepare(`
        UPDATE service_fees
        SET status = 'paid', paid_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ? AND status = 'unpaid'
      `).bind(id).run()
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PATCH /api/admin/service-fees/[id] error:", error)
    return NextResponse.json({ success: false, error: "Failed to update fee" }, { status: 500 })
  }
}
