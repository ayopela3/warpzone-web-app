import { NextRequest, NextResponse } from "next/server"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Only image files are allowed" }, { status: 400 })
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: "File size exceeds 10MB limit" }, { status: 400 })
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

    // Generate unique filename
    const fileExtension = file.name.split(".").pop()
    const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`

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
