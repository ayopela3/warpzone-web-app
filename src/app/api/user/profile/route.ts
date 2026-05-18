import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDb } from "@/lib/db"
import { resolveSession } from "@/lib/auth"

export const runtime = "edge"

/**
 * GET /api/user/profile
 * Returns the authenticated user's profile details.
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const session = await resolveSession(request, db)
    if (!session) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const [user, profile] = await Promise.all([
      db.prepare("SELECT email FROM users WHERE id = ?").bind(session.userId).first<{ email: string }>(),
      db
        .prepare(
          `SELECT id, full_name, phone_number, street, city, province, country, zip_code,
                  business_name, profile_picture, role
           FROM profiles WHERE user_id = ?`
        )
        .bind(session.userId)
        .first<{
          id: string
          full_name: string
          phone_number: string | null
          street: string
          city: string
          province: string
          country: string
          zip_code: string
          business_name: string | null
          profile_picture: string | null
          role: string
        }>(),
    ])

    if (!user || !profile) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        email: user.email,
        full_name: profile.full_name,
        phone_number: profile.phone_number ?? "",
        street: profile.street,
        city: profile.city,
        province: profile.province,
        country: profile.country,
        zip_code: profile.zip_code,
        business_name: profile.business_name ?? "",
        profile_picture: profile.profile_picture ?? "",
        role: profile.role,
      },
    })
  } catch (error) {
    console.error("Get profile error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch profile" }, { status: 500 })
  }
}

/**
 * PUT /api/user/profile
 * Updates the authenticated user's profile and optionally their password.
 * Body: { full_name, phone_number, street, city, province, country, zip_code,
 *         business_name?, current_password?, new_password? }
 */
export async function PUT(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const session = await resolveSession(request, db)
    if (!session) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const body = await request.json()
    const {
      full_name, phone_number, street, city, province, country, zip_code,
      business_name, current_password, new_password,
    } = body

    if (!full_name) {
      return NextResponse.json({ success: false, error: "Full name is required" }, { status: 400 })
    }

    // Handle password change if requested
    if (new_password) {
      if (!current_password) {
        return NextResponse.json({ success: false, error: "Current password is required to set a new one" }, { status: 400 })
      }
      if (new_password.length < 8) {
        return NextResponse.json({ success: false, error: "New password must be at least 8 characters" }, { status: 400 })
      }

      const user = await db
        .prepare("SELECT password_hash FROM users WHERE id = ?")
        .bind(session.userId)
        .first<{ password_hash: string }>()

      if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })

      const valid = bcrypt.compareSync(current_password, user.password_hash)
      if (!valid) {
        return NextResponse.json({ success: false, error: "Current password is incorrect" }, { status: 400 })
      }

      const newHash = bcrypt.hashSync(new_password, 10)
      await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(newHash, session.userId).run()
    }

    // Update profile
    await db
      .prepare(
        `UPDATE profiles
         SET full_name = ?, phone_number = ?, street = ?, city = ?, province = ?,
             country = ?, zip_code = ?, business_name = ?, updated_at = datetime('now')
         WHERE user_id = ?`
      )
      .bind(
        full_name,
        phone_number ?? null,
        street ?? "",
        city ?? "",
        province ?? "",
        country ?? "",
        zip_code ?? "",
        business_name ?? null,
        session.userId
      )
      .run()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 })
  }
}
