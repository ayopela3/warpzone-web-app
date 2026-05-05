import { NextRequest, NextResponse } from "next/server"
import { getRequestContext } from "@cloudflare/next-on-pages"
import type { CloudflareEnv } from "@/types/cloudflare"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, sellerId, condition, price, quantity } = body

    // Get D1 database binding from Cloudflare context
    const { env } = getRequestContext()
    const db = (env as CloudflareEnv).DB

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    // Verify product exists
    const product = await db
      .prepare("SELECT id FROM products WHERE id = ?")
      .bind(productId)
      .first()

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    // Verify seller profile exists
    const seller = await db
      .prepare("SELECT id FROM profiles WHERE id = ?")
      .bind(sellerId)
      .first()

    if (!seller) {
      return NextResponse.json({ success: false, error: "Seller not found" }, { status: 404 })
    }

    // Create product listing
    const listingId = crypto.randomUUID()
    await db
      .prepare(
        `INSERT INTO product_listings (id, product_id, seller_id, condition, price, quantity, in_stock, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
      )
      .bind(listingId, productId, sellerId, condition, price, quantity)
      .run()

    return NextResponse.json({ success: true, listingId })
  } catch (error) {
    console.error("Product listing creation error:", error)
    return NextResponse.json({ success: false, error: "Failed to create listing" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")
    const sellerId = searchParams.get("sellerId")

    // Get D1 database binding from Cloudflare context
    const { env } = getRequestContext()
    const db = (env as CloudflareEnv).DB

    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 500 })
    }

    let query = "SELECT pl.*, p.sku, p.name as product_name, p.category, p.set_name, p.rarity, p.image_url FROM product_listings pl JOIN products p ON pl.product_id = p.id"
    const params: string[] = []

    if (productId) {
      query += " WHERE pl.product_id = ?"
      params.push(productId)
    } else if (sellerId) {
      query += " WHERE pl.seller_id = ?"
      params.push(sellerId)
    }

    query += " AND pl.in_stock = 1 ORDER BY pl.price ASC"

    const listings = await db
      .prepare(query)
      .bind(...params)
      .all()

    return NextResponse.json({ success: true, listings: listings.results })
  } catch (error) {
    console.error("Product listings fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch listings" }, { status: 500 })
  }
}
