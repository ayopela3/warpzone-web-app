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
    <div className="group bg-white rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200 flex flex-col">
      {/* Image */}
      <Link href={`/shop/${product.id}`} className="block relative">
        <div className="flex items-center justify-center bg-[#fdf6e3] overflow-hidden" style={{ height: "200px" }}>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-contain p-4 transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <ShoppingBag className="h-16 w-16 text-primary/40" />
          )}
          {/* Category pill */}
          <span className="absolute top-2 left-2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
            {product.category}
          </span>
          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-foreground">Out of Stock</span>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div>
          <Link href={`/shop/${product.id}`}>
            <h3 className="font-bold text-sm leading-snug text-foreground line-clamp-2 hover:text-primary transition-colors">
              {product.name}
            </h3>
          </Link>
          {product.rarity && (
            <p className="mt-0.5 text-xs text-muted-foreground">{product.rarity}</p>
          )}
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xl font-black text-primary">{fiatSymbol}{(product.price ?? 0).toLocaleString()}</p>
            <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${outOfStock ? "bg-muted text-muted-foreground" : "bg-green-50 text-green-700 border border-green-200"}`}>
              {outOfStock ? "Out of stock" : `In stock (${product.quantity})`}
            </span>
          </div>

          {/* Stepper */}
          {!outOfStock && (
            <div className="flex items-center justify-between border border-border rounded-xl px-3 h-9">
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
            className="w-full h-9 text-xs font-bold rounded-xl bg-primary text-black hover:bg-primary/90"
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
    <section className="bg-neutral-50 border-t border-border py-14">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Featured</p>
            <h2 className="text-2xl font-black text-foreground">Great additions to your collection</h2>
          </div>
          <Button variant="outline" asChild className="shrink-0">
            <Link href="/shop">View all →</Link>
          </Button>
        </div>

        {/* Grid */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
