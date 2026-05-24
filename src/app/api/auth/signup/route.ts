import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDb } from "@/lib/db"
import { rateLimit, getClientIP, createRateLimitResponse } from "@/lib/rate-limit"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 signups per minute per IP
    const clientIP = getClientIP(request)
    const rateLimitResult = await rateLimit(request, `signup:${clientIP}`, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 3,
    })

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult)
    }

    const body = await request.json()
    const { email, password } = body

    // Input validation
    if (!email || typeof email !== "string" || email.length > 254) {
      return NextResponse.json({ success: false, error: "A valid email is required" }, { status: 400 })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 })
    }
    if (!password || typeof password !== "string") {
      return NextResponse.json({ success: false, error: "Password is required" }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters" }, { status: 400 })
    }
    if (password.length > 128) {
      return NextResponse.json({ success: false, error: "Password must be 128 characters or fewer" }, { status: 400 })
    }

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    // Check if user already exists
    const existingUser = await db
      .prepare("SELECT id FROM users WHERE email = ?")
      .bind(email)
      .first()

    if (existingUser) {
      return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 })
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10)

    // Generate IDs
    const userId = crypto.randomUUID()
    const profileId = crypto.randomUUID()

    // Create user
    await db
      .prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, datetime('now'))")
      .bind(userId, email, passwordHash)
      .run()

    // Create profile with regular-user role
    await db
      .prepare(
        `INSERT INTO profiles (id, user_id, full_name, street, city, province, country, zip_code, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(profileId, userId, "", "", "", "", "", "", "regular-user")
      .run()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ success: false, error: "Failed to create account" }, { status: 500 })
  }
}
