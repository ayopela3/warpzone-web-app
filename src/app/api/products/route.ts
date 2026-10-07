import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { authErrorResponse, requireSeller, resolveUser } from "@/lib/auth"

export const runtime = "edge"

const VALID_APPROVAL_STATUSES = new Set(["pending", "approved", "rejected"])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sku, name, category, setName, rarity, condition, description, imageUrl, sellerId, price, quantity } = body

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const user = await requireSeller(request, db)
    const createdBy = user.role === "admin" && sellerId ? sellerId : user.profileId

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
      .bind(productId, sku, name, category, setName, rarity, condition || 'NEW', description, imageUrl, createdBy, price || 0, quantity || 1)
      .run()

    return NextResponse.json({ success: true, productId })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse

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
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100)
    const offset = parseInt(searchParams.get("offset") ?? "0", 10)

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const requestedPrivilegedView = showAll || approvalStatus !== null
    const user = sellerId || requestedPrivilegedView ? await resolveUser(request, db) : null
    const isAdmin = user?.role === "admin"
    const isSeller = user?.role === "seller" || isAdmin

    if (approvalStatus && !VALID_APPROVAL_STATUSES.has(approvalStatus)) {
      return NextResponse.json({ success: false, error: "Invalid approval status" }, { status: 400 })
    }

    if (sku) {
      // Get product by SKU
      const product = await db
        .prepare("SELECT * FROM products WHERE sku = ? AND approval_status = 'approved' AND is_active = 1")
        .bind(sku)
        .first()

      if (!product) {
        return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true, product })
    }

    // Build query based on filters
    let query = `SELECT
                   p.id,
                   p.sku,
                   p.name,
                   p.category,
                   p.set_name,
                   p.rarity,
                   p.description,
                   p.image_url,
                   p.condition,
                   p.approval_status,
                   p.created_by,
                   COALESCE(pl.price, p.price) AS price,
                   COALESCE(pl.quantity, p.quantity) AS quantity,
                   p.featured,
                   p.is_active,
                   p.created_at,
                   p.updated_at,
                   COALESCE(pr_profile.full_name, pr_user.full_name) as seller_name,
                   pl.id as listing_id,
                   pl.seller_id as listing_seller_id
                 FROM products p
                 LEFT JOIN profiles pr_profile ON p.created_by = pr_profile.id
                 LEFT JOIN profiles pr_user ON p.created_by = pr_user.user_id
                 LEFT JOIN product_listings pl
                   ON pl.id = (
                     SELECT pli.id
                     FROM product_listings pli
                     WHERE pli.product_id = p.id
                       AND pli.in_stock = 1
                       AND pli.quantity > 0
                     ORDER BY pli.price ASC, pli.created_at ASC
                     LIMIT 1
                   )`
    const conditions: string[] = []
    const params: (string | number)[] = []
    let isOwnSellerListing = false

    if (sellerId) {
      if (isAdmin) {
        const sellerProfile = await db
          .prepare("SELECT id, user_id FROM profiles WHERE id = ? OR user_id = ?")
          .bind(sellerId, sellerId)
          .first<{ id: string; user_id: string }>()

        if (sellerProfile) {
          conditions.push("p.created_by IN (?, ?)")
          params.push(sellerProfile.id, sellerProfile.user_id)
        } else {
          conditions.push("p.created_by = ?")
          params.push(sellerId)
        }
      } else if (isSeller && user && (sellerId === user.profileId || sellerId === user.userId)) {
        isOwnSellerListing = true
        conditions.push("p.created_by IN (?, ?)")
        params.push(user.profileId, user.userId)
      } else if (requestedPrivilegedView) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
      } else {
        conditions.push("p.created_by = ?")
        params.push(sellerId)
      }
    } else if (requestedPrivilegedView && isSeller && !isAdmin && user) {
      isOwnSellerListing = true
      conditions.push("p.created_by IN (?, ?)")
      params.push(user.profileId, user.userId)
    }

    if (search) {
      conditions.push("(p.name LIKE ? OR p.sku LIKE ? OR p.category LIKE ?)")
      const like = `%${search}%`
      params.push(like, like, like)
    }

    if (approvalStatus && (isAdmin || isOwnSellerListing)) {
      conditions.push("p.approval_status = ?")
      params.push(approvalStatus)
    } else if (requestedPrivilegedView && !isAdmin && !isOwnSellerListing) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    } else if (!isAdmin && !isOwnSellerListing) {
      // Public product lists only expose approved and active products.
      conditions.push("p.approval_status = 'approved'")
      conditions.push("p.is_active = 1")
      // If a product uses listing rows, public catalog responses must include
      // a concrete in-stock listing. Legacy direct products with no listings use
      // the products table stock instead.
      conditions.push(`(
        pl.id IS NOT NULL
        OR (
          p.quantity > 0
          AND NOT EXISTS (
            SELECT 1
            FROM product_listings pl_any
            WHERE pl_any.product_id = p.id
          )
        )
      )`)
    } else if (isAdmin && !showAll && !approvalStatus) {
      conditions.push("p.approval_status = 'approved'")
      conditions.push("p.is_active = 1")
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ")
    }

    query += ` ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`

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
