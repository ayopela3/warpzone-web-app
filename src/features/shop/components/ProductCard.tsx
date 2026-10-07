"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Minus, Plus, ShoppingBag } from "lucide-react"
import type { Product } from "@/types"

type Props = {
  product: Product
  fiatSymbol: string
  onAddToCart: (product: Product, qty: number) => void
}

export function ProductCard({ product, fiatSymbol, onAddToCart }: Props) {
  const outOfStock = product.quantity === 0
  const [qty, setQty] = useState(1)
  const maxQty = product.quantity

  /** Estimate sold count for the progress bar (placeholder: shown as 0 when not available) */
  const soldCount = 0
  const totalStock = soldCount + product.quantity
  const stockPct   = totalStock > 0 ? Math.round((product.quantity / totalStock) * 100) : 0

  const decrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setQty((q) => Math.max(1, q - 1))
  }
  const increment = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setQty((q) => Math.min(maxQty, q + 1))
  }

  return (
    <div className="card-interactive group flex flex-col overflow-hidden rounded-md border border-border bg-card">

      {/* ── Image panel ── */}
      <Link href={`/shop/${product.id}`} prefetch={false} className="block relative">
        <div className="relative flex items-center justify-center overflow-hidden bg-muted" style={{ height: "210px" }}>
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain p-4 transition-transform duration-200 group-hover:scale-[1.03]"
            />
          ) : (
            <ShoppingBag className="h-14 w-14 text-muted-foreground/45" />
          )}

          {/* SOLD badge (top-left) — shown when out of stock */}
          {outOfStock && (
            <span className="label-meta absolute left-2 top-2 rounded-full border border-foreground bg-foreground px-2 py-1 text-background">
              Sold
            </span>
          )}

          {/* Low-stock urgency badge (bottom-right) */}
          {!outOfStock && product.quantity <= 5 && (
            <span className="label-meta absolute bottom-2 right-2 rounded-full border border-primary bg-primary px-2 py-1 text-primary-foreground">
              {product.quantity === 1 ? "Last 1" : `Only ${product.quantity} left`}
            </span>
          )}
        </div>

        {/* Stock progress bar */}
        <div className="px-0">
          <div className="h-1 w-full bg-muted">
            <div
              className={`h-full transition-all ${outOfStock ? "bg-border" : "bg-primary"}`}
              style={{ width: `${outOfStock ? 100 : stockPct}%` }}
            />
          </div>
          <div className="label-meta flex justify-between px-3 pb-0 pt-1.5 text-muted-foreground">
            <span> </span>
            <span className={outOfStock ? "text-destructive" : ""}>{product.quantity} left</span>
          </div>
        </div>
      </Link>

      {/* ── Content ── */}
      <div className="flex flex-1 flex-col gap-3 border-t border-border px-3 pb-3 pt-3">
        <Link href={`/shop/${product.id}`} prefetch={false}>
          <h3 className="line-clamp-2 text-sm font-extrabold leading-tight text-foreground transition-colors hover:underline">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <p className="price text-foreground">
          {fiatSymbol}{(product.price ?? 0).toLocaleString()}
        </p>

        {/* ── Actions ── */}
        <div className="mt-auto flex flex-col gap-2">
          {/* Quantity stepper — only when in stock */}
          {!outOfStock && (
            <div className="flex h-9 items-center overflow-hidden rounded-md border border-border">
              <button
                type="button"
                onClick={decrement}
                disabled={qty <= 1}
                className="flex h-full w-10 items-center justify-center border-r border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="flex-1 text-center text-sm font-bold tabular-nums text-foreground">{qty}</span>
              <button
                type="button"
                onClick={increment}
                disabled={qty >= maxQty}
                className="flex h-full w-10 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Add to Cart / Sold Out */}
          {outOfStock ? (
            <Button
              variant="outline"
              className="h-10 w-full cursor-not-allowed text-sm font-bold text-muted-foreground"
              disabled
            >
              Sold Out
            </Button>
          ) : (
            <Button
              className="h-10 w-full bg-foreground text-sm font-bold text-background hover:bg-foreground/85"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAddToCart(product, qty)
              }}
            >
              Add to Cart
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
