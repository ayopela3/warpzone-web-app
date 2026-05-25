import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// GET /api/admin/payments/export/pdf - export payments to PDF
// Query params: status, user_id, seller_id, date_from, date_to
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const userId = searchParams.get("user_id")
    const sellerId = searchParams.get("seller_id")
    const dateFrom = searchParams.get("date_from")
    const dateTo = searchParams.get("date_to")

    // Build query
    let whereClause = "WHERE 1=1"
    const params: string[] = []

    if (status) {
      whereClause += " AND o.payment_status = ?"
      params.push(status)
    }
    if (userId) {
      whereClause += " AND o.user_id = ?"
      params.push(userId)
    }
    if (sellerId) {
      whereClause += " AND o.seller_id = ?"
      params.push(sellerId)
    }
    if (dateFrom) {
      whereClause += " AND o.created_at >= ?"
      params.push(dateFrom)
    }
    if (dateTo) {
      whereClause += " AND o.created_at <= ?"
      params.push(dateTo)
    }

    // Get all payments for export
    const paymentsQuery = `
      SELECT 
        o.id,
        o.total,
        o.payment_status,
        o.payment_method,
        o.created_at,
        o.payment_approved_at,
        o.payment_rejected_at,
        o.admin_notes,
        o.rejection_reason,
        u.email as user_email,
        up.full_name as user_name,
        sp.full_name as seller_name,
        sp.business_name as seller_business,
        COUNT(oi.id) as item_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN profiles up ON o.user_id = up.user_id
      LEFT JOIN profiles sp ON o.seller_id = sp.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `

    const payments = await db
      .prepare(paymentsQuery)
      .bind(...params)
      .all()

    // Generate PDF content (simplified HTML to PDF conversion)
    const pdfContent = generatePDFContent(payments.results as Payment[], {
      status,
      userId,
      sellerId,
      dateFrom,
      dateTo,
    })

    return new NextResponse(pdfContent, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="payments-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error("PDF export error:", error)
    return NextResponse.json({ success: false, error: "Failed to export PDF" }, { status: 500 })
  }
}

interface Payment {
  id: string
  total: number
  payment_status: string
  payment_method: string
  created_at: string
  payment_approved_at: string | null
  payment_rejected_at: string | null
  admin_notes: string | null
  rejection_reason: string | null
  user_email: string
  user_name: string | null
  seller_name: string | null
  seller_business: string | null
  item_count: number
}

interface Filters {
  status: string | null
  userId: string | null
  sellerId: string | null
  dateFrom: string | null
  dateTo: string | null
}

function generatePDFContent(payments: Payment[], filters: Filters) {
  const totalAmount = payments.reduce((sum, p) => sum + p.total, 0)
  const approvedCount = payments.filter(p => p.payment_status === 'approved').length
  const rejectedCount = payments.filter(p => p.payment_status === 'rejected').length
  const pendingCount = payments.filter(p => p.payment_status === 'pending').length

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .filters { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
    .summary { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .summary-item { background: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; flex: 1; margin: 0 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .status-approved { color: #22c55e; font-weight: bold; }
    .status-rejected { color: #ef4444; font-weight: bold; }
    .status-pending { color: #f59e0b; font-weight: bold; }
    .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Payment Management Report</h1>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>

  <div class="filters">
    <h3>Filters Applied:</h3>
    <p><strong>Status:</strong> ${filters.status || 'All'}</p>
    <p><strong>User ID:</strong> ${filters.userId || 'All'}</p>
    <p><strong>Seller ID:</strong> ${filters.sellerId || 'All'}</p>
    <p><strong>Date Range:</strong> ${filters.dateFrom || 'All'} to ${filters.dateTo || 'All'}</p>
  </div>

  <div class="summary">
    <div class="summary-item">
      <h3>Total Payments</h3>
      <p style="font-size: 24px; font-weight: bold;">${payments.length}</p>
    </div>
    <div class="summary-item">
      <h3>Total Amount</h3>
      <p style="font-size: 24px; font-weight: bold;">₱${totalAmount.toLocaleString()}</p>
    </div>
    <div class="summary-item">
      <h3>Approved</h3>
      <p style="font-size: 24px; font-weight: bold; color: #22c55e;">${approvedCount}</p>
    </div>
    <div class="summary-item">
      <h3>Rejected</h3>
      <p style="font-size: 24px; font-weight: bold; color: #ef4444;">${rejectedCount}</p>
    </div>
    <div class="summary-item">
      <h3>Pending</h3>
      <p style="font-size: 24px; font-weight: bold; color: #f59e0b;">${pendingCount}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Order ID</th>
        <th>Date</th>
        <th>Customer</th>
        <th>Seller</th>
        <th>Items</th>
        <th>Amount</th>
        <th>Method</th>
        <th>Status</th>
        <th>Approved/Rejected</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${payments.map(payment => `
        <tr>
          <td>${payment.id.slice(0, 12)}...</td>
          <td>${new Date(payment.created_at).toLocaleDateString()}</td>
          <td>${payment.user_name || payment.user_email}</td>
          <td>${payment.seller_business || payment.seller_name}</td>
          <td>${payment.item_count}</td>
          <td>₱${payment.total.toLocaleString()}</td>
          <td>${payment.payment_method}</td>
          <td class="status-${payment.payment_status}">${payment.payment_status.toUpperCase()}</td>
          <td>${payment.payment_approved_at ? new Date(payment.payment_approved_at).toLocaleDateString() : 
                   payment.payment_rejected_at ? new Date(payment.payment_rejected_at).toLocaleDateString() : '-'}</td>
          <td>${payment.admin_notes || payment.rejection_reason || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>This report was generated by Warpzone Admin Portal</p>
    <p>Page 1 of 1</p>
  </div>
</body>
</html>
  `

  // In a real implementation, you would use a PDF library like Puppeteer or jsPDF
  // For now, we'll return the HTML content
  return html
}
