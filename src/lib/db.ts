import type { D1Database } from "@/types/cloudflare"

/**
 * Retrieves the D1 database binding from the Cloudflare request context.
 * Returns null in local development (outside the Cloudflare runtime).
 */
export async function getDb(): Promise<D1Database | null> {
  try {
    const { getRequestContext } = await import("@cloudflare/next-on-pages")
    const { env } = getRequestContext()
    return (env as { DB: D1Database }).DB ?? null
  } catch {
    return null
  }
}

/** Throws a typed error response when the database is unavailable. */
export function dbUnavailableResponse() {
  return Response.json(
    { success: false, error: "Database not available" },
    { status: 503 }
  )
}
