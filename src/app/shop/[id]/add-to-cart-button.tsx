"use client"

import { useState } from "react"
import { Minus, Plus, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/components/shared/app-provider"

type AddToCartButtonProps = {
  productId: string
  name: string
  price: number
  category: string
  inStock: boolean
  quantity: number
}

export default function AddToCartButton({ productId, name, price, category, inStock, quantity }: AddToCartButtonProps) {
  const { addToCart } = useApp()
  const [qty, setQty] = useState(1)

  return (
    <div className="space-y-3">
      {/* Quantity stepper */}
      {inStock && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Quantity</span>
          <div className="flex items-center border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="px-3 h-10 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-12 text-center text-sm font-bold text-foreground tabular-nums">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(quantity, q + 1))}
              disabled={qty >= quantity}
              className="px-3 h-10 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add to cart button */}
      <Button
        className="w-full h-12 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={!inStock}
        onClick={() => {
          addToCart({ id: productId, name, price, category }, qty)
        }}
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        {inStock ? "Add to cart" : "Out of stock"}
      </Button>
    </div>
  )
}
