import { NextRequest, NextResponse } from "next/server"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = "edge"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, category, rarity, description, imageUrl, price, quantity, sellerId, sku, userRole } = body

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

    // Verify the product belongs to the seller (or admin can edit any product)
    const product = await db.prepare("SELECT created_by FROM products WHERE id = ?").bind(id).first()
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    const createdBy = (product as { created_by: string }).created_by
    if (userRole !== "admin" && createdBy !== sellerId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: (string | number)[] = []

    // Only admins can update SKU
    if (sku !== undefined && userRole === "admin") {
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
    const { searchParams } = new URL(request.url)
    const userRole = searchParams.get("userRole")

    if (userRole !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized. Admin only." }, { status: 403 })
    }

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

    // Check if product exists
    const product = await db.prepare("SELECT id FROM products WHERE id = ?").bind(id).first()
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    // Delete the product
    await db.prepare("DELETE FROM products WHERE id = ?").bind(id).run()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete product:", error)
    return NextResponse.json({ success: false, error: "Failed to delete product" }, { status: 500 })
  }
}
