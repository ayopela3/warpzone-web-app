import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// GET /api/admin/profile — get admin profile for checkout purposes (public)
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    // Get the admin profile (there should be only one for checkout purposes)
    const adminProfile = await db
      .prepare("SELECT id, user_id, full_name, business_name FROM profiles WHERE role = 'admin' LIMIT 1")
      .first<{ id: string; user_id: string; full_name: string; business_name: string }>()

    if (!adminProfile) {
      return NextResponse.json({ success: false, error: "Admin profile not found" }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      profile: {
        id: adminProfile.id,
        full_name: adminProfile.full_name,
        business_name: adminProfile.business_name
      }
    })
  } catch (error) {
    console.error("Admin profile error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch admin profile" }, { status: 500 })
  }
}
