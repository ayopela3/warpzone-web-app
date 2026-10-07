import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ShieldCheck, Truck } from "lucide-react"
import AddToCartButton from "./add-to-cart-button"
import ProductImageCarousel from "./product-image-carousel"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = 'edge'

type Product = {
  id: string
  name: string
  category: string
  rarity: string
  description: string
  image_url: string
  sku: string
  quantity: number
  price: number
  approval_status: string
  condition: string
  created_at: string
  created_by: string | null
  listing_id: string | null
  listing_seller_id: string | null
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Condition display mapping
  const conditionLabels: Record<string, string> = {
    "NEW": "BRAND NEW",
    "LIKE NEW": "NEAR MINT CONDITION",
    "GOOD": "LIGHTLY PLAYED",
    "FAIR": "MODERATELY PLAYED",
    "POOR": "HEAVILY PLAYED",
    "DAMAGED": "DAMAGED OR DEFECTS"
  }

  let db: CloudflareEnv["DB"] | null = null
  try {
    const { getRequestContext } = await import("@cloudflare/next-on-pages")
    const { env } = getRequestContext()
    db = (env as CloudflareEnv).DB
  } catch {
    return notFound()
  }

  if (!db) {
    return notFound()
  }

  const productResult = await db
    .prepare(`
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.category,
        p.rarity,
        p.description,
        p.image_url,
        COALESCE(pl.quantity, p.quantity) AS quantity,
        COALESCE(pl.price, p.price) AS price,
        p.approval_status,
        p.condition,
        p.created_at,
        p.created_by,
        pl.id as listing_id,
        pl.seller_id as listing_seller_id
      FROM products p
      LEFT JOIN product_listings pl ON pl.product_id = p.id AND pl.in_stock = 1
      WHERE p.id = ? AND p.approval_status = 'approved' AND p.is_active = 1
      ORDER BY pl.price ASC
      LIMIT 1
    `)
    .bind(id)
    .first()

  if (!productResult) {
    notFound()
  }

  const product = productResult as Product

  // Fetch fiat symbol from settings — gracefully degrade if table is missing
  let fiatSymbol = "$"
  try {
    const fiatResult = await db
      .prepare("SELECT value FROM settings WHERE key = 'fiat_symbol'")
      .first<{ value: string }>()
    if (fiatResult?.value) fiatSymbol = fiatResult.value
  } catch {
    // Settings table may not exist yet; fall back to "$"
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 lg:px-8">

        {/* ── Back link ── */}
        <Link
          href="/shop"
          prefetch={false}
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shop
        </Link>

        {/* ── Main grid ── */}
        <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">

          {/* Image panel */}
          <div className="overflow-hidden rounded-md border border-border bg-muted" style={{ minHeight: "420px" }}>
            <ProductImageCarousel imageUrl={product.image_url} productName={product.name} />
          </div>

          {/* Product info */}
          <div className="flex flex-col rounded-md border border-border bg-card p-5 lg:p-6">

            {/* Pill tags */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="label-meta inline-flex items-center rounded-full border border-primary bg-primary px-3 py-1 text-primary-foreground">
                {product.category}
              </span>
              <span className="label-meta inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">
                SKU: {product.sku}
              </span>
              {product.rarity && (
                <span className="label-meta inline-flex items-center rounded-full border border-primary bg-primary px-3 py-1 text-primary-foreground">
                  {product.rarity}
                </span>
              )}
              <span className="label-meta inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-muted-foreground">
                Condition: {conditionLabels[product.condition] || product.condition}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display text-4xl font-black leading-none text-foreground lg:text-5xl">
              {product.name}
            </h1>

            {/* Description */}
            {product.description && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}

            {/* Price + CTA card */}
            <div className="mt-8 space-y-4 border-t border-border pt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="label-meta mb-2 text-muted-foreground">Price</p>
                  <p className="price text-4xl text-foreground">
                    {fiatSymbol}{product.price.toLocaleString()}
                  </p>
                </div>
                <span className={`label-meta inline-flex items-center rounded-full border px-3 py-1 ${
                  product.quantity > 0
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted text-muted-foreground"
                }`}>
                  {product.quantity > 0 ? `In stock (${product.quantity})` : "Out of stock"}
                </span>
              </div>
              <AddToCartButton
                productId={product.id}
                name={product.name}
                price={product.price}
                category={product.category}
                inStock={product.quantity > 0}
                quantity={product.quantity}
                listingId={product.listing_id ?? undefined}
                sellerId={product.listing_seller_id ?? undefined}
              />
            </div>

            {/* Info cards */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-background p-4">
                <ShieldCheck className="mb-4 h-6 w-6 text-primary" />
                <h2 className="text-base font-extrabold leading-tight text-foreground">Verified condition</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Every listing is reviewed and authenticated before publishing.
                </p>
              </div>
              <div className="rounded-md border border-border bg-background p-4">
                <Truck className="mb-4 h-6 w-6 text-primary" />
                <h2 className="text-base font-extrabold leading-tight text-foreground">Pickup on our shop</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  You&apos;ll be able to conveniently pick up your items at our main shop.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
