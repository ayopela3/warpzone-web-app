import { NextRequest } from "next/server"
import { getDb } from "./db"

export interface SessionResult {
  userId: string
  profileId: string
  role: string
  isBanned: number
  banReason: string | null
}

/**
 * Resolve the authenticated user's session from cookie or Authorization header.
 * Returns null if no valid session found.
 */
export async function resolveSession(
  request: NextRequest,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<{ userId: string } | null> {
  const sessionId =
    request.cookies.get("wz_session")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "")

  if (!sessionId) return null

  const session = await db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: string; expires_at: string }>()

  if (!session || new Date(session.expires_at) < new Date()) return null

  return { userId: session.user_id }
}

/**
 * Resolve the authenticated user with full profile details.
 * Returns null if no valid session or user not found.
 */
export async function resolveUser(
  request: NextRequest,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<SessionResult | null> {
  const sessionId =
    request.cookies.get("wz_session")?.value ??
    request.headers.get("Authorization")?.replace("Bearer ", "")

  if (!sessionId) return null

  const session = await db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ user_id: string; expires_at: string }>()

  if (!session || new Date(session.expires_at) < new Date()) return null

  const profile = await db
    .prepare("SELECT id, role, is_banned, ban_reason FROM profiles WHERE user_id = ?")
    .bind(session.user_id)
    .first<{ id: string; role: string; is_banned: number; ban_reason: string | null }>()

  if (!profile) return null

  return {
    userId: session.user_id,
    profileId: profile.id,
    role: profile.role,
    isBanned: profile.is_banned,
    banReason: profile.ban_reason,
  }
}

/**
 * Require authentication - throws if not authenticated.
 * Use this for routes that require authentication.
 */
export async function requireAuth(
  request: NextRequest,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<{ userId: string }> {
  const session = await resolveSession(request, db)
  if (!session) {
    throw new Error("Not authenticated")
  }
  return session
}

/**
 * Require admin role - throws if not authenticated or not admin.
 */
export async function requireAdmin(
  request: NextRequest,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<SessionResult> {
  const user = await resolveUser(request, db)
  if (!user) {
    throw new Error("Not authenticated")
  }
  if (user.role !== "admin") {
    throw new Error("Forbidden")
  }
  return user
}
