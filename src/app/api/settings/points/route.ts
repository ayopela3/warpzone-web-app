import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

/**
 * Key stored in the `settings` table.
 * Value is stored as a decimal: e.g. 0.01 means 1 point per PHP 1 spent.
 */
const POINTS_RATE_KEY = "points_per_currency_unit"

/** Default: 1 point for every 1 unit of currency spent */
const DEFAULT_POINTS_RATE = 1

async function getPointsRate(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<number> {
  const row = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .bind(POINTS_RATE_KEY)
    .first<{ value: string }>()
  return row ? parseFloat(row.value) : DEFAULT_POINTS_RATE
}

async function upsertPointsRate(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  value: number
): Promise<void> {
  const existing = await db
    .prepare("SELECT id FROM settings WHERE key = ?")
    .bind(POINTS_RATE_KEY)
    .first<{ id: string }>()

  if (existing) {
    await db
      .prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?")
      .bind(String(value), POINTS_RATE_KEY)
      .run()
  } else {
    await db
      .prepare("INSERT INTO settings (id, key, value) VALUES (?, ?, ?)")
      .bind(crypto.randomUUID(), POINTS_RATE_KEY, String(value))
      .run()
  }
}

// ---------------------------------------------------------------------------
// GET /api/settings/points — returns current points rate (public)
// ---------------------------------------------------------------------------
export async function GET() {
  const db = await getDb()

  if (!db) {
    return NextResponse.json({ success: true, pointsPerCurrencyUnit: DEFAULT_POINTS_RATE })
  }

  try {
    const rate = await getPointsRate(db)
    return NextResponse.json({ success: true, pointsPerCurrencyUnit: rate })
  } catch (error) {
    console.error("GET /api/settings/points error:", error)
    return NextResponse.json({ success: true, pointsPerCurrencyUnit: DEFAULT_POINTS_RATE })
  }
}

// ---------------------------------------------------------------------------
// PUT /api/settings/points — admin only, updates the points earn rate
// Body: { pointsPerCurrencyUnit: number }
// ---------------------------------------------------------------------------
export async function PUT(request: NextRequest) {
  const db = await getDb()
  if (!db) {
    return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
  }

  try {
    // Verify admin session
    const sessionId =
      request.cookies.get("__Secure-wz_session")?.value ??
      request.cookies.get("wz_session")?.value ??
      request.headers.get("Authorization")?.replace("Bearer ", "")

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const session = await db
      .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string; expires_at: string }>()

    if (!session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 401 })
    }

    const profile = await db
      .prepare("SELECT role FROM profiles WHERE user_id = ?")
      .bind(session.user_id)
      .first<{ role: string }>()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json() as { pointsPerCurrencyUnit?: number }
    const rate = parseFloat(String(body.pointsPerCurrencyUnit ?? ""))

    if (isNaN(rate) || rate < 0) {
      return NextResponse.json(
        { success: false, error: "pointsPerCurrencyUnit must be a non-negative number" },
        { status: 400 }
      )
    }

    await upsertPointsRate(db, rate)
    const saved = await getPointsRate(db)

    return NextResponse.json({ success: true, pointsPerCurrencyUnit: saved })
  } catch (error) {
    console.error("PUT /api/settings/points error:", error)
    return NextResponse.json({ success: false, error: "Failed to update points rate" }, { status: 500 })
  }
}
