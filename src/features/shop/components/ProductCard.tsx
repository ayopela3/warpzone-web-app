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

  const decrement = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setQty((q) => Math.max(1, q - 1)) }
  const increment = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setQty((q) => Math.min(maxQty, q + 1)) }

  return (
    <div className="group bg-white rounded-2xl border border-border overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-[border-color,box-shadow] duration-150 hover:border-primary/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex flex-col">

      {/* Image panel */}
      <Link href={`/shop/${product.id}`} className="block">
        <div className="relative flex items-center justify-center bg-[#fdf6e3] overflow-hidden" style={{ height: "200px" }}>
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain p-5 transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <ShoppingBag className="h-16 w-16 text-primary/40" />
          )}

          {/* Category pill */}
          <span className="absolute top-3 left-3 rounded-full bg-primary/90 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
            {product.category}
          </span>

          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-foreground">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div>
          <Link href={`/shop/${product.id}`}>
            <h3 className="font-display font-bold text-sm leading-snug text-foreground line-clamp-2 hover:text-primary transition-colors">
              {product.name}
            </h3>
          </Link>
          {product.rarity && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{product.rarity}</p>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="font-display text-lg font-extrabold text-primary leading-none">
              {fiatSymbol}{product.price.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Qty: {product.quantity}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {/* Quantity stepper */}
          {!outOfStock && (
            <div className="flex items-center justify-between border border-border rounded-xl px-3 h-9">
              <button
                type="button"
                onClick={decrement}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm font-bold text-foreground tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={increment}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                disabled={qty >= maxQty}
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              className="flex-1 h-9 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={outOfStock}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAddToCart(product, qty)
              }}
            >
              {outOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-9 text-xs font-semibold rounded-xl"
              asChild
              disabled={outOfStock}
            >
              <Link href={`/shop/${product.id}`}>View Details</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
