import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { authErrorResponse, requireAdmin } from "@/lib/auth"

export const runtime = "edge"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    await requireAdmin(request, db)

    const { approvalStatus } = await request.json()
    const { id } = await params

    if (!approvalStatus || !["approved", "rejected"].includes(approvalStatus)) {
      return NextResponse.json({ success: false, error: "Invalid approval status" }, { status: 400 })
    }

    // Update product approval status
    await db
      .prepare("UPDATE products SET approval_status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(approvalStatus, id)
      .run()

    return NextResponse.json({ success: true, approvalStatus })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse

    console.error("Product approval error:", error)
    return NextResponse.json({ success: false, error: "Failed to update product approval status" }, { status: 500 })
  }
}
