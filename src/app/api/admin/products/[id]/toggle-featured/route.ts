import { NextRequest, NextResponse } from "next/server"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = "edge"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { featured } = await request.json()
    const { id } = await params

    if (typeof featured !== "number") {
      return NextResponse.json({ success: false, error: "Invalid featured value" }, { status: 400 })
    }

    let db: CloudflareEnv["DB"] | null = null
    try {
      const { getRequestContext } = await import("@cloudflare/next-on-pages")
      const { env } = getRequestContext()
      db = (env as CloudflareEnv).DB
    } catch {
      return NextResponse.json(
        { success: false, error: "Database connection failed. Ensure you're running in Cloudflare environment." },
        { status: 500 }
      )
    }

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    await db
      .prepare("UPDATE products SET featured = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(featured, id)
      .run()

    return NextResponse.json({ success: true, featured })
  } catch (error) {
    console.error("Toggle featured error:", error)
    return NextResponse.json({ success: false, error: "Failed to toggle featured status" }, { status: 500 })
  }
}
