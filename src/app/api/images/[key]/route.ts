import { NextRequest, NextResponse } from "next/server"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = "edge"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    const decodedKey = decodeURIComponent(key)

    // Get R2 bucket binding from Cloudflare context
    let r2: CloudflareEnv["IMAGES"] | null = null
    try {
      const { getRequestContext } = await import("@cloudflare/next-on-pages")
      const { env } = getRequestContext()
      r2 = (env as CloudflareEnv).IMAGES
    } catch {
      return NextResponse.json(
        { error: "R2 connection failed" },
        { status: 500 }
      )
    }

    if (!r2) {
      return NextResponse.json({ error: "R2 bucket not available" }, { status: 500 })
    }

    // Get the object from R2
    const object = await r2.get(decodedKey)

    if (!object) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    // Get the object's data as a stream
    const data = object.write()

    // Return the image with appropriate headers
    const headers = new Headers()
    headers.set("Content-Type", object.httpMetadata?.contentType || "image/jpeg")
    headers.set("Cache-Control", "public, max-age=31536000, immutable")
    headers.set("ETag", `"${decodedKey}"`)

    return new NextResponse(data, {
      headers,
      status: 200,
    })
  } catch (error) {
    console.error("Image fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 })
  }
}
