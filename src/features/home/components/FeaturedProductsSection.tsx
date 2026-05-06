"use client"

import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Product } from "@/types"

type Props = {
  products: Product[]
  isSeller: boolean
}

export function FeaturedProductsSection({ products, isSeller }: Props) {
  if (isSeller || products.length === 0) return null

  return (
    <section className="border-y bg-neutral-50 py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <Badge variant="secondary">Featured products</Badge>
            <h2 className="mt-3 text-3xl font-black text-black">Great additions to your collection</h2>
          </div>
          <Button variant="outline" asChild>
            <Link href="/shop">View shop</Link>
          </Button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <Link key={product.id} href={`/shop/${product.id}`} className="group">
              <Card className="overflow-hidden border-neutral-200 bg-white shadow-md transition-all duration-300 hover:-translate-y-2 hover:border-black hover:shadow-2xl">
                <div className="flex aspect-square items-center justify-center bg-[linear-gradient(135deg,#fef3c7,#ffffff,#fef3c7)] p-6">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="max-h-56 h-full w-full object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-primary bg-white shadow-md">
                      <ShoppingBag className="h-20 w-20 text-primary" />
                    </div>
                  )}
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{product.category}</Badge>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">Featured</Badge>
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-lg font-black leading-tight text-black">{product.name}</h3>
                  {product.rarity && (
                    <p className="mt-2 text-sm font-medium text-neutral-500">{product.rarity}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
