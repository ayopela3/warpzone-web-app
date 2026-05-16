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

    console.log(`[Image Proxy] Fetching key: ${decodedKey}`)

    // Get R2 bucket binding from Cloudflare context
    let r2: CloudflareEnv["IMAGES"] | null = null
    try {
      const { getRequestContext } = await import("@cloudflare/next-on-pages")
      const { env } = getRequestContext()
      r2 = (env as CloudflareEnv).IMAGES
      console.log(`[Image Proxy] R2 binding acquired: ${r2 ? 'yes' : 'no'}`)
    } catch (err) {
      console.error(`[Image Proxy] R2 connection failed:`, err)
      return NextResponse.json(
        { error: "R2 connection failed", details: String(err) },
        { status: 500 }
      )
    }

    if (!r2) {
      console.error(`[Image Proxy] R2 bucket not available`)
      return NextResponse.json({ error: "R2 bucket not available" }, { status: 500 })
    }

    // Get the object from R2
    const object = await r2.get(decodedKey)
    console.log(`[Image Proxy] Object found: ${object ? 'yes' : 'no'}`)

    if (!object) {
      console.error(`[Image Proxy] Image not found: ${decodedKey}`)
      return NextResponse.json({ error: "Image not found", key: decodedKey }, { status: 404 })
    }

    // Log object metadata
    console.log(`[Image Proxy] Object size: ${object.size}, type: ${object.httpMetadata?.contentType}`)

    // Get the object's data as a stream
    // R2 can return either body property or write() method depending on runtime
    let stream: ReadableStream<Uint8Array> | undefined
    
    if (object.body) {
      stream = object.body
      console.log(`[Image Proxy] Using object.body`)
    } else if (object.write) {
      stream = object.write()
      console.log(`[Image Proxy] Using object.write()`)
    }

    if (!stream) {
      console.error(`[Image Proxy] No stream available on R2 object`)
      return NextResponse.json({ error: "Image data unavailable", availableKeys: Object.keys(object) }, { status: 500 })
    }

    // Return the image with appropriate headers
    const headers = new Headers()
    headers.set("Content-Type", object.httpMetadata?.contentType || "image/jpeg")
    headers.set("Cache-Control", "public, max-age=31536000, immutable")
    headers.set("ETag", `"${decodedKey}"`)

    console.log(`[Image Proxy] Returning image with type: ${object.httpMetadata?.contentType || "image/jpeg"}`)

    return new NextResponse(stream, {
      headers,
      status: 200,
    })
  } catch (error) {
    console.error("[Image Proxy] Fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch image", details: String(error) }, { status: 500 })
  }
}
