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
    <div className="group bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-150 flex flex-col">

      {/* ── Image panel ── */}
      <Link href={`/shop/${product.id}`} className="block relative">
        <div className="relative flex items-center justify-center bg-neutral-100 overflow-hidden" style={{ height: "210px" }}>
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-contain p-4 transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <ShoppingBag className="h-14 w-14 text-neutral-300" />
          )}

          {/* SOLD badge (top-left) — shown when out of stock */}
          {outOfStock && (
            <span className="absolute top-2 left-2 bg-neutral-800 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">
              Sold
            </span>
          )}

          {/* Low-stock urgency badge (bottom-right) */}
          {!outOfStock && product.quantity <= 5 && (
            <span className="absolute bottom-2 right-2 bg-orange-500 text-white text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-sm">
              {product.quantity === 1 ? "Last 1" : `Only ${product.quantity} left`}
            </span>
          )}
        </div>

        {/* Stock progress bar */}
        <div className="px-0">
          <div className="h-1 w-full bg-neutral-100">
            <div
              className={`h-full transition-all ${outOfStock ? "bg-neutral-300" : "bg-primary"}`}
              style={{ width: `${outOfStock ? 100 : stockPct}%` }}
            />
          </div>
          <div className="flex justify-between px-3 pt-1.5 pb-0 text-[10px] font-semibold text-neutral-400">
            <span>{soldCount} sold</span>
            <span className={outOfStock ? "text-red-500 font-bold" : ""}>{product.quantity} left</span>
          </div>
        </div>
      </Link>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 px-3 pt-2 pb-3 gap-2.5">
        <Link href={`/shop/${product.id}`}>
          <h3 className="font-bold text-sm leading-snug text-neutral-900 line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <p className="text-xl font-black text-neutral-900 leading-none">
          {fiatSymbol}{(product.price ?? 0).toLocaleString()}
        </p>

        {/* ── Actions ── */}
        <div className="mt-auto flex flex-col gap-2">
          {/* Quantity stepper — only when in stock */}
          {!outOfStock && (
            <div className="flex items-center border border-neutral-300 rounded-md overflow-hidden h-9">
              <button
                type="button"
                onClick={decrement}
                disabled={qty <= 1}
                className="w-10 h-full flex items-center justify-center text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 transition-colors border-r border-neutral-300"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="flex-1 text-center text-sm font-bold text-neutral-900 tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={increment}
                disabled={qty >= maxQty}
                className="w-10 h-full flex items-center justify-center text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 transition-colors border-l border-neutral-300"
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
              className="w-full h-10 text-sm font-bold rounded-md border-neutral-300 text-neutral-500 cursor-not-allowed"
              disabled
            >
              Sold Out
            </Button>
          ) : (
            <Button
              className="w-full h-10 text-sm font-bold rounded-md bg-neutral-900 text-white hover:bg-neutral-700"
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
