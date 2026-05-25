import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

async function resolveProfile(
  request: NextRequest,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const sessionId =
    request.cookies.get("__Secure-wz_session")?.value ??
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

    // Fetch reservations with buyer display info and downpayment fields
    const reservations = await db
      .prepare(`
        SELECT
          por.id,
          por.pre_order_id,
          por.user_id,
          por.quantity,
          por.unit_price,
          por.unit_full_price,
          por.reserved_at,
          por.paid,
          por.downpayment_paid,
          por.downpayment_amount,
          por.total_paid,
          por.remaining_balance,
          por.allocation_status,
          p.full_name   AS buyer_name,
          u.email       AS buyer_email,
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

    const VALID_ALLOCATION_STATUSES = ["pending", "allocated", "shortlisted", "refunded"] as const
    type AllocationStatus = typeof VALID_ALLOCATION_STATUSES[number]

    const body = await request.json() as { 
      reservationId: string; 
      paid?: boolean;
      downpayment_paid?: boolean;
      allocation_status?: AllocationStatus;
    }
    if (!body.reservationId) {
      return NextResponse.json({ success: false, error: "reservationId is required" }, { status: 400 })
    }

    // Runtime-validate allocation_status against the allowlist
    if (body.allocation_status !== undefined &&
        !(VALID_ALLOCATION_STATUSES as readonly string[]).includes(body.allocation_status)) {
      return NextResponse.json({ success: false, error: "Invalid allocation_status value" }, { status: 400 })
    }

    // Build update based on what was provided
    const updates: string[] = []
    const binds: (string | number | null)[] = []
    
    if (body.paid !== undefined) {
      updates.push("paid = ?")
      binds.push(body.paid ? 1 : 0)
      // Keep downpayment_paid in sync — it is the field the buyer-facing page reads
      updates.push("downpayment_paid = ?")
      binds.push(body.paid ? 1 : 0)
    }
    
    if (body.downpayment_paid !== undefined) {
      updates.push("downpayment_paid = ?")
      binds.push(body.downpayment_paid ? 1 : 0)
    }
    
    if (body.allocation_status !== undefined) {
      updates.push("allocation_status = ?")
      binds.push(body.allocation_status)

      if (body.allocation_status === 'allocated') {
        updates.push("total_paid = downpayment_amount")
      }
    }

    if (updates.length > 0) {
      binds.push(body.reservationId, id)
      await db
        .prepare(`UPDATE pre_order_reservations SET ${updates.join(", ")} WHERE id = ? AND pre_order_id = ?`)
        .bind(...binds)
        .run()
    }

    // ── When seller marks buyer as shortlisted (cut), credit their paid amount to wallet ──
    if (body.allocation_status === 'shortlisted') {
      const reservation = await db
        .prepare(`
          SELECT por.user_id, por.total_paid, por.quantity, por.paid,
                 po.seller_id, po.title, po.full_price
          FROM pre_order_reservations por
          JOIN pre_orders po ON po.id = por.pre_order_id
          WHERE por.id = ? AND por.pre_order_id = ?
        `)
        .bind(body.reservationId, id)
        .first<{ user_id: string; total_paid: number; quantity: number; paid: number; seller_id: string | null; title: string; full_price: number }>()

      if (reservation) {
        // Amount to credit = what buyer actually paid (total_paid or full price if paid=1 and total_paid=0)
        const creditAmount = reservation.total_paid > 0
          ? reservation.total_paid
          : (reservation.paid === 1 ? reservation.full_price * reservation.quantity : 0)

        if (creditAmount > 0) {
          // Upsert wallet_credits balance
          const existingWallet = await db
            .prepare("SELECT id, amount FROM wallet_credits WHERE user_id = ?")
            .bind(reservation.user_id)
            .first<{ id: string; amount: number }>()

          if (existingWallet) {
            await db.prepare("UPDATE wallet_credits SET amount = amount + ?, updated_at = datetime('now') WHERE user_id = ?")
              .bind(creditAmount, reservation.user_id).run()
          } else {
            await db.prepare("INSERT INTO wallet_credits (id, user_id, amount) VALUES (?, ?, ?)")
              .bind(crypto.randomUUID(), reservation.user_id, creditAmount).run()
          }

          // Log the credit transaction
          await db.prepare(`
            INSERT INTO wallet_transactions (id, user_id, type, amount, source_type, source_id, seller_id, note)
            VALUES (?, ?, 'credit', ?, 'pre_order_refund', ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            reservation.user_id,
            creditAmount,
            body.reservationId,
            reservation.seller_id,
            `Allocation refund — ${reservation.title}`,
          ).run()
        }
      }
    }

    // ── Record service fee when marking paid (idempotent via fee_recorded flag) ──
    if (body.paid) {
      const reservation = await db
        .prepare("SELECT quantity, unit_price, downpayment_amount, fee_recorded FROM pre_order_reservations WHERE id = ?")
        .bind(body.reservationId)
        .first<{ quantity: number; unit_price: number; downpayment_amount: number; fee_recorded: number | null }>()

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
        // Use downpayment_amount for fee calculation if available, otherwise use snapshotted unit_price
        const snapshotPrice = reservation.unit_price || po.price
        const feeBase = reservation.downpayment_amount || snapshotPrice * (reservation.quantity ?? 1)
        const feeAmount = Math.round(feeBase * feeRate * 100) / 100

        await db.prepare(`
          INSERT OR IGNORE INTO service_fees
            (id, seller_id, source_type, source_id, description, gross_amount, fee_rate, fee_amount, status, created_at, updated_at)
          VALUES (?, ?, 'pre_order', ?, ?, ?, ?, ?, 'unpaid', datetime('now'), datetime('now'))
        `).bind(
          crypto.randomUUID(),
          po.seller_id,
          id,
          `Pre-order downpayment — qty ${reservation.quantity ?? 1}`,
          feeBase,
          feeRate,
          feeAmount,
        ).run()

        // Update total_paid to reflect downpayment
        await db.prepare("UPDATE pre_order_reservations SET fee_recorded = 1, total_paid = downpayment_amount WHERE id = ?")
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
      price?: number /** Display price (downpayment if applicable) */
      full_price?: number /** Total price buyer must pay */
      downpayment_amount?: number | null /** Optional downpayment amount */
      cutoff_date?: string | null /** After this date buyers can no longer reserve */
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
    if (body.full_price !== undefined) {
      updates.push("full_price = ?")
      binds.push(body.full_price)

      // Auto-recalculate display price and downpayment when full_price changes
      if (body.price === undefined) {
        const current = await db
          .prepare("SELECT downpayment_pct FROM pre_orders WHERE id = ?")
          .bind(id)
          .first<{ downpayment_pct: number | null }>()
        const pct = current?.downpayment_pct
        if (pct && pct > 0) {
          const dp = Math.round(body.full_price * pct * 100) / 100
          updates.push("price = ?")
          binds.push(dp)
          updates.push("downpayment_amount = ?")
          binds.push(dp)
        } else {
          updates.push("price = ?")
          binds.push(body.full_price)
        }
      }
    }
    if (body.downpayment_amount !== undefined) { 
      updates.push("downpayment_amount = ?"); 
      binds.push(body.downpayment_amount) 
    }
    if (body.cutoff_date !== undefined) { updates.push("cutoff_date = ?"); binds.push(body.cutoff_date) }
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

// ---------------------------------------------------------------------------
// DELETE /api/pre-orders/[id] — admin-only hard delete
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const profile = await resolveProfile(request, db)
    if (!profile) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    if (profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    // Delete reservations first (in case PRAGMA foreign_keys is off)
    await db
      .prepare("DELETE FROM pre_order_reservations WHERE pre_order_id = ?")
      .bind(id)
      .run()

    const result = await db
      .prepare("DELETE FROM pre_orders WHERE id = ?")
      .bind(id)
      .run()

    if (!result.meta?.changes) {
      return NextResponse.json({ success: false, error: "Pre-order not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Pre-order delete error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete pre-order" }, { status: 500 })
  }
}
