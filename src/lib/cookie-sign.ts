/**
 * HMAC-SHA256 cookie signing utilities.
 *
 * Cookie value format: `<payload>.<base64url-signature>`
 *
 * The signature covers `payload` using `COOKIE_SECRET` from env.
 * If the secret is missing (local dev without .env.local) the cookie is
 * still set but verification always returns null — this keeps local dev
 * working while ensuring production cannot be spoofed.
 */

const ALGORITHM = { name: "HMAC", hash: "SHA-256" }

/**
 * Import the COOKIE_SECRET as a CryptoKey.
 * Returns null if the env var is not set (dev/test fallback).
 */
async function getKey(): Promise<CryptoKey | null> {
  const secret = process.env.COOKIE_SECRET
  if (!secret) return null
  const enc = new TextEncoder()
  return crypto.subtle.importKey("raw", enc.encode(secret), ALGORITHM, false, ["sign", "verify"])
}

/**
 * Base64url-encode a Uint8Array (no padding, URL-safe).
 */
function b64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

/**
 * Sign a payload string and return `<payload>.<signature>`.
 * If COOKIE_SECRET is unset, returns the payload unsigned (dev mode).
 */
export async function signCookieValue(payload: string): Promise<string> {
  const key = await getKey()
  if (!key) return payload // dev fallback — no secret configured

  const enc = new TextEncoder()
  const sigBuf = await crypto.subtle.sign(ALGORITHM, key, enc.encode(payload))
  const sig = b64urlEncode(sigBuf)
  return `${payload}.${sig}`
}

/**
 * Verify a signed cookie value and return the original payload.
 * Returns null if the signature is invalid or missing.
 *
 * In dev mode (no COOKIE_SECRET) the value is returned as-is so the
 * app still functions — only the security guarantee is missing.
 */
export async function verifyCookieValue(signed: string): Promise<string | null> {
  const key = await getKey()
  if (!key) {
    // Dev mode: no secret, accept unsigned value as-is
    // Strip any trailing ".xxx" that might exist from a previous signed env
    const dotIdx = signed.lastIndexOf(".")
    return dotIdx === -1 ? signed : signed.slice(0, dotIdx)
  }

  const dotIdx = signed.lastIndexOf(".")
  if (dotIdx === -1) return null // no signature present

  const payload = signed.slice(0, dotIdx)
  const sigB64 = signed.slice(dotIdx + 1)

  // Re-decode base64url → ArrayBuffer
  const padded = sigB64.replace(/-/g, "+").replace(/_/g, "/")
  let binary: string
  try {
    binary = atob(padded)
  } catch {
    return null
  }
  const sigBuf = Uint8Array.from(binary, (c) => c.charCodeAt(0))

  const enc = new TextEncoder()
  const valid = await crypto.subtle.verify(ALGORITHM, key, sigBuf, enc.encode(payload))
  return valid ? payload : null
}
