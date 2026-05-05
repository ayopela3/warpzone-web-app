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

    // Find user
    const user = await context.env.DB.prepare("SELECT id, password_hash FROM users WHERE email = ?").bind(email).first()
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { ...context.data.corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Verify password
    const passwordHash = createHash("sha256").update(password).digest("hex")
    if (user.password_hash as string !== passwordHash) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { ...context.data.corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Create session
    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

    await context.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(sessionId, user.id as string, expiresAt)
      .run()

    return new Response(JSON.stringify({ success: true, sessionId, userId: user.id }), {
      status: 200,
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
