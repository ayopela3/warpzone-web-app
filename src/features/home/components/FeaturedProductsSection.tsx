"use client"

import { useState } from "react"
import Link from "next/link"
import { Minus, Plus, ShoppingBag, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Product } from "@/types"

type Props = {
  products: Product[]
  isSeller: boolean
  fiatSymbol: string
  onAddToCart: (product: Product, qty: number) => void
}

function ProductTile({
  product,
  fiatSymbol,
  onAddToCart,
}: {
  product: Product
  fiatSymbol: string
  onAddToCart: (product: Product, qty: number) => void
}) {
  const outOfStock = product.quantity === 0
  const [qty, setQty] = useState(1)

  return (
    <div className="card-interactive group flex flex-col overflow-hidden rounded-md border border-border bg-card">
      {/* Image */}
      <Link href={`/shop/${product.id}`} prefetch={false} className="block relative">
        <div className="flex items-center justify-center overflow-hidden bg-muted" style={{ height: "200px" }}>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-contain p-4 transition-transform duration-200 group-hover:scale-[1.03]"
            />
          ) : (
            <ShoppingBag className="h-16 w-16 text-muted-foreground/45" />
          )}
          {/* Category pill */}
          <span className="label-meta absolute left-2 top-2 rounded-full border border-primary bg-primary px-2.5 py-1 text-primary-foreground">
            {product.category}
          </span>
          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/40">
              <span className="label-meta rounded-full bg-card px-3 py-1 text-foreground">Out of Stock</span>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-3 border-t border-border p-4">
        <div>
          <Link href={`/shop/${product.id}`} prefetch={false}>
            <h3 className="line-clamp-2 text-sm font-extrabold leading-tight text-foreground transition-colors hover:underline">
              {product.name}
            </h3>
          </Link>
          {product.rarity && (
            <p className="label-meta mt-1 text-muted-foreground">{product.rarity}</p>
          )}
        </div>

        <div className="mt-auto space-y-1.5">
          <p className="price text-foreground">
            {fiatSymbol}{(product.price ?? 0).toLocaleString()}
          </p>
          <span
            className="label-meta block w-fit rounded-full border px-2 py-1"
            style={outOfStock
              ? { background: "var(--muted)", color: "var(--muted-foreground)", borderColor: "var(--border)" }
              : { background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" }
            }
          >
            {outOfStock ? "Out of stock" : `In stock (${product.quantity})`}
          </span>

          {/* Stepper */}
          {!outOfStock && (
            <div className="flex h-9 items-center justify-between rounded-md border border-border px-3">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Decrease"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm font-bold tabular-nums">{qty}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                onClick={() => setQty((q) => Math.min(product.quantity, q + 1))}
                disabled={qty >= product.quantity}
                aria-label="Increase"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <Button
            className="h-9 w-full text-xs font-bold"
            disabled={outOfStock}
            onClick={() => onAddToCart(product, qty)}
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
            {outOfStock ? "Out of Stock" : "Add to Cart"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function FeaturedProductsSection({ products, isSeller, fiatSymbol, onAddToCart }: Props) {
  if (isSeller || products.length === 0) return null

  return (
    <section className="section-rule bg-background py-14">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="label-meta mb-2 text-foreground">Featured</p>
            <h2 className="text-2xl font-black text-foreground">Great additions to your collection</h2>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="/shop" prefetch={false}>View all →</Link>
          </Button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => (
            <ProductTile
              key={product.id}
              product={product}
              fiatSymbol={fiatSymbol}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
