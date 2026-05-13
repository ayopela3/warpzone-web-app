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

/**
 * PATCH /api/admin/redemptions/[id]
 * Admin fulfils or cancels a redemption.
 * Body: { action: 'fulfil' | 'cancel', note?: string }
 * Cancelling refunds points to the user's ledger.
 */
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

    const body = await request.json() as { action: "fulfil" | "cancel"; note?: string }

    const redemption = await db.prepare(
      "SELECT id, user_id, points_spent, status FROM reward_redemptions WHERE id = ?"
    ).bind(id).first<{ id: string; user_id: string; points_spent: number; status: string }>()

    if (!redemption) return NextResponse.json({ success: false, error: "Redemption not found" }, { status: 404 })
    if (redemption.status !== "pending") {
      return NextResponse.json({ success: false, error: "Redemption is already processed" }, { status: 409 })
    }

    const newStatus = body.action === "fulfil" ? "fulfilled" : "cancelled"

    await db.prepare(`
      UPDATE reward_redemptions SET status = ?, note = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(newStatus, body.note ?? null, id).run()

    // Refund points if cancelled
    if (body.action === "cancel") {
      await db.prepare(`
        INSERT INTO points_ledger (id, user_id, type, points, source_type, source_id, note, created_at)
        VALUES (?, ?, 'adjust', ?, 'redemption', ?, ?, datetime('now'))
      `).bind(
        crypto.randomUUID(),
        redemption.user_id,
        redemption.points_spent,   // positive — refund
        id,
        `Refund: redemption cancelled by admin`,
      ).run()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PATCH /api/admin/redemptions/[id] error:", error)
    return NextResponse.json({ success: false, error: "Failed to update redemption" }, { status: 500 })
  }
}
