import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

type ServiceFeeRow = {
  id: string
  seller_id: string
  seller_name: string
  seller_business: string | null
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/service-fees
// Returns all fees grouped by seller with totals.
// Optional ?status=unpaid|paid
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    if (!(await requireAdmin(request, db))) {
      return NextResponse.json({ success: false, error: "Admin only" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status") // 'unpaid' | 'paid' | null = all

    const where = statusFilter ? "WHERE sf.status = ?" : ""
    const params: string[] = statusFilter ? [statusFilter] : []

    const rows = await db.prepare(`
      SELECT
        sf.*,
        pr.full_name     AS seller_name,
        pr.business_name AS seller_business
      FROM service_fees sf
      LEFT JOIN profiles pr ON sf.seller_id = pr.id
      ${where}
      ORDER BY sf.created_at DESC
    `).bind(...params).all<ServiceFeeRow>()

    // Also return per-seller summary
    const summaryRows = await db.prepare(`
      SELECT
        sf.seller_id,
        pr.full_name     AS seller_name,
        pr.business_name AS seller_business,
        SUM(CASE WHEN sf.status = 'unpaid' THEN sf.fee_amount ELSE 0 END) AS total_unpaid,
        SUM(CASE WHEN sf.status = 'paid'   THEN sf.fee_amount ELSE 0 END) AS total_paid,
        SUM(sf.fee_amount) AS total_all,
        COUNT(CASE WHEN sf.status = 'unpaid' THEN 1 END) AS unpaid_count
      FROM service_fees sf
      LEFT JOIN profiles pr ON sf.seller_id = pr.id
      GROUP BY sf.seller_id
      ORDER BY total_unpaid DESC
    `).all<{
      seller_id: string
      seller_name: string
      seller_business: string | null
      total_unpaid: number
      total_paid: number
      total_all: number
      unpaid_count: number
    }>()

    return NextResponse.json({
      success: true,
      fees: rows.results,
      summary: summaryRows.results,
    })
  } catch (error) {
    console.error("GET /api/admin/service-fees error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch service fees" }, { status: 500 })
  }
}
