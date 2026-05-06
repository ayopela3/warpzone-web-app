import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("wz_session")?.value
      ?? request.headers.get("Authorization")?.replace("Bearer ", "")

    if (sessionId) {
      const db = await getDb()
      if (db) {
        await db
          .prepare("DELETE FROM sessions WHERE id = ?")
          .bind(sessionId)
          .run()
      }
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete("wz_role")
    response.cookies.delete("wz_session")
    return response
  } catch (error) {
    console.error("Signout error:", error)
    return NextResponse.json({ success: false, error: "Failed to sign out" }, { status: 500 })
  }
}
