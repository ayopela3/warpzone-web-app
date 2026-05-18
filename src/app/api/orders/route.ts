import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { resolveSession } from "@/lib/auth"

export const runtime = "edge"

// ---------------------------------------------------------------------------
// POST /api/orders — create order from cart
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const session = await resolveSession(request, db)
    if (!session) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const body = await request.json() as {
      items: { product_id: string; listing_id: string; seller_id: string; quantity: number; price: number; pre_order_id?: string }[]
      seller_id: string
      total: number
      fulfillment_type: "pickup" | "shipping"
      notes?: string
      payment_proof_url?: string
    }

    const { items, seller_id, total, fulfillment_type, notes, payment_proof_url } = body

    if (!items?.length) {
      return NextResponse.json({ success: false, error: "Order must have at least one item" }, { status: 400 })
    }
    if (!seller_id) {
      return NextResponse.json({ success: false, error: "seller_id is required" }, { status: 400 })
    }

    const orderId = crypto.randomUUID()

    console.log(`[Order Create] Creating order: ${orderId}, userId: ${session.userId}, sellerId: ${seller_id}`)
    console.log(`[Order Create] Items:`, items.map(i => ({ product_id: i.product_id, listing_id: i.listing_id, seller_id: i.seller_id })))

    // Validate foreign keys exist
    const userExists = await db.prepare("SELECT 1 FROM users WHERE id = ?").bind(session.userId).first()
    const sellerExists = await db.prepare("SELECT 1 FROM profiles WHERE id = ?").bind(seller_id).first()

    console.log(`[Order Create] userExists: ${!!userExists}, sellerExists: ${!!sellerExists}`)

    if (!userExists) {
      return NextResponse.json({ success: false, error: "Invalid user_id", details: `User ${session.userId} not found in database` }, { status: 400 })
    }
    if (!sellerExists) {
      return NextResponse.json({ success: false, error: "Invalid seller_id", details: `Seller ${seller_id} not found in profiles` }, { status: 400 })
    }

    // Validate payment proof is provided
    if (!payment_proof_url) {
      return NextResponse.json({ success: false, error: "Payment proof is required" }, { status: 400 })
    }

    try {
      await db
        .prepare(
          `INSERT INTO orders (id, user_id, seller_id, status, total, fulfillment_type, notes, payment_proof_url, created_at, updated_at)
           VALUES (?, ?, ?, 'payment_submitted', ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .bind(orderId, session.userId, seller_id, total, fulfillment_type, notes ?? null, payment_proof_url)
        .run()
    } catch (e) {
      console.error(`[Order Create] Failed to insert order. userId: ${session.userId}, sellerId: ${seller_id}`)
      throw new Error(`Order insert failed: ${e instanceof Error ? e.message : String(e)}`)
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      try {
        await db
          .prepare(
            `INSERT INTO order_items (id, order_id, product_id, listing_id, seller_id, quantity, price, pre_order_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(
            crypto.randomUUID(),
            orderId,
            item.pre_order_id ? null : item.product_id,  // pre-order items have no products row
            item.pre_order_id ? null : item.listing_id,  // pre-order items have no product_listings row
            item.seller_id,
            item.quantity,
            item.price,
            item.pre_order_id ?? null
          )
          .run()

        // Deduct product quantity (only for regular products, not pre-orders)
        if (!item.pre_order_id && item.product_id) {
          // Deduct from products table
          await db
            .prepare("UPDATE products SET quantity = MAX(0, quantity - ?), updated_at = datetime('now') WHERE id = ?")
            .bind(item.quantity, item.product_id)
            .run()

          // Deduct from product_listings if listing_id provided
          if (item.listing_id) {
            await db
              .prepare("UPDATE product_listings SET quantity = MAX(0, quantity - ?), updated_at = datetime('now') WHERE id = ?")
              .bind(item.quantity, item.listing_id)
              .run()
          }
        }
      } catch (e) {
        console.error(`[Order Create] Failed to insert item ${i}:`, item)
        throw new Error(`Item ${i} insert failed: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    return NextResponse.json({ success: true, orderId })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[Order Create] Error:", errorMessage)
    return NextResponse.json({ success: false, error: "Failed to create order", details: errorMessage }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// GET /api/orders — list orders for authenticated buyer
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const userId = await resolveSession(request, db)
    if (!userId) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    // Parse pagination params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100)
    const offset = parseInt(searchParams.get("offset") ?? "0", 10)

    // Fetch paginated orders
    const ordersResult = await db
      .prepare(
        `SELECT
           o.*,
           sp.full_name  AS seller_name,
           sp.business_name AS seller_business,
           sp.payment_qr_url AS seller_payment_qr_url
         FROM orders o
         LEFT JOIN profiles sp ON o.seller_id = sp.id
         WHERE o.user_id = ?
         ORDER BY o.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(userId, limit, offset)
      .all<Record<string, unknown>>()

    const orders = ordersResult.results

    // Fetch all items for these orders in a single query (fixes N+1)
    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id as string)
      const placeholders = orderIds.map(() => "?").join(",")
      
      const itemsResult = await db
        .prepare(
          `SELECT
             oi.*,
             p.name       AS product_name,
             p.image_url  AS product_image_url,
             p.category   AS product_category,
             po.title     AS pre_order_title,
             po.image_url AS pre_order_image_url,
             po.game      AS pre_order_game
           FROM order_items oi
           LEFT JOIN products p ON oi.product_id = p.id
           LEFT JOIN pre_orders po ON oi.pre_order_id = po.id
           WHERE oi.order_id IN (${placeholders})`
        )
        .bind(...orderIds)
        .all<Record<string, unknown>>()

      // Group items by order_id
      type OrderItem = Record<string, unknown>
      const itemsByOrder = itemsResult.results.reduce<Record<string, OrderItem[]>>((acc, item) => {
        const orderId = item.order_id as string
        if (!acc[orderId]) acc[orderId] = []
        acc[orderId].push({
          ...item,
          product_name: item.pre_order_title ?? item.product_name,
          product_image_url: item.pre_order_image_url ?? item.product_image_url,
        })
        return acc
      }, {})

      // Attach items to each order
      orders.forEach((order) => {
        order.items = itemsByOrder[order.id as string] ?? []
      })
    }

    return NextResponse.json({ success: true, orders, pagination: { limit, offset } })
  } catch (error) {
    console.error("Orders fetch error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 })
  }
}
