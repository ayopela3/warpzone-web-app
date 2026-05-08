import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sku, name, category, setName, rarity, condition, description, imageUrl, sellerId, price, quantity } = body

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    // Check if product with SKU already exists
    const existingProduct = await db
      .prepare("SELECT id FROM products WHERE sku = ?")
      .bind(sku)
      .first()

    if (existingProduct) {
      return NextResponse.json({ success: false, error: "Product with this SKU already exists" }, { status: 400 })
    }

    // Create product with pending approval status
    const productId = crypto.randomUUID()
    await db
      .prepare(
        `INSERT INTO products (id, sku, name, category, set_name, rarity, condition, description, image_url, approval_status, created_by, created_at, updated_at, price, quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), datetime('now'), ?, ?)`
      )
      .bind(productId, sku, name, category, setName, rarity, condition || 'NEW', description, imageUrl, sellerId, price || 0, quantity || 1)
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
    const sellerId = searchParams.get("sellerId")
    const approvalStatus = searchParams.get("approvalStatus")
    const showAll = searchParams.get("showAll") === "true"
    const search = searchParams.get("search")
    const limit = parseInt(searchParams.get("limit") ?? "50", 10)

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
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

    // Build query based on filters
    let query = "SELECT p.*, pr.full_name as seller_name FROM products p LEFT JOIN profiles pr ON p.created_by = pr.id"
    const conditions: string[] = []
    const params: (string | number)[] = []

    if (sellerId) {
      conditions.push("p.created_by = ?")
      params.push(sellerId)
    }

    if (search) {
      conditions.push("(p.name LIKE ? OR p.sku LIKE ? OR p.category LIKE ?)")
      const like = `%${search}%`
      params.push(like, like, like)
    }

    if (approvalStatus) {
      conditions.push("p.approval_status = ?")
      params.push(approvalStatus)
    } else if (!showAll && !sellerId) {
      // By default, only show approved and active products unless showAll is true or filtering by seller
      conditions.push("p.approval_status = 'approved'")
      conditions.push("p.is_active = 1")
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ")
    }

    query += ` ORDER BY p.created_at DESC LIMIT ${limit}`

    let products
    if (params.length > 0) {
      products = await db.prepare(query).bind(...params).all()
    } else {
      products = await db.prepare(query).all()
    }

    return NextResponse.json({ success: true, products: products.results })
  } catch (error) {
    console.error("Product fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch products" }, { status: 500 })
  }
}
