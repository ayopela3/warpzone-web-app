import { createHash } from "crypto"

interface Env {
  DB: any
}

export async function onRequestPost(context: { request: Request; env: Env; data: { corsHeaders: Record<string, string> } }) {
  try {
    const { email, password } = await context.request.json()

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password required" }), {
        status: 400,
        headers: { ...context.data.corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Check if user already exists
    const existingUser = await context.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first()
    if (existingUser) {
      return new Response(JSON.stringify({ error: "User already exists" }), {
        status: 409,
        headers: { ...context.data.corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Hash password (simple SHA-256 for demo - use bcrypt in production)
    const passwordHash = createHash("sha256").update(password).digest("hex")
    const userId = crypto.randomUUID()

    // Create user
    await context.env.DB.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)")
      .bind(userId, email, passwordHash)
      .run()

    return new Response(JSON.stringify({ success: true, userId }), {
      status: 201,
      headers: { ...context.data.corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    console.error(error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...context.data.corsHeaders, "Content-Type": "application/json" },
    })
  }
}
