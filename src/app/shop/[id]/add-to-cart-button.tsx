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
  listingId?: string
  sellerId?: string
}

export default function AddToCartButton({ productId, name, price, category, inStock, quantity, listingId, sellerId }: AddToCartButtonProps) {
  const { addToCart } = useApp()
  const [qty, setQty] = useState(1)

  return (
    <div className="space-y-3">
      {/* Quantity stepper */}
      {inStock && (
        <div className="flex items-center gap-3">
          <span className="label-meta text-muted-foreground">Quantity</span>
          <div className="flex items-center overflow-hidden rounded-md border border-border">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="h-10 px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-12 text-center text-sm font-bold text-foreground tabular-nums">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(quantity, q + 1))}
              disabled={qty >= quantity}
              className="h-10 px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add to cart button */}
      <Button
        className="h-12 w-full text-base font-bold"
        disabled={!inStock}
        onClick={() => {
          addToCart({ id: productId, name, price, category, listing_id: listingId, seller_id: sellerId, maxQuantity: quantity }, qty, quantity)
        }}
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        {inStock ? "Add to cart" : "Out of stock"}
      </Button>
    </div>
  )
}
