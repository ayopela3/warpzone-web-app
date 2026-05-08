import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function resolveAdminProfile(
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
  return profile
}

// ---------------------------------------------------------------------------
// PUT /api/pre-orders/[id] — admin approves/rejects/closes; seller closes own
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const profile = await resolveAdminProfile(request, db)
    if (!profile) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const existing = await db
      .prepare("SELECT id, seller_id FROM pre_orders WHERE id = ?")
      .bind(id)
      .first<{ id: string; seller_id: string | null }>()

    if (!existing) return NextResponse.json({ success: false, error: "Pre-order not found" }, { status: 404 })

    const isAdmin  = profile.role === "admin"
    const isOwner  = existing.seller_id === profile.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json() as {
      approval_status?: "approved" | "rejected"
      status?: "active" | "closed"
      title?: string
      description?: string
      game?: string
      image_url?: string
      price?: number
      release_date?: string
      max_slots?: number
    }

    const updates: string[] = ["updated_at = datetime('now')"]
    const binds: (string | number | null)[] = []

    // Only admin can change approval_status
    if (isAdmin && body.approval_status) {
      updates.push("approval_status = ?")
      binds.push(body.approval_status)
    }
    if (body.status) {
      updates.push("status = ?")
      binds.push(body.status)
    }
    if (body.title) { updates.push("title = ?"); binds.push(body.title) }
    if (body.description !== undefined) { updates.push("description = ?"); binds.push(body.description) }
    if (body.game) { updates.push("game = ?"); binds.push(body.game) }
    if (body.image_url !== undefined) { updates.push("image_url = ?"); binds.push(body.image_url) }
    if (body.price !== undefined) { updates.push("price = ?"); binds.push(body.price) }
    if (body.release_date) { updates.push("release_date = ?"); binds.push(body.release_date) }
    if (body.max_slots !== undefined) { updates.push("max_slots = ?"); binds.push(body.max_slots) }

    binds.push(id)

    await db
      .prepare(`UPDATE pre_orders SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...binds)
      .run()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Pre-order update error:", error)
    return NextResponse.json({ success: false, error: "Failed to update pre-order" }, { status: 500 })
  }
}
