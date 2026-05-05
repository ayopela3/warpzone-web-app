import { NextRequest, NextResponse } from "next/server"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sku, name, category, setName, rarity, description, imageUrl } = body

    // Get D1 database binding from Cloudflare context
    let db: CloudflareEnv["DB"] | null = null
    try {
      const { getRequestContext } = await import("@cloudflare/next-on-pages")
      const { env } = getRequestContext()
      db = (env as CloudflareEnv).DB
    } catch {
      return NextResponse.json(
        { success: false, error: "Database connection failed. Ensure you're running in Cloudflare environment." },
        { status: 500 }
      )
    }

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    // Check if product with SKU already exists
    const existingProduct = await db
      .prepare("SELECT id FROM products WHERE sku = ?")
      .bind(sku)
      .first()

    if (existingProduct) {
      return NextResponse.json({ success: false, error: "Product with this SKU already exists" }, { status: 400 })
    }

    // Create product
    const productId = crypto.randomUUID()
    await db
      .prepare(
        `INSERT INTO products (id, sku, name, category, set_name, rarity, description, image_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .bind(productId, sku, name, category, setName, rarity, description, imageUrl)
      .run()

    return NextResponse.json({ success: true, productId })
  } catch (error) {
    console.error("Product creation error:", error)
    return NextResponse.json({ success: false, error: "Failed to create product" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sku = searchParams.get("sku")

    // Get D1 database binding from Cloudflare context
    let db: CloudflareEnv["DB"] | null = null
    try {
      const { getRequestContext } = await import("@cloudflare/next-on-pages")
      const { env } = getRequestContext()
      db = (env as CloudflareEnv).DB
    } catch {
      return NextResponse.json(
        { success: false, error: "Database connection failed. Ensure you're running in Cloudflare environment." },
        { status: 500 }
      )
    }

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    if (sku) {
      // Get product by SKU
      const product = await db
        .prepare("SELECT * FROM products WHERE sku = ?")
        .bind(sku)
        .first()

      if (!product) {
        return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true, product })
    }

    // Get all products
    const products = await db
      .prepare("SELECT * FROM products ORDER BY created_at DESC")
      .all()

    return NextResponse.json({ success: true, products: products.results })
  } catch (error) {
    console.error("Product fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch products" }, { status: 500 })
  }
}
