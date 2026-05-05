import { NextRequest, NextResponse } from "next/server"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = "edge"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string }> }
) {
  try {
    const { sku } = await params
    const body = await request.json()
    const { userId, quantity } = body

    // Get D1 database binding from Cloudflare context
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

    // Get product by SKU
    const product = await db
      .prepare("SELECT id, name FROM products WHERE sku = ?")
      .bind(sku)
      .first<{ id: string; name: string }>()

    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    // Get all available listings for this product with seller scoring
    const listings = await db
      .prepare(
        `SELECT 
          pl.id,
          pl.seller_id,
          pl.price,
          pl.quantity,
          p.full_name as seller_name,
          COALESCE(SUM(oi.quantity), 0) as total_sold,
          COUNT(DISTINCT pl.id) OVER () as total_sellers,
          pl.created_at as listing_created_at,
          p.created_at as seller_created_at
        FROM product_listings pl
        JOIN profiles p ON pl.seller_id = p.id
        LEFT JOIN order_items oi ON pl.id = oi.listing_id
        WHERE pl.product_id = ? AND pl.in_stock = 1 AND pl.quantity >= ?
        GROUP BY pl.id
        ORDER BY pl.price ASC`
      )
      .bind(product.id, quantity)
      .all()

    if (!listings.results || listings.results.length === 0) {
      return NextResponse.json({ success: false, error: "No available listings for this product" }, { status: 400 })
    }

    // Calculate seller scores to favor small sellers
    const listingsArray = listings.results as Array<{
      id: string
      seller_id: string
      price: number
      quantity: number
      seller_name: string
      total_sold: number
      total_sellers: number
      listing_created_at: string
      seller_created_at: string
    }>

    const scoredListings = listingsArray.map((listing) => {
      // Base score starts at 100
      let score = 100

      // Favor sellers with fewer total sales (weight: 2 points per sale difference from average)
      const avgSales = listingsArray.reduce((sum, l) => sum + (l.total_sold || 0), 0) / listingsArray.length
      const salesDifference = avgSales - (listing.total_sold || 0)
      score += salesDifference * 2

      // Favor sellers with smaller inventory (weight: 1 point per unit difference from average)
      const avgInventory = listingsArray.reduce((sum, l) => sum + l.quantity, 0) / listingsArray.length
      const inventoryDifference = avgInventory - listing.quantity
      score += inventoryDifference * 1

      // New seller boost: sellers with < 10 sales get +20 points
      if ((listing.total_sold || 0) < 10) {
        score += 20
      }

      // Small seller boost: sellers with < 5 total listings get +10 points
      // This requires counting their total listings - for now we use quantity as proxy
      if (listing.quantity <= 5) {
        score += 10
      }

      // SRP compliance bonus: if price is within 5% of average price, give +5 points
      const avgPrice = listingsArray.reduce((sum, l) => sum + l.price, 0) / listingsArray.length
      const priceDeviation = Math.abs(listing.price - avgPrice) / avgPrice
      if (priceDeviation <= 0.05) {
        score += 5
      }

      // Seller age bonus: newer sellers (within 30 days) get +15 points
      const sellerAge = new Date().getTime() - new Date(listing.seller_created_at).getTime()
      const daysSinceCreation = sellerAge / (1000 * 60 * 60 * 24)
      if (daysSinceCreation <= 30) {
        score += 15
      }

      return {
        ...listing,
        score,
      }
    })

    // Sort by score (highest first), then by price (lowest first for SRP compliance)
    scoredListings.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      return a.price - b.price
    })

    // Select the highest-scored listing
    const selectedListing = scoredListings[0]

    // Create order
    const orderId = crypto.randomUUID()
    const total = selectedListing.price * quantity

    await db
      .prepare(
        `INSERT INTO orders (id, user_id, status, total, created_at, updated_at)
         VALUES (?, ?, 'pending', ?, datetime('now'), datetime('now'))`
      )
      .bind(orderId, userId, total)
      .run()

    // Create order item
    const orderItemId = crypto.randomUUID()
    await db
      .prepare(
        `INSERT INTO order_items (id, order_id, product_id, listing_id, seller_id, quantity, price, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(orderItemId, orderId, product.id, selectedListing.id, selectedListing.seller_id, quantity, selectedListing.price)
      .run()

    // Update listing quantity
    const newQuantity = selectedListing.quantity - quantity
    const inStock = newQuantity > 0 ? 1 : 0

    await db
      .prepare(
        `UPDATE product_listings 
         SET quantity = ?, in_stock = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(newQuantity, inStock, selectedListing.id)
      .run()

    return NextResponse.json({
      success: true,
      orderId,
      orderItemId,
      listingId: selectedListing.id,
      sellerId: selectedListing.seller_id,
      sellerName: selectedListing.seller_name,
      price: selectedListing.price,
      total,
    })
  } catch (error) {
    console.error("Purchase error:", error)
    return NextResponse.json({ success: false, error: "Failed to process purchase" }, { status: 500 })
  }
}
