import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { resolveSession } from "@/lib/auth"

export const runtime = "edge"

type OrderInputItem = {
  product_id?: string | null
  listing_id?: string | null
  seller_id?: string | null
  quantity: number
  price?: number
  pre_order_id?: string | null
}

type ValidatedOrderItem = {
  productId: string | null
  listingId: string | null
  sellerId: string
  quantity: number
  price: number
  preOrderId: string | null
}

type DecrementedStockItem = {
  productId: string
  listingId: string | null
  quantity: number
}

class OrderValidationError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

// ---------------------------------------------------------------------------
// POST /api/orders — create order from cart
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let orderId: string | null = null
  const decrementedStockItems: DecrementedStockItem[] = []
  let db: NonNullable<Awaited<ReturnType<typeof getDb>>> | null = null
  let needsCleanup = false

  const cleanupPartialOrder = async () => {
    if (!db || (!orderId && decrementedStockItems.length === 0)) return

    for (const item of decrementedStockItems.slice().reverse()) {
      await db
        .prepare("UPDATE products SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?")
        .bind(item.quantity, item.productId)
        .run()

      if (item.listingId) {
        await db
          .prepare("UPDATE product_listings SET quantity = quantity + ?, in_stock = 1, updated_at = datetime('now') WHERE id = ?")
          .bind(item.quantity, item.listingId)
          .run()
      }
    }

    decrementedStockItems.length = 0

    if (orderId) {
      await db.prepare("DELETE FROM order_items WHERE order_id = ?").bind(orderId).run()
      await db.prepare("DELETE FROM orders WHERE id = ?").bind(orderId).run()
      orderId = null
    }
  }

  try {
    db = await getDb()
    if (!db) return NextResponse.json({ success: false, error: "Database not available" }, { status: 503 })

    const session = await resolveSession(request, db)
    if (!session) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

    const body = await request.json() as {
      items: OrderInputItem[]
      seller_id?: string
      total?: number
      fulfillment_type: "pickup" | "shipping"
      notes?: string
      payment_proof_url?: string
    }

    const { items, fulfillment_type, notes, payment_proof_url } = body

    if (!items?.length) {
      return NextResponse.json({ success: false, error: "Order must have at least one item" }, { status: 400 })
    }

    // Validate buyer exists
    const userExists = await db.prepare("SELECT 1 FROM users WHERE id = ?").bind(session.userId).first()

    if (!userExists) {
      return NextResponse.json({ success: false, error: "Invalid user_id", details: `User ${session.userId} not found in database` }, { status: 400 })
    }

    // Validate payment proof is provided
    if (!payment_proof_url) {
      return NextResponse.json({ success: false, error: "Payment proof is required" }, { status: 400 })
    }

    const validatedItems: ValidatedOrderItem[] = []
    let sellerId: string | null = null
    let computedTotal = 0

    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new OrderValidationError("Invalid item quantity")
      }

      if (item.pre_order_id) {
        const preOrder = await db
          .prepare(
            `SELECT
               po.id,
               po.seller_id,
               po.price,
               po.status,
               po.approval_status,
               po.cutoff_date,
               por.quantity AS reserved_quantity,
               por.unit_price AS reserved_unit_price,
               COALESCE(po.seller_id, admin_profile.id) AS resolved_seller_id
             FROM pre_orders po
             LEFT JOIN profiles admin_profile ON admin_profile.role = 'admin'
             JOIN pre_order_reservations por
               ON por.pre_order_id = po.id
              AND por.user_id = ?
             WHERE po.id = ?
             LIMIT 1`
          )
          .bind(session.userId, item.pre_order_id)
          .first<{
            id: string
            seller_id: string | null
            price: number
            status: string
            approval_status: string
            cutoff_date: string | null
            reserved_quantity: number
            reserved_unit_price: number | null
            resolved_seller_id: string | null
          }>()

        if (!preOrder?.resolved_seller_id) {
          throw new OrderValidationError("Invalid pre-order item")
        }

        if (preOrder.approval_status !== "approved" || preOrder.status !== "active") {
          throw new OrderValidationError("Invalid pre-order item")
        }

        if (preOrder.cutoff_date && new Date(preOrder.cutoff_date) < new Date()) {
          throw new OrderValidationError("Pre-order cutoff has passed", 409)
        }

        if (preOrder.reserved_quantity < item.quantity) {
          throw new OrderValidationError("Insufficient reserved pre-order quantity", 409)
        }

        const price = Number(preOrder.reserved_unit_price && preOrder.reserved_unit_price > 0 ? preOrder.reserved_unit_price : preOrder.price)
        const resolvedItem: ValidatedOrderItem = {
          productId: null,
          listingId: null,
          sellerId: preOrder.resolved_seller_id,
          quantity: item.quantity,
          price,
          preOrderId: preOrder.id,
        }

        validatedItems.push(resolvedItem)
        sellerId ??= resolvedItem.sellerId
        if (sellerId !== resolvedItem.sellerId) {
          throw new OrderValidationError("Order contains items from multiple sellers")
        }
        computedTotal += price * item.quantity
        continue
      }

      if (!item.product_id) {
        throw new OrderValidationError("Invalid product item")
      }

      const listingQuery = `SELECT
           pl.id,
           pl.product_id,
           pl.seller_id,
           pl.price,
           pl.quantity AS listing_quantity,
           p.quantity AS product_quantity
         FROM product_listings pl
         JOIN products p ON p.id = pl.product_id
         WHERE ${item.listing_id ? "pl.id = ? AND" : ""}
           pl.product_id = ?
           ${item.listing_id ? "" : "AND pl.seller_id = ?"}
           AND pl.in_stock = 1
           AND p.is_active = 1
           AND p.approval_status = 'approved'`

      const listingParams = item.listing_id
        ? [item.listing_id, item.product_id]
        : [item.product_id, item.seller_id ?? ""]

      const listingResults = await db
        .prepare(listingQuery)
        .bind(...listingParams)
        .all<{
          id: string
          product_id: string
          seller_id: string
          price: number
          listing_quantity: number
          product_quantity: number
        }>()

      if (!item.listing_id && listingResults.results.length > 1) {
        throw new OrderValidationError("Ambiguous product listing")
      }

      const listing = listingResults.results[0]
      let resolvedItem: ValidatedOrderItem

      if (listing) {
        if (item.seller_id && item.seller_id !== listing.seller_id) {
          throw new OrderValidationError("Item seller mismatch")
        }

        if (listing.listing_quantity < item.quantity || listing.product_quantity < item.quantity) {
          throw new OrderValidationError("Insufficient stock", 409)
        }

        resolvedItem = {
          productId: listing.product_id,
          listingId: listing.id,
          sellerId: listing.seller_id,
          quantity: item.quantity,
          price: Number(listing.price),
          preOrderId: null,
        }
      } else {
        const directProduct = await db
          .prepare(
            `SELECT
               p.id,
               p.price,
               p.quantity,
               COALESCE(pr_profile.id, pr_user.id) AS seller_id
             FROM products p
             LEFT JOIN profiles pr_profile ON p.created_by = pr_profile.id
             LEFT JOIN profiles pr_user ON p.created_by = pr_user.user_id
             WHERE p.id = ?
               AND p.is_active = 1
               AND p.approval_status = 'approved'
             LIMIT 1`
          )
          .bind(item.product_id)
          .first<{ id: string; price: number; quantity: number; seller_id: string | null }>()

        if (!directProduct?.seller_id) {
          throw new OrderValidationError("Invalid product item")
        }

        if (item.seller_id && item.seller_id !== directProduct.seller_id) {
          throw new OrderValidationError("Item seller mismatch")
        }

        if (directProduct.quantity < item.quantity) {
          throw new OrderValidationError("Insufficient stock", 409)
        }

        resolvedItem = {
          productId: directProduct.id,
          listingId: null,
          sellerId: directProduct.seller_id,
          quantity: item.quantity,
          price: Number(directProduct.price),
          preOrderId: null,
        }
      }

      validatedItems.push(resolvedItem)
      sellerId ??= resolvedItem.sellerId
      if (sellerId !== resolvedItem.sellerId) {
        throw new OrderValidationError("Order contains items from multiple sellers")
      }
      computedTotal += resolvedItem.price * item.quantity
    }

    if (!sellerId) {
      return NextResponse.json({ success: false, error: "Invalid seller_id" }, { status: 400 })
    }

    if (body.seller_id && body.seller_id !== sellerId) {
      throw new OrderValidationError("Order seller mismatch")
    }

    if (body.total !== undefined && Math.abs(Number(body.total) - computedTotal) > 0.01) {
      throw new OrderValidationError("Order total mismatch")
    }

    const sellerExists = await db.prepare("SELECT 1 FROM profiles WHERE id = ?").bind(sellerId).first()
    if (!sellerExists) {
      return NextResponse.json({ success: false, error: "Invalid seller_id", details: `Seller ${sellerId} not found in profiles` }, { status: 400 })
    }

    orderId = crypto.randomUUID()
    needsCleanup = true

    console.log(`[Order Create] Creating order: ${orderId}, userId: ${session.userId}, sellerId: ${sellerId}`)
    console.log(`[Order Create] Items:`, validatedItems.map(i => ({ product_id: i.productId, listing_id: i.listingId, seller_id: i.sellerId })))

    try {
      await db
        .prepare(
          `INSERT INTO orders (id, user_id, seller_id, status, total, fulfillment_type, notes, payment_proof_url, created_at, updated_at)
           VALUES (?, ?, ?, 'payment_submitted', ?, ?, ?, ?, datetime('now'), datetime('now'))`
        )
        .bind(orderId, session.userId, sellerId, computedTotal, fulfillment_type, notes ?? null, payment_proof_url)
        .run()
    } catch (e) {
      console.error(`[Order Create] Failed to insert order. userId: ${session.userId}, sellerId: ${sellerId}`)
      throw new Error(`Order insert failed: ${e instanceof Error ? e.message : String(e)}`)
    }

    for (let i = 0; i < validatedItems.length; i++) {
      const item = validatedItems[i]
      try {
        await db
          .prepare(
            `INSERT INTO order_items (id, order_id, product_id, listing_id, seller_id, quantity, price, pre_order_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(
            crypto.randomUUID(),
            orderId,
            item.productId,
            item.listingId,
            item.sellerId,
            item.quantity,
            item.price,
            item.preOrderId
          )
          .run()

        // Deduct product quantity (only for regular products, not pre-orders)
        if (!item.preOrderId && item.productId) {
          // Deduct from products table
          const productUpdate = await db
            .prepare("UPDATE products SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ? AND quantity >= ?")
            .bind(item.quantity, item.productId, item.quantity)
            .run()

          if (productUpdate.meta.changes !== 1) {
            throw new OrderValidationError("Insufficient stock", 409)
          }

          if (item.listingId) {
            const listingUpdate = await db
              .prepare("UPDATE product_listings SET quantity = quantity - ?, in_stock = CASE WHEN quantity - ? > 0 THEN 1 ELSE 0 END, updated_at = datetime('now') WHERE id = ? AND quantity >= ?")
              .bind(item.quantity, item.quantity, item.listingId, item.quantity)
              .run()

            if (listingUpdate.meta.changes !== 1) {
              await db
                .prepare("UPDATE products SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?")
                .bind(item.quantity, item.productId)
                .run()
              throw new OrderValidationError("Insufficient stock", 409)
            }
          }

          decrementedStockItems.push({
            productId: item.productId,
            listingId: item.listingId,
            quantity: item.quantity,
          })
        }
      } catch (e) {
        console.error(`[Order Create] Failed to insert item ${i}:`, item)
        if (e instanceof OrderValidationError) throw e
        throw new Error(`Item ${i} insert failed: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    needsCleanup = false
    return NextResponse.json({ success: true, orderId })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[Order Create] Error:", errorMessage)
    if (needsCleanup || orderId || decrementedStockItems.length > 0) {
      try {
        await cleanupPartialOrder()
      } catch (cleanupError) {
        console.error("[Order Create] Cleanup failed:", cleanupError)
      }
    }
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
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

    const session = await resolveSession(request, db)
    if (!session) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })

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
      .bind(session.userId, limit, offset)
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
