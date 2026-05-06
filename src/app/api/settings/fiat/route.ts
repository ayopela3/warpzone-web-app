import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function GET() {
  const db = await getDb()

  if (!db) {
    return NextResponse.json({ success: true, fiatSymbol: "$" })
  }

  try {
    const result = await db
      .prepare("SELECT value FROM settings WHERE key = 'fiat_symbol'")
      .first<{ value: string }>()

    if (!result) {
      const id = crypto.randomUUID()
      await db
        .prepare("INSERT INTO settings (id, key, value) VALUES (?, 'fiat_symbol', '$')")
        .bind(id)
        .run()
      return NextResponse.json({ success: true, fiatSymbol: "$" })
    }

    return NextResponse.json({ success: true, fiatSymbol: result.value })
  } catch (error) {
    console.error("Failed to fetch fiat symbol:", error)
    return NextResponse.json({ success: true, fiatSymbol: "$" })
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json() as { fiatSymbol?: string }
  const { fiatSymbol } = body

  if (!fiatSymbol || fiatSymbol.trim().length === 0 || fiatSymbol.length > 5) {
    return NextResponse.json({ success: false, error: "Invalid fiat symbol" }, { status: 400 })
  }

  const db = await getDb()

  if (!db) {
    return NextResponse.json({ success: true, fiatSymbol })
  }

  try {
    const existing = await db
      .prepare("SELECT id FROM settings WHERE key = 'fiat_symbol'")
      .first()

    if (existing) {
      await db
        .prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'fiat_symbol'")
        .bind(fiatSymbol)
        .run()
    } else {
      const id = crypto.randomUUID()
      await db
        .prepare("INSERT INTO settings (id, key, value) VALUES (?, 'fiat_symbol', ?)")
        .bind(id, fiatSymbol)
        .run()
    }

    return NextResponse.json({ success: true, fiatSymbol })
  } catch (error) {
    console.error("Failed to save fiat symbol:", error)
    return NextResponse.json({ success: false, error: "Failed to save fiat symbol" }, { status: 500 })
  }
}
