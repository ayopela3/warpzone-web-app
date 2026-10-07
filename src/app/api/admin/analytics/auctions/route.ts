import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { authErrorResponse, requireAdmin } from "@/lib/auth"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    await requireAdmin(request, db)

    const result = await db.prepare(
      `SELECT COUNT(*) as count FROM auctions
       WHERE datetime('now') >= start_time AND datetime('now') <= end_time`
    ).first()
    const count = result ? (result as { count: number }).count : 0

    return NextResponse.json({ success: true, count })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse

    console.error("Failed to fetch auction count:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch auction count" }, { status: 500 })
  }
}
