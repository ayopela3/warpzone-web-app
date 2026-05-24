import { NextRequest, NextResponse } from "next/server"
import type { CloudflareEnv } from "@/types/cloudflare"
import { getDb } from "@/lib/db"
import { rateLimit, getClientIP, createRateLimitResponse } from "@/lib/rate-limit"

export const runtime = "edge"

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif"
]

// File signature (magic bytes) validation
const FILE_SIGNATURES: Record<string, number[]> = {
  "image/jpeg": [0xFF, 0xD8, 0xFF],
  "image/png": [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header for WebP
  "image/gif": [0x47, 0x49, 0x46, 0x38], // GIF87a or GIF89a
}

/**
 * Sanitize filename to prevent path traversal and ensure safe names
 */
function sanitizeFileName(name: string): string {
  // Remove path traversal attempts
  let sanitized = name.replace(/[\.]{2,}/g, "")
  sanitized = sanitized.replace(/[\\/]/g, "")
  
  // Remove control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, "")
  
  // Limit length
  if (sanitized.length > 100) {
    const ext = sanitized.split(".").pop() ?? ""
    sanitized = sanitized.slice(0, 95) + (ext ? `.${ext}` : "")
  }
  
  // Ensure filename has content
  if (!sanitized || sanitized === ".") {
    sanitized = "upload"
  }
  
  return sanitized
}

/**
 * Validate file content using magic bytes
 */
async function validateFileContent(file: File, expectedType: string): Promise<boolean> {
  const signature = FILE_SIGNATURES[expectedType]
  if (!signature) return true // Skip validation for unknown types
  
  const buffer = await file.slice(0, signature.length).arrayBuffer()
  const bytes = new Uint8Array(buffer)
  
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return false
  }
  
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 20 uploads per minute per IP
    const rateLimitResult = await rateLimit(request, `upload:${getClientIP(request)}`, {
      windowMs: 60 * 1000,
      maxRequests: 20,
    })
    if (!rateLimitResult.success) return createRateLimitResponse(rateLimitResult)

    // Authentication — only signed-in users may upload
    const sessionId =
      request.cookies.get("__Secure-wz_session")?.value ??
      request.cookies.get("wz_session")?.value ??
      request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!sessionId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }
    const db = await getDb()
    if (db) {
      const session = await db
        .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
        .bind(sessionId)
        .first<{ user_id: string; expires_at: string }>()
      if (!session || new Date(session.expires_at) < new Date()) {
        return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 401 })
      }
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    // Validate MIME type is in allowlist
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `File type not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}` },
        { status: 415 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: "File size exceeds 10MB limit" }, { status: 413 })
    }

    // Validate file content using magic bytes
    const isValidContent = await validateFileContent(file, file.type)
    if (!isValidContent) {
      return NextResponse.json(
        { success: false, error: "File content does not match declared type (possible spoofing)" },
        { status: 400 }
      )
    }

    // Get R2 bucket binding from Cloudflare context
    let r2: CloudflareEnv["IMAGES"] | null = null
    try {
      const { getRequestContext } = await import("@cloudflare/next-on-pages")
      const { env } = getRequestContext()
      r2 = (env as CloudflareEnv).IMAGES
    } catch {
      return NextResponse.json(
        { success: false, error: "R2 connection failed. Ensure you're running in Cloudflare environment." },
        { status: 500 }
      )
    }

    if (!r2) {
      return NextResponse.json({ success: false, error: "R2 bucket not available" }, { status: 500 })
    }

    // Generate unique filename with sanitization
    const originalName = sanitizeFileName(file.name)
    const fileExtension = originalName.split(".").pop()?.toLowerCase()
    
    // Validate extension matches MIME type
    const expectedExtensions: Record<string, string[]> = {
      "image/jpeg": ["jpg", "jpeg"],
      "image/png": ["png"],
      "image/webp": ["webp"],
      "image/gif": ["gif"],
      "image/avif": ["avif"]
    }
    
    const allowedExts = expectedExtensions[file.type]
    if (fileExtension && allowedExts && !allowedExts.includes(fileExtension)) {
      return NextResponse.json(
        { success: false, error: `Extension .${fileExtension} does not match MIME type ${file.type}` },
        { status: 400 }
      )
    }
    
    const uniqueFileName = `${crypto.randomUUID()}.${fileExtension || "bin"}`

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer()
    await r2.put(uniqueFileName, new Uint8Array(arrayBuffer), {
      httpMetadata: {
        contentType: file.type
      }
    })

    // Return the public URL from environment variable
    const r2PublicUrl = process.env.R2_PUBLIC_URL
    const directUrl = r2PublicUrl ? `${r2PublicUrl}/${uniqueFileName}` : null

    // Also provide a proxied URL through the app's domain (avoids CORS issues)
    // This uses the current request's origin to construct the proxied URL
    const requestUrl = new URL(request.url)
    const proxiedUrl = `${requestUrl.origin}/api/images/${encodeURIComponent(uniqueFileName)}`

    return NextResponse.json({
      success: true,
      url: proxiedUrl, // Use proxied URL by default (works on any domain)
      directUrl, // Direct R2 URL (may not work on custom domains without proper CORS)
      filename: uniqueFileName
    })
  } catch (error) {
    console.error("Image upload error:", error)
    return NextResponse.json({ success: false, error: "Failed to upload image" }, { status: 500 })
  }
}
