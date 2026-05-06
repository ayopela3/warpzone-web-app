"use client"

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

  return (
    <Button
      className="mt-5 w-full"
      size="lg"
      disabled={!inStock}
      onClick={() => {
        addToCart({
          id: productId,
          name,
          price,
          category,
        }, quantity)
      }}
    >
      {inStock ? "Add to cart" : "Out of stock"}
    </Button>
  )
}
