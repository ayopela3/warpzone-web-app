import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    const db = await getDb()
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database not available" },
        { status: 503 },
      )
    }

    // Find user by email
    const user = (await db
      .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
      .bind(email)
      .first()) as { id: string; email: string; password_hash: string } | null

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 },
      )
    }

    // Verify password
    const isValidPassword = bcrypt.compareSync(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 },
      )
    }

    // Get user profile with role and ban state
    const profile = (await db
      .prepare(
        "SELECT role, is_banned, ban_reason FROM profiles WHERE user_id = ?",
      )
      .bind(user.id)
      .first()) as {
      role: string
      is_banned: number
      ban_reason: string | null
    } | null

    if (profile?.is_banned === 1) {
      const reason = profile.ban_reason ? `: ${profile.ban_reason}` : "."
      return NextResponse.json(
        { success: false, error: `Your account has been suspended${reason}` },
        { status: 403 },
      )
    }

    const userRole = profile?.role || "regular-user"

    // Fetch full_name to determine if profile is complete
    const profileDetails = (await db
      .prepare("SELECT full_name FROM profiles WHERE user_id = ?")
      .bind(user.id)
      .first()) as { full_name: string | null } | null
    const profileComplete = !!(profileDetails?.full_name?.trim())

    // Create session
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString() // 7 days

    await db
      .prepare(
        "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, datetime('now'))",
      )
      .bind(sessionId, user.id, expiresAt)
      .run()

    const response = NextResponse.json({
      success: true,
      sessionId,
      userId: user.id,
      userRole,
      profileComplete,
    })

    // Detect if running on HTTPS (production) or HTTP (localhost)
    const isSecure = request.url.startsWith("https://")

    const cookieOptions = {
      httpOnly: false, // must be readable by middleware (edge), not JS
      secure: isSecure,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    }

    // wz_role: role for middleware route-guarding
    response.cookies.set("wz_role", userRole, cookieOptions)
    // wz_session: session ID for API auth (replaces Authorization header pattern)
    response.cookies.set("wz_session", sessionId, {
      ...cookieOptions,
      httpOnly: true,
    })

    return response
  } catch (error) {
    console.error("Signin error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to sign in" },
      { status: 500 },
    )
  }
}
