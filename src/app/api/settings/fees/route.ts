import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

const AUCTION_KEY   = "auction_service_fee_rate"
const PRE_ORDER_KEY = "pre_order_service_fee_rate"

const DEFAULT_AUCTION_RATE    = 0.10
const DEFAULT_PRE_ORDER_RATE  = 0.05

async function getRate(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  key: string,
  defaultVal: number
): Promise<number> {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>()
  return row ? parseFloat(row.value) : defaultVal
}

async function upsertRate(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  key: string,
  value: number
): Promise<void> {
  const existing = await db.prepare("SELECT id FROM settings WHERE key = ?").bind(key).first<{ id: string }>()
  if (existing) {
    await db.prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?").bind(String(value), key).run()
  } else {
    await db.prepare("INSERT INTO settings (id, key, value) VALUES (?, ?, ?)").bind(crypto.randomUUID(), key, String(value)).run()
  }
}

// ---------------------------------------------------------------------------
// GET /api/settings/fees — returns current fee rates (public, used by seller UI)
// ---------------------------------------------------------------------------
export async function GET() {
  const db = await getDb()
  if (!db) {
    return NextResponse.json({
      success: true,
      auctionFeeRate: DEFAULT_AUCTION_RATE,
      preOrderFeeRate: DEFAULT_PRE_ORDER_RATE,
    })
  }

  try {
    const [auctionRate, preOrderRate] = await Promise.all([
      getRate(db, AUCTION_KEY, DEFAULT_AUCTION_RATE),
      getRate(db, PRE_ORDER_KEY, DEFAULT_PRE_ORDER_RATE),
    ])

    return NextResponse.json({ success: true, auctionFeeRate: auctionRate, preOrderFeeRate: preOrderRate })
  } catch (error) {
    console.error("GET /api/settings/fees error:", error)
    return NextResponse.json({ success: true, auctionFeeRate: DEFAULT_AUCTION_RATE, preOrderFeeRate: DEFAULT_PRE_ORDER_RATE })
  }
}

// ---------------------------------------------------------------------------
// PUT /api/settings/fees — admin only, updates fee rates
// Body: { auctionFeeRate?: number; preOrderFeeRate?: number }
// ---------------------------------------------------------------------------
export async function PUT(request: NextRequest) {
  const db = await getDb()
  if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

  try {
    // Verify admin session
    const sessionId =
      request.cookies.get("wz_session")?.value ??
      request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!sessionId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

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

    const body = await request.json() as { auctionFeeRate?: number; preOrderFeeRate?: number }

    if (body.auctionFeeRate !== undefined) {
      const rate = parseFloat(String(body.auctionFeeRate))
      if (isNaN(rate) || rate < 0 || rate > 1) {
        return NextResponse.json({ success: false, error: "auctionFeeRate must be between 0 and 1" }, { status: 400 })
      }
      await upsertRate(db, AUCTION_KEY, rate)
    }

    if (body.preOrderFeeRate !== undefined) {
      const rate = parseFloat(String(body.preOrderFeeRate))
      if (isNaN(rate) || rate < 0 || rate > 1) {
        return NextResponse.json({ success: false, error: "preOrderFeeRate must be between 0 and 1" }, { status: 400 })
      }
      await upsertRate(db, PRE_ORDER_KEY, rate)
    }

    const [auctionFeeRate, preOrderFeeRate] = await Promise.all([
      getRate(db, AUCTION_KEY, DEFAULT_AUCTION_RATE),
      getRate(db, PRE_ORDER_KEY, DEFAULT_PRE_ORDER_RATE),
    ])

    return NextResponse.json({ success: true, auctionFeeRate, preOrderFeeRate })
  } catch (error) {
    console.error("PUT /api/settings/fees error:", error)
    return NextResponse.json({ success: false, error: "Failed to update fee rates" }, { status: 500 })
  }
}
