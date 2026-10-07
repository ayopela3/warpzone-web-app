import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { authErrorResponse, requireAdmin } from "@/lib/auth"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })
    }

    await requireAdmin(request, db)

    // Fetch products with pending approval status along with seller information
    const pendingProducts = await db
      .prepare(`
        SELECT 
          p.id,
          p.sku,
          p.name,
          p.category,
          p.rarity,
          p.description,
          p.image_url,
          p.approval_status,
          p.created_by,
          p.created_at,
          COALESCE(pr_profile.full_name, pr_user.full_name) as seller_name,
          COALESCE(pr_profile.business_name, pr_user.business_name) as seller_business
        FROM products p
        LEFT JOIN profiles pr_profile ON p.created_by = pr_profile.id
        LEFT JOIN profiles pr_user ON p.created_by = pr_user.user_id
        WHERE p.approval_status = 'pending'
        ORDER BY p.created_at DESC
      `)
      .all()

    return NextResponse.json({ success: true, products: pendingProducts.results })
  } catch (error) {
    const authResponse = authErrorResponse(error)
    if (authResponse) return authResponse

    console.error("Pending approvals fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch pending approvals" }, { status: 500 })
  }
}
