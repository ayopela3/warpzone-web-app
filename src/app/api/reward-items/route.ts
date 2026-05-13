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
 * GET /api/reward-items
 * Public — returns all active reward items.
 * Admin sees all items regardless of is_active.
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const isAdmin = await requireAdmin(request, db)
    const where = isAdmin ? "" : "WHERE is_active = 1"

    const rows = await db.prepare(`
      SELECT id, name, description, image_url, points_cost, stock, is_active, sort_order, created_at, updated_at
      FROM reward_items
      ${where}
      ORDER BY sort_order ASC, created_at DESC
    `).all()

    return NextResponse.json({ success: true, rewardItems: rows.results })
  } catch (error) {
    console.error("GET /api/reward-items error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch reward items" }, { status: 500 })
  }
}

/**
 * POST /api/reward-items — admin only
 * Body: { name, description?, image_url?, points_cost, stock?, sort_order? }
 */
export async function POST(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    if (!(await requireAdmin(request, db))) {
      return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 })
    }

    const body = await request.json() as {
      name: string
      description?: string
      image_url?: string
      points_cost: number
      stock?: number | null
      sort_order?: number
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 })
    }
    if (!body.points_cost || body.points_cost < 1) {
      return NextResponse.json({ success: false, error: "points_cost must be ≥ 1" }, { status: 400 })
    }

    const id = crypto.randomUUID()
    await db.prepare(`
      INSERT INTO reward_items (id, name, description, image_url, points_cost, stock, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
    `).bind(
      id,
      body.name.trim(),
      body.description ?? null,
      body.image_url ?? null,
      body.points_cost,
      body.stock ?? null,
      body.sort_order ?? 0,
    ).run()

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("POST /api/reward-items error:", error)
    return NextResponse.json({ success: false, error: "Failed to create reward item" }, { status: 500 })
  }
}
