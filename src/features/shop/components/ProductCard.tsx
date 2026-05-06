"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingBag } from "lucide-react"
import type { Product } from "@/types"

type Props = {
  product: Product
  fiatSymbol: string
  onAddToCart: (product: Product) => void
}

export function ProductCard({ product, fiatSymbol, onAddToCart }: Props) {
  const outOfStock = product.quantity === 0

  return (
    <Link href={`/shop/${product.id}`}>
      <Card className="group h-full cursor-pointer overflow-hidden border-neutral-200 bg-white py-0 shadow-sm transition hover:-translate-y-1 hover:border-black hover:shadow-xl">
        <CardContent className="flex h-full flex-col p-0">
          <div className="relative flex h-64 items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#fff7cc,#ffffff)]">
            <div className="absolute inset-x-8 top-6 h-44 rounded-2xl border border-primary/30 bg-white/70 blur-xl" />
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="relative h-40 w-28 object-contain transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="relative flex h-40 w-28 items-center justify-center rounded-2xl border-2 border-primary bg-white shadow-lg transition-transform group-hover:scale-105">
                <ShoppingBag className="h-12 w-12 text-primary" />
              </div>
            )}
            <Badge className="absolute top-3 left-3 text-white">{product.category}</Badge>
            {outOfStock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Badge variant="secondary" className="text-sm">Out of Stock</Badge>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col p-4">
            <h3 className="line-clamp-2 min-h-12 font-black leading-6 text-black">{product.name}</h3>
            {product.rarity && (
              <p className="mt-1 line-clamp-1 text-sm text-neutral-600">{product.rarity}</p>
            )}
            <div className="mt-auto flex items-center justify-between pt-4">
              <div>
                <p className="text-xl font-black text-primary">{fiatSymbol}{product.price.toLocaleString()}</p>
                <p className="text-xs text-neutral-500">Qty: {product.quantity}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                className="flex-1 text-white cursor-pointer"
                disabled={outOfStock}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onAddToCart(product)
                }}
              >
                {outOfStock ? "Out of Stock" : "Add to Cart"}
              </Button>
              <Button variant="outline" className="flex-1" disabled={outOfStock}>
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
