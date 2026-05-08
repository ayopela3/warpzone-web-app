import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function resolveSession(
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
  return session.user_id
}

async function resolveProfile(
  userId: string,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  return db
    .prepare("SELECT id, role FROM profiles WHERE user_id = ?")
    .bind(userId)
    .first<{ id: string; role: string }>()
}

// ---------------------------------------------------------------------------
// GET /api/pre-orders — public listing (approved + active)
// Optional ?game=Pokemon&status=active&showAll=true (admin only for showAll)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const { searchParams } = new URL(request.url)
    const game     = searchParams.get("game")
    const status   = searchParams.get("status")
    const showAll  = searchParams.get("showAll") === "true"

    const conditions: string[] = []
    const params: (string | number)[] = []

    if (showAll) {
      // admin mode — no approval filter applied
    } else {
      conditions.push("po.approval_status = 'approved'")
      conditions.push("po.status = 'active'")
    }

    if (game) {
      conditions.push("po.game = ?")
      params.push(game)
    }

    if (status && !showAll) {
      conditions.push("po.status = ?")
      params.push(status)
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

    const query = `
      SELECT
        po.*,
        pr.full_name    AS seller_name,
        pr.business_name AS seller_business,
        COUNT(por.id)   AS reservation_count
      FROM pre_orders po
      LEFT JOIN profiles pr ON po.seller_id = pr.id
      LEFT JOIN pre_order_reservations por ON po.id = por.pre_order_id
      ${where}
      GROUP BY po.id
      ORDER BY po.release_date ASC, po.created_at DESC
    `

    const result = params.length
      ? await db.prepare(query).bind(...params).all<Record<string, unknown>>()
      : await db.prepare(query).all<Record<string, unknown>>()

    return NextResponse.json({ success: true, preOrders: result.results })
  } catch (error) {
    console.error("Pre-orders list error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch pre-orders" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/pre-orders — create (seller = pending approval, admin = auto-approved)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const userId = await resolveSession(request, db)
    if (!userId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const profile = await resolveProfile(userId, db)
    if (!profile || (profile.role !== "seller" && profile.role !== "admin")) {
      return NextResponse.json({ success: false, error: "Only sellers and admins can create pre-orders" }, { status: 403 })
    }

    const body = await request.json() as {
      title: string
      description?: string
      game: string
      image_url?: string
      price: number
      release_date: string
      max_slots?: number
    }

    if (!body.title?.trim()) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 })
    }
    if (!body.release_date) {
      return NextResponse.json({ success: false, error: "Release date is required" }, { status: 400 })
    }

    const isAdmin = profile.role === "admin"
    const preOrderId = crypto.randomUUID()

    await db
      .prepare(
        `INSERT INTO pre_orders
           (id, title, description, game, image_url, price, release_date, status, approval_status, seller_id, max_slots, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(
        preOrderId,
        body.title.trim(),
        body.description ?? null,
        body.game ?? "Other",
        body.image_url ?? null,
        body.price ?? 0,
        body.release_date,
        isAdmin ? "approved" : "pending",   // admins auto-approved, sellers need review
        isAdmin ? null : profile.id,        // admin-created = no seller_id (store-wide)
        body.max_slots ?? null
      )
      .run()

    return NextResponse.json({ success: true, preOrderId })
  } catch (error) {
    console.error("Pre-order create error:", error)
    return NextResponse.json({ success: false, error: "Failed to create pre-order" }, { status: 500 })
  }
}
