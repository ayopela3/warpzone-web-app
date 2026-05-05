interface Env {
  DB: any
}

export async function onRequestPost(context: { request: Request; env: Env; data: { corsHeaders: Record<string, string> } }) {
  try {
    const sessionId = context.request.headers.get("Authorization")?.replace("Bearer ", "")

    if (!sessionId) {
      return new Response(JSON.stringify({ error: "Session ID required" }), {
        status: 400,
        headers: { ...context.data.corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Delete session
    await context.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run()

    return new Response(JSON.stringify({ success: true }), {
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
