import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// PATCH /api/admin/reservations/[id]/allocation-status — admin updates allocation status
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    // Verify admin session
    const sessionId =
      request.cookies.get("__Secure-wz_session")?.value ??
      request.cookies.get("wz_session")?.value ??
      request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!sessionId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const session = await db
      .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string; expires_at: string }>()
    if (!session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 401 })
    }

    const profile = await db
      .prepare("SELECT role FROM profiles WHERE user_id = ?")
      .bind(session.user_id)
      .first<{ role: string }>()
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    const { allocation_status } = await request.json()

    // Validate allocation status
    const validStatuses = ["pending", "allocated", "shortlisted", "refunded"]
    if (!allocation_status || !validStatuses.includes(allocation_status)) {
      return NextResponse.json({ success: false, error: "Invalid allocation status" }, { status: 400 })
    }

    // Check if reservation exists
    const reservation = await db
      .prepare("SELECT id FROM pre_order_reservations WHERE id = ?")
      .bind(id)
      .first<{ id: string }>()

    if (!reservation) {
      return NextResponse.json({ success: false, error: "Reservation not found" }, { status: 404 })
    }

    // Update allocation status
    const result = await db.prepare(`
      UPDATE pre_order_reservations
      SET allocation_status = ?
      WHERE id = ?
    `).bind(allocation_status, id).run()

    if (result.meta.changes === 0) {
      return NextResponse.json({ success: false, error: "No rows updated" }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Allocation status updated successfully" })
  } catch (error) {
    console.error("Allocation status update error:", error)
    return NextResponse.json({ success: false, error: "Failed to update allocation status" }, { status: 500 })
  }
}
