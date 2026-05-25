import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// GET /api/admin/users/[id]/payments - get user's complete payment history
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    // Verify admin session
    const sessionId =
      request.cookies.get("__Secure-wz_session")?.value ??
      request.cookies.get("wz_session")?.value ??
      request.headers.get("Authorization")?.replace("Bearer ", "")
    if (!sessionId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const session = await db
      .prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
      .bind(sessionId)
      .first<{ user_id: string; expires_at: string }>()
    if (!session || new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "Invalid or expired session" }, { status: 401 })
    }

    const profile = await db
      .prepare("SELECT role FROM profiles WHERE user_id = ?")
      .bind(session.user_id)
      .first<{ role: string }>()
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    // Get user information
    const user = await db
      .prepare(`
        SELECT u.id, u.email, u.created_at, p.full_name, p.business_name, p.phone
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = ?
      `)
      .bind(id)
      .first()

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Get user's payment history
    const paymentsQuery = `
      SELECT 
        o.*,
        sp.full_name as seller_name,
        sp.business_name as seller_business,
        COUNT(oi.id) as item_count,
        GROUP_CONCAT(
          CASE 
            WHEN pr.title IS NOT NULL THEN pr.title
            WHEN prod.name IS NOT NULL THEN prod.name
            ELSE 'Unknown Item'
          END
        ) as items_summary
      FROM orders o
      LEFT JOIN profiles sp ON o.seller_id = sp.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN pre_orders pr ON oi.pre_order_id = pr.id
      LEFT JOIN products prod ON oi.product_id = prod.id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `

    interface PaymentResult {
      total: number
      payment_status: string
      created_at: string
      payment_proof_url: string | null
    }

    const payments = await db
      .prepare(paymentsQuery)
      .bind(id)
      .all<PaymentResult>()

    // Calculate statistics
    const totalSpent = payments.results.reduce((sum, p) => sum + p.total, 0)
    const totalOrders = payments.results.length
    const approvedPayments = payments.results.filter((p) => p.payment_status === 'approved').length
    const rejectedPayments = payments.results.filter((p) => p.payment_status === 'rejected').length
    const pendingPayments = payments.results.filter((p) => p.payment_status === 'pending').length

    // Check for problematic user patterns
    const recentRejections = payments.results.filter((p) => 
      p.payment_status === 'rejected' && 
      new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length

    const suspiciousPatterns = {
      highRejectionRate: (rejectedPayments / totalOrders) > 0.3,
      recentRejections: recentRejections > 2,
      noPaymentProofs: payments.results.filter((p) => !p.payment_proof_url).length > totalOrders * 0.5
    }

    return NextResponse.json({
      success: true,
      user,
      payments: payments.results,
      statistics: {
        totalSpent,
        totalOrders,
        approvedPayments,
        rejectedPayments,
        pendingPayments,
        averageOrderValue: totalOrders > 0 ? (totalSpent as number) / totalOrders : 0
      },
      suspiciousPatterns,
      recommendations: generateUserRecommendations(suspiciousPatterns, {
        totalOrders,
        rejectedPayments,
        pendingPayments
      })
    })
  } catch (error) {
    console.error("User payments GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch user payments" }, { status: 500 })
  }
}

interface SuspiciousPatterns {
  highRejectionRate: boolean
  recentRejections: boolean
  noPaymentProofs: boolean
}

interface Stats {
  totalOrders: number
  rejectedPayments: number
  pendingPayments: number
}

interface Recommendation {
  type: string
  message: string
  priority: string
}

function generateUserRecommendations(patterns: SuspiciousPatterns, stats: Stats) {
  const recommendations: Recommendation[] = []

  if (patterns.highRejectionRate) {
    recommendations.push({
      type: "warning",
      message: "High rejection rate detected. Consider reviewing payment verification process.",
      priority: "high"
    })
  }

  if (patterns.recentRejections) {
    recommendations.push({
      type: "alert",
      message: "Multiple recent payment rejections. Monitor for potential issues.",
      priority: "medium"
    })
  }

  if (patterns.noPaymentProofs) {
    recommendations.push({
      type: "info",
      message: "Many orders without payment proofs. Consider requiring proof uploads.",
      priority: "low"
    })
  }

  if (stats.pendingPayments > 5) {
    recommendations.push({
      type: "info",
      message: "Multiple pending payments. User may need assistance with payment process.",
      priority: "medium"
    })
  }

  if (stats.totalOrders === 0) {
    recommendations.push({
      type: "info",
      message: "New user with no order history.",
      priority: "low"
    })
  }

  return recommendations
}
