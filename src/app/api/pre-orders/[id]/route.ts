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
  const profile = await db
    .prepare("SELECT id, role FROM profiles WHERE user_id = ?")
    .bind(session.user_id)
    .first<{ id: string; role: string }>()
  return profile
}

// ---------------------------------------------------------------------------
// GET /api/pre-orders/[id] — detail + reservations (seller or admin only)
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const profile = await resolveProfile(request, db)
    if (!profile) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const preOrder = await db
      .prepare(`
        SELECT po.*, pr.full_name AS seller_name, pr.business_name AS seller_business,
               COUNT(por.id) AS reservation_count
        FROM pre_orders po
        LEFT JOIN profiles pr ON po.seller_id = pr.id
        LEFT JOIN pre_order_reservations por ON po.id = por.pre_order_id
        WHERE po.id = ?
        GROUP BY po.id
      `)
      .bind(id)
      .first<Record<string, unknown>>()

    if (!preOrder) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

    const isAdmin = profile.role === "admin"
    const isOwner = preOrder.seller_id === profile.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    // Fetch reservations with buyer display info
    const reservations = await db
      .prepare(`
        SELECT
          por.id,
          por.pre_order_id,
          por.user_id,
          por.quantity,
          por.reserved_at,
          por.paid,
          p.full_name   AS buyer_name,
          p.email       AS buyer_email,
          u.email       AS user_email
        FROM pre_order_reservations por
        LEFT JOIN users u ON por.user_id = u.id
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE por.pre_order_id = ?
        ORDER BY por.reserved_at ASC
      `)
      .bind(id)
      .all<Record<string, unknown>>()

    return NextResponse.json({ success: true, preOrder, reservations: reservations.results })
  } catch (error) {
    console.error("Pre-order detail error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch pre-order" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/pre-orders/[id] — seller toggles paid on a reservation
// Body: { reservationId: string; paid: boolean }
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const profile = await resolveProfile(request, db)
    if (!profile) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const preOrder = await db
      .prepare("SELECT id, seller_id FROM pre_orders WHERE id = ?")
      .bind(id)
      .first<{ id: string; seller_id: string | null }>()

    if (!preOrder) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

    const isAdmin = profile.role === "admin"
    const isOwner = preOrder.seller_id === profile.id
    if (!isAdmin && !isOwner) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

    const body = await request.json() as { reservationId: string; paid: boolean }
    if (!body.reservationId) {
      return NextResponse.json({ success: false, error: "reservationId is required" }, { status: 400 })
    }

    await db
      .prepare("UPDATE pre_order_reservations SET paid = ? WHERE id = ? AND pre_order_id = ?")
      .bind(body.paid ? 1 : 0, body.reservationId, id)
      .run()

    // ── Record service fee when marking paid (idempotent via fee_recorded flag) ──
    if (body.paid) {
      const reservation = await db
        .prepare("SELECT quantity, fee_recorded FROM pre_order_reservations WHERE id = ?")
        .bind(body.reservationId)
        .first<{ quantity: number; fee_recorded: number | null }>()

      const po = await db
        .prepare("SELECT price, seller_id FROM pre_orders WHERE id = ?")
        .bind(id)
        .first<{ price: number; seller_id: string | null }>()

      // Only charge fee for seller-created pre-orders (seller_id IS NOT NULL)
      if (reservation && po?.seller_id && !reservation.fee_recorded) {
        const rateSetting = await db
          .prepare("SELECT value FROM settings WHERE key = 'pre_order_service_fee_rate'")
          .first<{ value: string }>()
        const feeRate = rateSetting ? parseFloat(rateSetting.value) : 0.05
        const grossAmount = po.price * (reservation.quantity ?? 1)
        const feeAmount   = Math.round(grossAmount * feeRate * 100) / 100

        await db.prepare(`
          INSERT OR IGNORE INTO service_fees
            (id, seller_id, source_type, source_id, description, gross_amount, fee_rate, fee_amount, status, created_at, updated_at)
          VALUES (?, ?, 'pre_order', ?, ?, ?, ?, ?, 'unpaid', datetime('now'), datetime('now'))
        `).bind(
          crypto.randomUUID(),
          po.seller_id,
          id,
          `Pre-order reservation payment — qty ${reservation.quantity ?? 1} × ${po.price}`,
          grossAmount,
          feeRate,
          feeAmount,
        ).run()

        // Mark so we don't double-charge if toggled again
        await db.prepare("UPDATE pre_order_reservations SET fee_recorded = 1 WHERE id = ?")
          .bind(body.reservationId).run()
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Pre-order patch error:", error)
    return NextResponse.json({ success: false, error: "Failed to update reservation" }, { status: 500 })
  }
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

    const profile = await resolveProfile(request, db)
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
