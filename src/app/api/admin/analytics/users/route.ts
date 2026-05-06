import { NextResponse } from "next/server"
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
      return NextResponse.json(
        { success: false, error: "Database connection failed. Ensure you're running in Cloudflare environment." },
        { status: 500 }
      )
    }

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    const result = await db.prepare("SELECT COUNT(*) as count FROM profiles").first()
    const count = result ? (result as { count: number }).count : 0

    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error("Failed to fetch user count:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch user count" }, { status: 500 })
  }
}
