"use client"

import { useState } from "react"
import { Minus, Plus, ShoppingCart, CheckCircle2, LockKeyhole } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useApp } from "@/components/shared/app-provider"
import { preOrdersApi } from "@/lib/api-client"
import { toast } from "sonner"

interface ReserveButtonProps {
  preOrderId: string
  title: string
  price: number
  game: string
  sellerId: string | null
  maxSlots: number | null
  reservationCount: number
  isClosed: boolean
}

/**
 * Client-side reserve / add-to-cart button for the pre-order detail page.
 * Mirrors the AddToCartButton UX from the product detail page but handles
 * the pre-order reservation flow (DB reservation → cart update).
 */
export default function ReserveButton({
  preOrderId,
  title,
  price,
  game,
  sellerId,
  maxSlots,
  reservationCount,
  isClosed,
}: ReserveButtonProps) {
  const { requireAuth, isAuthenticated, addToCart, cartItems } = useApp()
  const [qty, setQty] = useState(1)
  const [reserving, setReserving] = useState(false)

  const isFull = maxSlots !== null && reservationCount >= maxSlots
  const slotsLeft = maxSlots !== null ? maxSlots - reservationCount : null
  const isInCart = cartItems.some((c) => c.id === preOrderId)
  const disabled = isClosed || isFull || isInCart

  const handleReserve = async () => {
    if (!requireAuth()) return
    setReserving(true)

    try {
      const result = await preOrdersApi.reserve(preOrderId, qty)
      if (!result.success) {
        toast.error(result.error ?? "Failed to reserve slot")
        return
      }
    } catch {
      toast.error("Failed to reserve pre-order slot")
      return
    } finally {
      setReserving(false)
    }

    addToCart(
      {
        id: preOrderId,
        name: title,
        price,
        category: game,
        itemType: "pre_order",
        preOrderId,
        seller_id: sellerId ?? undefined,
      },
      qty,
      maxSlots ?? undefined,
    )

    toast.success(`${title} ×${qty} added to cart`)
  }

  /** Determine max qty the user can select */
  const maxQty = slotsLeft !== null ? Math.max(1, slotsLeft) : 99

  return (
    <div className="space-y-3">
      {/* Quantity stepper — only show when reservable */}
      {!disabled && (
        <div className="flex items-center gap-3">
          <span className="label-meta text-muted-foreground">
            Quantity
          </span>
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
            <span className="w-12 text-center text-sm font-bold text-foreground tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              className="h-10 px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* CTA button */}
      {isInCart ? (
        <Button
          className="h-12 w-full text-base font-bold"
          disabled
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Added to cart
        </Button>
      ) : isClosed || isFull ? (
        <Button
          className="h-12 w-full text-base font-bold"
          variant="outline"
          disabled
        >
          <LockKeyhole className="h-4 w-4 mr-2" />
          {isFull ? "Fully Reserved" : "Closed"}
        </Button>
      ) : (
        <Button
          className="h-12 w-full text-base font-bold"
          onClick={handleReserve}
          disabled={reserving || !isAuthenticated}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {reserving
            ? "Reserving…"
            : isAuthenticated
              ? "Add to Cart"
              : "Sign in to Reserve"}
        </Button>
      )}
    </div>
  )
}
