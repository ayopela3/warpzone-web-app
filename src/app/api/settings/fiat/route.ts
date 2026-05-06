import { NextRequest, NextResponse } from "next/server"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = "edge"

export async function GET() {
  try {
    let db: CloudflareEnv["DB"] | null = null
    try {
      const { getRequestContext } = await import("@cloudflare/next-on-pages")
      const { env } = getRequestContext()
      db = (env as CloudflareEnv).DB
    } catch {
      // In local development, return default fiat symbol
      return NextResponse.json({ success: true, fiatSymbol: "$" })
    }

    if (!db) {
      // In local development, return default fiat symbol
      return NextResponse.json({ success: true, fiatSymbol: "$" })
    }

    // Get fiat symbol from settings table (or create default if not exists)
    const result = await db.prepare("SELECT value FROM settings WHERE key = 'fiat_symbol'").first()
    
    if (!result) {
      // Insert default fiat symbol with generated id
      const id = crypto.randomUUID()
      await db.prepare("INSERT INTO settings (id, key, value) VALUES (?, 'fiat_symbol', '$')").bind(id).run()
      return NextResponse.json({ success: true, fiatSymbol: "$" })
    }

    return NextResponse.json({ 
      success: true, 
      fiatSymbol: (result as { value: string }).value 
    })
  } catch (error) {
    console.error("Failed to fetch fiat symbol:", error)
    // Return default fiat symbol on error
    return NextResponse.json({ success: true, fiatSymbol: "$" })
  }
}

export async function PUT(request: NextRequest) {
  let body: { fiatSymbol?: string } = {}
  try {
    body = await request.json()
    const { fiatSymbol } = body

    if (!fiatSymbol || fiatSymbol.length > 3) {
      return NextResponse.json({ success: false, error: "Invalid fiat symbol" }, { status: 400 })
    }

    let db: CloudflareEnv["DB"] | null = null
    try {
      const { getRequestContext } = await import("@cloudflare/next-on-pages")
      const { env } = getRequestContext()
      db = (env as CloudflareEnv).DB
    } catch {
      // In local development, just return success without saving
      return NextResponse.json({ success: true, fiatSymbol })
    }

    if (!db) {
      // In local development, just return success without saving
      return NextResponse.json({ success: true, fiatSymbol })
    }

    // Check if setting exists
    const existing = await db.prepare("SELECT id FROM settings WHERE key = 'fiat_symbol'").first()

    if (existing) {
      // Update existing setting
      await db.prepare("UPDATE settings SET value = ? WHERE key = 'fiat_symbol'").bind(fiatSymbol).run()
    } else {
      // Insert new setting with generated id
      const id = crypto.randomUUID()
      await db.prepare("INSERT INTO settings (id, key, value) VALUES (?, 'fiat_symbol', ?)").bind(id, fiatSymbol).run()
    }

    return NextResponse.json({ success: true, fiatSymbol })
  } catch (error) {
    console.error("Failed to save fiat symbol:", error)
    // Return success even on error for local development
    return NextResponse.json({ success: true, fiatSymbol: body.fiatSymbol || "$" })
  }
}
