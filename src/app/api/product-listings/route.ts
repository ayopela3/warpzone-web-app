import { NextRequest, NextResponse } from "next/server"
import type { CloudflareEnv } from "@/types/cloudflare"
import { getDb } from "@/lib/db"
import { authErrorResponse, requireSeller } from "@/lib/auth"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, sellerId, condition, price, quantity } = body

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const user = await requireSeller(request, db)
    const listingSellerId = user.role === "admin" && sellerId ? sellerId : user.profileId

    // Verify product exists. Normal sellers may only list approved, active products.
    const product = await db
      .prepare("SELECT id, approval_status, is_active FROM products WHERE id = ?")
      .bind(productId)
      .first<{ id: string; approval_status: string; is_active: number }>()

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    if (user.role !== "admin" && (product.approval_status !== "approved" || product.is_active !== 1)) {
      return NextResponse.json({ success: false, error: "Product is not available for listing" }, { status: 400 })
    }

    // Verify seller profile exists
    const seller = await db
      .prepare("SELECT id FROM profiles WHERE id = ?")
      .bind(listingSellerId)
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
      .bind(listingId, productId, listingSellerId, condition, price, quantity)
      .run()

    return NextResponse.json({ success: true, listingId })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse

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
