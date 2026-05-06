import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { approvalStatus } = await request.json()
    const { id } = await params

    if (!approvalStatus || !["approved", "rejected"].includes(approvalStatus)) {
      return NextResponse.json({ success: false, error: "Invalid approval status" }, { status: 400 })
    }

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
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
