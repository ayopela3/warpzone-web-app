import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { authErrorResponse, requireAdmin, requireSeller } from "@/lib/auth"

export const runtime = "edge"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const product = await db
      .prepare(`SELECT
                  p.id,
                  p.name,
                  p.category,
                  COALESCE(pl.price, p.price) AS price,
                  COALESCE(pl.quantity, p.quantity) AS quantity,
                  p.created_by,
                  pl.id as listing_id,
                  pl.seller_id as listing_seller_id
                FROM products p 
                LEFT JOIN product_listings pl ON pl.product_id = p.id AND pl.in_stock = 1
                WHERE p.id = ?
                ORDER BY pl.price ASC
                LIMIT 1`)
      .bind(id)
      .first<{ id: string; name: string; category: string; price: number; quantity: number; created_by: string | null; listing_id: string | null; listing_seller_id: string | null }>()

    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })

    return NextResponse.json({ success: true, product })
  } catch (error) {
    console.error("Failed to fetch product:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch product" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, category, rarity, description, imageUrl, price, quantity, sku } = body

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    const user = await requireSeller(request, db)

    // Verify the product belongs to the seller (or admin can edit any product)
    const product = await db.prepare("SELECT created_by FROM products WHERE id = ?").bind(id).first()
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    const createdBy = (product as { created_by: string }).created_by
    if (user.role !== "admin" && createdBy !== user.profileId && createdBy !== user.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: (string | number)[] = []

    // Only admins can update SKU
    if (sku !== undefined && user.role === "admin") {
      updates.push("sku = ?")
      values.push(sku)
    }
    if (name !== undefined) {
      updates.push("name = ?")
      values.push(name)
    }
    if (category !== undefined) {
      updates.push("category = ?")
      values.push(category)
    }
    if (rarity !== undefined) {
      updates.push("rarity = ?")
      values.push(rarity)
    }
    if (description !== undefined) {
      updates.push("description = ?")
      values.push(description)
    }
    if (imageUrl !== undefined) {
      updates.push("image_url = ?")
      values.push(imageUrl)
    }
    if (price !== undefined) {
      updates.push("price = ?")
      values.push(price)
    }
    if (quantity !== undefined) {
      updates.push("quantity = ?")
      values.push(quantity)
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 })
    }

    updates.push("updated_at = datetime('now')")
    values.push(id)

    const query = `UPDATE products SET ${updates.join(", ")} WHERE id = ?`
    await db.prepare(query).bind(...values).run()

    return NextResponse.json({ success: true })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse

    console.error("Failed to update product:", error)
    return NextResponse.json({ success: false, error: "Failed to update product" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    await requireAdmin(request, db)

    // Check if product exists
    const product = await db.prepare("SELECT id FROM products WHERE id = ?").bind(id).first()
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    // Delete the product
    await db.prepare("DELETE FROM products WHERE id = ?").bind(id).run()

    return NextResponse.json({ success: true })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse

    console.error("Failed to delete product:", error)
    return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 })
  }
}
