import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function GET() {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const result = await db.prepare("SELECT COUNT(*) as count FROM profiles").first()
    const count = result ? (result as { count: number }).count : 0

    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error("Failed to fetch user count:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch user count" }, { status: 500 })
  }
}
