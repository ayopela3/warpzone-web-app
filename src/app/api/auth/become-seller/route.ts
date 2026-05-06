import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, fullName, street, city, province, country, zipCode, phoneNumber, businessName } = body

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

    // Create profile with seller role
    await db
      .prepare(
        `INSERT INTO profiles (id, user_id, full_name, street, city, province, country, zip_code, phone_number, role, business_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(profileId, userId, fullName, street, city, province, country, zipCode, phoneNumber, "seller", businessName)
      .run()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Seller signup error:", error)
    return NextResponse.json({ success: false, error: "Failed to create account" }, { status: 500 })
  }
}
