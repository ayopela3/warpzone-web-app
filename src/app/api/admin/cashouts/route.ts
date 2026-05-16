import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

type CashoutRow = {
  id: string
  seller_id: string
  seller_name: string
  seller_business: string | null
  amount: number
  notes: string | null
  status: string
  settled_at: string | null
  admin_note: string | null
  created_at: string
}

async function resolveAdmin(
  request: NextRequest,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<{ id: string } | null> {
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
  if (!profile || profile.role !== "admin") return null
  return profile
}

// ---------------------------------------------------------------------------
// GET /api/admin/cashouts?status=pending|settled|all
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const db = await getDb()
  if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

  try {
    const admin = await resolveAdmin(request, db)
    if (!admin) return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") ?? "pending"

    const where = status === "all" ? "" : "WHERE cr.status = ?"
    const params = status === "all" ? [] : [status]

    const rows = await db
      .prepare(`
        SELECT
          cr.id,
          cr.seller_id,
          pr.full_name     AS seller_name,
          pr.business_name AS seller_business,
          cr.amount,
          cr.notes,
          cr.status,
          cr.settled_at,
          cr.admin_note,
          cr.created_at
        FROM cashout_requests cr
        LEFT JOIN profiles pr ON cr.seller_id = pr.id
        ${where}
        ORDER BY cr.created_at DESC
      `)
      .bind(...params)
      .all<CashoutRow>()

    // Also return a total pending amount for the badge
    const pending = await db
      .prepare("SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM cashout_requests WHERE status = 'pending'")
      .first<{ total: number; count: number }>()

    return NextResponse.json({
      success: true,
      cashouts: rows.results,
      pendingTotal: pending?.total ?? 0,
      pendingCount: pending?.count ?? 0,
    })
  } catch (error) {
    console.error("GET /api/admin/cashouts error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch cashouts" }, { status: 500 })
  }
}
