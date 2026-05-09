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
        id,
        sku,
        name,
        category,
        rarity,
        description,
        image_url,
        quantity,
        price,
        approval_status,
        condition,
        created_at,
        created_by
      FROM products
      WHERE id = ? AND approval_status = 'approved' AND is_active = 1
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
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-12 lg:px-8">

        {/* ── Back link ── */}
        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shop
        </Link>

        {/* ── Main grid ── */}
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14 items-start">

          {/* Image panel */}
          <div className="rounded-2xl overflow-hidden bg-[#fdf6e3] border border-border" style={{ minHeight: "420px" }}>
            <ProductImageCarousel imageUrl={product.image_url} productName={product.name} />
          </div>

          {/* Product info */}
          <div className="flex flex-col">

            {/* Pill tags */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="inline-flex items-center rounded-full bg-primary/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
                {product.category}
              </span>
              <span className="inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                SKU: {product.sku}
              </span>
              {product.rarity && (
                <span className="inline-flex items-center rounded-full bg-primary/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
                  {product.rarity}
                </span>
              )}
              <span className="inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                Condition: {conditionLabels[product.condition] || product.condition}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground leading-tight lg:text-5xl">
              {product.name}
            </h1>

            {/* Description */}
            {product.description && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            )}

            {/* Price + CTA card */}
            <div className="mt-8 rounded-2xl border border-border bg-muted/40 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Price</p>
                  <p className="font-display text-3xl font-extrabold text-foreground leading-none">
                    {fiatSymbol}{product.price.toLocaleString()}
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                  product.quantity > 0
                    ? "bg-primary/90 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
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
                sellerId={product.created_by ?? undefined}
              />
            </div>

            {/* Info cards */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-white p-6">
                <ShieldCheck className="h-6 w-6 text-primary mb-4" />
                <h2 className="font-display font-extrabold text-lg text-foreground leading-snug">Verified condition</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Every listing is reviewed and authenticated before publishing.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white p-6">
                <Truck className="h-6 w-6 text-primary mb-4" />
                <h2 className="font-display font-extrabold text-lg text-foreground leading-snug">Pickup on our shop</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
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
