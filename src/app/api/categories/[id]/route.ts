import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const body = await request.json() as {
      slug?: string; label?: string; emoji?: string | null; image_url?: string | null
      color?: string; sort_order?: number; is_active?: number
    }

    const updates: string[] = []
    const values: (string | number | null)[] = []

    if (body.slug     !== undefined) { updates.push("slug = ?");      values.push(body.slug.trim()) }
    if (body.label    !== undefined) { updates.push("label = ?");     values.push(body.label.trim()) }
    if (body.emoji    !== undefined) { updates.push("emoji = ?");     values.push(body.emoji?.trim() || null) }
    if (body.image_url !== undefined){ updates.push("image_url = ?"); values.push(body.image_url?.trim() || null) }
    if (body.color    !== undefined) { updates.push("color = ?");     values.push(body.color.trim()) }
    if (body.sort_order !== undefined){ updates.push("sort_order = ?"); values.push(body.sort_order) }
    if (body.is_active !== undefined){ updates.push("is_active = ?"); values.push(body.is_active) }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 })
    }

    updates.push("updated_at = datetime('now')")
    values.push(id)

    await db.prepare(`UPDATE categories SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/categories/[id] error:", error)
    return NextResponse.json({ success: false, error: "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    await db.prepare("DELETE FROM categories WHERE id = ?").bind(id).run()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete category" }, { status: 500 })
  }
}
