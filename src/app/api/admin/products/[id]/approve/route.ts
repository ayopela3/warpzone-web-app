import { NextRequest, NextResponse } from "next/server"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = "edge"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { approvalStatus } = await request.json()
    const { id } = await params

    if (!approvalStatus || !["approved", "rejected"].includes(approvalStatus)) {
      return NextResponse.json({ success: false, error: "Invalid approval status" }, { status: 400 })
    }

    // Get D1 database binding from Cloudflare context
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

    // Update product approval status
    await db
      .prepare("UPDATE products SET approval_status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(approvalStatus, id)
      .run()

    return NextResponse.json({ success: true, approvalStatus })
  } catch (error) {
    console.error("Product approval error:", error)
    return NextResponse.json({ success: false, error: "Failed to update product approval status" }, { status: 500 })
  }
}
