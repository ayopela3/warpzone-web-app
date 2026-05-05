import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Get D1 database binding from Cloudflare context
    let db: CloudflareEnv["DB"] | null = null
    try {
      const { getRequestContext } = await import("@cloudflare/next-on-pages")
      const { env } = getRequestContext()
      db = (env as CloudflareEnv).DB
    } catch {
      return NextResponse.json(
        { success: false, error: "Database connection failed. Ensure you're running in Cloudflare environment." },
        { status: 500 }
      )
    }

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    // Find user by email
    const user = await db
      .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
      .bind(email)
      .first() as { id: string; email: string; password_hash: string } | null

    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    // Verify password
    const isValidPassword = bcrypt.compareSync(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    // Get user profile with role
    const profile = await db
      .prepare("SELECT role FROM profiles WHERE user_id = ?")
      .bind(user.id)
      .first() as { role: string } | null

    const userRole = profile?.role || "regular-user"

    // Create session
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

    await db
      .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, datetime('now'))")
      .bind(sessionId, user.id, expiresAt)
      .run()

    return NextResponse.json({
      success: true,
      sessionId,
      userId: user.id,
      userRole,
    })
  } catch (error) {
    console.error("Signin error:", error)
    return NextResponse.json({ success: false, error: "Failed to sign in" }, { status: 500 })
  }
}
