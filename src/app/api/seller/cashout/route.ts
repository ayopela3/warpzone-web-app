import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

type ProfileRow = { id: string; role: string }
type EarningsRow = { net_earnings: number; pending_cashout: number }
type CashoutRow = {
  id: string
  amount: number
  notes: string | null
  status: string
  settled_at: string | null
  admin_note: string | null
  created_at: string
}

async function resolveProfile(
  request: NextRequest,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<ProfileRow | null> {
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
    .first<ProfileRow>()
  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) return null
  return profile
}

// ---------------------------------------------------------------------------
// GET /api/seller/cashout
// Returns the seller's available net earnings (collected minus already-requested)
// and their cashout request history.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const db = await getDb()
  if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

  try {
    const profile = await resolveProfile(request, db)
    if (!profile) return NextResponse.json({ success: false, error: "Not authorised" }, { status: 403 })

    // Net earnings = sum of (gross_amount - fee_amount) from ALL service_fees for this seller
    // Available for cashout = net_earnings minus the sum of pending cashout requests
    const earnings = await db
      .prepare(`
        SELECT
          COALESCE(SUM(gross_amount - fee_amount), 0) AS net_earnings,
          COALESCE((
            SELECT SUM(amount) FROM cashout_requests
            WHERE seller_id = ? AND status = 'pending'
          ), 0) AS pending_cashout
        FROM service_fees
        WHERE seller_id = ?
      `)
      .bind(profile.id, profile.id)
      .first<EarningsRow>()

    const totalSettled = await db
      .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM cashout_requests WHERE seller_id = ? AND status = 'settled'")
      .bind(profile.id)
      .first<{ total: number }>()

    const history = await db
      .prepare("SELECT id, amount, notes, status, settled_at, admin_note, created_at FROM cashout_requests WHERE seller_id = ? ORDER BY created_at DESC")
      .bind(profile.id)
      .all<CashoutRow>()

    const netEarnings   = earnings?.net_earnings ?? 0
    const pendingAmount = earnings?.pending_cashout ?? 0
    const settledAmount = totalSettled?.total ?? 0
    // Available = total net earned minus already settled cashouts minus in-flight pending requests
    const available = Math.max(0, Math.round((netEarnings - settledAmount - pendingAmount) * 100) / 100)

    return NextResponse.json({
      success: true,
      netEarnings:    Math.round(netEarnings * 100) / 100,
      settledAmount,
      pendingAmount,
      available,
      history: history.results,
    })
  } catch (error) {
    console.error("GET /api/seller/cashout error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch cashout data" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/seller/cashout
// Seller submits a cashout request for their available balance.
// Body: { amount: number; notes?: string }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const db = await getDb()
  if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

  try {
    const profile = await resolveProfile(request, db)
    if (!profile) return NextResponse.json({ success: false, error: "Not authorised" }, { status: 403 })

    const body = await request.json() as { amount?: number; notes?: string }
    const amount = typeof body.amount === "number" ? body.amount : parseFloat(String(body.amount ?? "0"))

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "Amount must be greater than 0" }, { status: 400 })
    }

    // Re-check available balance server-side to prevent over-requesting
    const earnings = await db
      .prepare(`
        SELECT
          COALESCE(SUM(gross_amount - fee_amount), 0) AS net_earnings,
          COALESCE((
            SELECT SUM(amount) FROM cashout_requests
            WHERE seller_id = ? AND status = 'pending'
          ), 0) AS pending_cashout
        FROM service_fees
        WHERE seller_id = ?
      `)
      .bind(profile.id, profile.id)
      .first<EarningsRow>()

    const totalSettled = await db
      .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM cashout_requests WHERE seller_id = ? AND status = 'settled'")
      .bind(profile.id)
      .first<{ total: number }>()

    const available = Math.max(0,
      Math.round(((earnings?.net_earnings ?? 0) - (totalSettled?.total ?? 0) - (earnings?.pending_cashout ?? 0)) * 100) / 100
    )

    if (amount > available + 0.01) {
      return NextResponse.json({
        success: false,
        error: `Requested amount exceeds available balance of ${available.toFixed(2)}`,
      }, { status: 400 })
    }

    const id = crypto.randomUUID()
    await db
      .prepare(`INSERT INTO cashout_requests (id, seller_id, amount, notes, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`)
      .bind(id, profile.id, amount, body.notes?.trim() ?? null)
      .run()

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("POST /api/seller/cashout error:", error)
    return NextResponse.json({ success: false, error: "Failed to create cashout request" }, { status: 500 })
  }
}
