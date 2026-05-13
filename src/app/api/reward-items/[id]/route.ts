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

/** PATCH /api/reward-items/[id] — admin: update reward item */
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

    const body = await request.json() as {
      name?: string
      description?: string
      image_url?: string
      points_cost?: number
      stock?: number | null
      is_active?: boolean
      sort_order?: number
    }

    const sets: string[] = ["updated_at = datetime('now')"]
    const binds: (string | number | null)[] = []

    if (body.name !== undefined)        { sets.push("name = ?");        binds.push(body.name) }
    if (body.description !== undefined) { sets.push("description = ?"); binds.push(body.description ?? null) }
    if (body.image_url !== undefined)   { sets.push("image_url = ?");   binds.push(body.image_url ?? null) }
    if (body.points_cost !== undefined) { sets.push("points_cost = ?"); binds.push(body.points_cost) }
    if (body.stock !== undefined)       { sets.push("stock = ?");       binds.push(body.stock ?? null) }
    if (body.is_active !== undefined)   { sets.push("is_active = ?");   binds.push(body.is_active ? 1 : 0) }
    if (body.sort_order !== undefined)  { sets.push("sort_order = ?");  binds.push(body.sort_order) }

    binds.push(id)
    await db.prepare(`UPDATE reward_items SET ${sets.join(", ")} WHERE id = ?`).bind(...binds).run()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PATCH /api/reward-items/[id] error:", error)
    return NextResponse.json({ success: false, error: "Failed to update reward item" }, { status: 500 })
  }
}

/** DELETE /api/reward-items/[id] — admin only */
export async function DELETE(
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

    await db.prepare("DELETE FROM reward_items WHERE id = ?").bind(id).run()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/reward-items/[id] error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete reward item" }, { status: 500 })
  }
}
