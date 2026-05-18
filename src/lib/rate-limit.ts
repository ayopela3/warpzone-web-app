import { NextRequest, NextResponse } from "next/server"
import { getDb } from "./db"

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

/**
 * Rate limit by IP address using D1 database.
 * Tracks requests in a rate_limits table with sliding window.
 */
export async function rateLimit(
  request: NextRequest,
  identifier: string,
  options: {
    windowMs?: number
    maxRequests?: number
  } = {}
): Promise<RateLimitResult> {
  const windowMs = options.windowMs ?? 60 * 1000 // 1 minute default
  const maxRequests = options.maxRequests ?? 5 // 5 requests per window default

  const db = await getDb()
  if (!db) {
    // If DB unavailable, allow request but log warning
    console.warn("Rate limiting disabled: database unavailable")
    return { success: true, limit: maxRequests, remaining: maxRequests, resetTime: Date.now() + windowMs }
  }

  const now = Date.now()
  const windowStart = now - windowMs

  try {
    // Clean up old entries for this identifier
    await db
      .prepare("DELETE FROM rate_limits WHERE identifier = ? AND timestamp < ?")
      .bind(identifier, windowStart)
      .run()

    // Count current requests in window
    const countResult = await db
      .prepare("SELECT COUNT(*) as count FROM rate_limits WHERE identifier = ? AND timestamp >= ?")
      .bind(identifier, windowStart)
      .first<{ count: number }>()

    const currentCount = countResult?.count ?? 0

    if (currentCount >= maxRequests) {
      // Rate limit exceeded
      const oldestRequest = await db
        .prepare("SELECT timestamp FROM rate_limits WHERE identifier = ? ORDER BY timestamp ASC LIMIT 1")
        .bind(identifier)
        .first<{ timestamp: number }>()

      const resetTime = (oldestRequest?.timestamp ?? now) + windowMs

      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        resetTime,
      }
    }

    // Record this request
    await db
      .prepare("INSERT INTO rate_limits (id, identifier, timestamp, path) VALUES (?, ?, ?, ?)")
      .bind(crypto.randomUUID(), identifier, now, new URL(request.url).pathname)
      .run()

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - currentCount - 1,
      resetTime: now + windowMs,
    }
  } catch (error) {
    console.error("Rate limit error:", error)
    // On error, allow request to proceed (fail open)
    return { success: true, limit: maxRequests, remaining: maxRequests, resetTime: now + windowMs }
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: NextRequest): string {
  // Cloudflare-specific headers
  const cfConnectingIP = request.headers.get("cf-connecting-ip")
  if (cfConnectingIP) return cfConnectingIP

  // Standard forwarding headers
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim()
  }

  const realIP = request.headers.get("x-real-ip")
  if (realIP) return realIP

  // Fallback to a hash of user agent (less reliable but better than nothing)
  const userAgent = request.headers.get("user-agent") ?? "unknown"
  return `ua-${hashString(userAgent)}`
}

/**
 * Simple string hash for fallback IP
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

/**
 * Create a rate limit response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const resetSeconds = Math.ceil((result.resetTime - Date.now()) / 1000)

  return NextResponse.json(
    {
      success: false,
      error: "Rate limit exceeded. Please try again later.",
      retryAfter: resetSeconds,
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
        "Retry-After": String(resetSeconds),
      },
    }
  )
}
