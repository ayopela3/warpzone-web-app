import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { featured } = await request.json()
    const { id } = await params

    if (typeof featured !== "number") {
      return NextResponse.json({ success: false, error: "Invalid featured value" }, { status: 400 })
    }

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
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
