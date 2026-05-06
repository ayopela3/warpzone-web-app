import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { is_active } = await request.json()
    const { id } = await params

    if (typeof is_active !== "number") {
      return NextResponse.json({ success: false, error: "Invalid is_active value" }, { status: 400 })
    }

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    await db
      .prepare("UPDATE products SET is_active = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(is_active, id)
      .run()

    return NextResponse.json({ success: true, is_active })
  } catch (error) {
    console.error("Toggle active error:", error)
    return NextResponse.json({ success: false, error: "Failed to toggle active status" }, { status: 500 })
  }
}
