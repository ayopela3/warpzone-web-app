import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

type ProfileRow = { id: string; role: string }

type FeeRow = {
  id: string
  source_type: string
  source_id: string
  description: string
  gross_amount: number
  fee_rate: number
  fee_amount: number
  status: string
  paid_at: string | null
  created_at: string
}

type FeeSummary = {
  total_unpaid: number
  total_paid: number
  total_all: number
  unpaid_count: number
  paid_count: number
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
// GET /api/seller/service-fees
// Returns the authenticated seller's own platform fee rows and a summary.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const profile = await resolveProfile(request, db)
    if (!profile) return NextResponse.json({ success: false, error: "Not authorised" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status") // 'unpaid' | 'paid' | null = all
    const params: string[] = statusFilter ? [statusFilter] : []

    // Fee rows for this seller only
    const rows = await db
      .prepare(`
        SELECT
          sf.id, sf.source_type, sf.source_id, sf.description,
          sf.gross_amount, sf.fee_rate, sf.fee_amount,
          sf.status, sf.paid_at, sf.created_at
        FROM service_fees sf
        WHERE sf.seller_id = ? ${statusFilter ? "AND sf.status = ?" : ""}
        ORDER BY sf.created_at DESC
      `)
      .bind(profile.id, ...params)
      .all<FeeRow>()

    // Summary totals
    const summary = await db
      .prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'unpaid' THEN fee_amount ELSE 0 END), 0) AS total_unpaid,
          COALESCE(SUM(CASE WHEN status = 'paid'   THEN fee_amount ELSE 0 END), 0) AS total_paid,
          COALESCE(SUM(fee_amount), 0)                                              AS total_all,
          COUNT(CASE WHEN status = 'unpaid' THEN 1 END)                            AS unpaid_count,
          COUNT(CASE WHEN status = 'paid'   THEN 1 END)                            AS paid_count
        FROM service_fees
        WHERE seller_id = ?
      `)
      .bind(profile.id)
      .first<FeeSummary>()

    return NextResponse.json({
      success: true,
      fees: rows.results,
      summary: summary ?? {
        total_unpaid: 0,
        total_paid: 0,
        total_all: 0,
        unpaid_count: 0,
        paid_count: 0,
      },
    })
  } catch (error) {
    console.error("GET /api/seller/service-fees error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch service fees" }, { status: 500 })
  }
}
