"use client"

import { ShoppingCart } from "lucide-react"
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
      className="w-full h-12 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90"
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
      <ShoppingCart className="h-4 w-4 mr-2" />
      {inStock ? "Add to cart" : "Out of stock"}
    </Button>
  )
}
