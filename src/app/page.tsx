"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/components/shared/app-provider"
import { AnnouncementBar } from "@/features/home/components/AnnouncementBar"
import { HeroSection } from "@/features/home/components/HeroSection"
import { CategoryTiles } from "@/features/home/components/CategoryTiles"
import { FeaturedProductsSection } from "@/features/home/components/FeaturedProductsSection"
import { TrustStrip } from "@/features/home/components/TrustStrip"
import { productsApi } from "@/lib/api-client"
import type { Product } from "@/types"

export default function HomePage() {
  const { userRole, isAuthenticated, fiatSymbol, addToCart } = useApp()
  const router = useRouter()
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0)
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const isSeller = userRole === "seller"

  useEffect(() => {
    if (isAuthenticated && userRole === "admin") router.push("/admin")
  }, [isAuthenticated, userRole, router])

  useEffect(() => {
    productsApi.featured()
      .then((d) => { if (d.success) setFeaturedProducts(d.products) })
      .catch(console.error)
  }, [])

  const handleAddToCart = (product: Product, qty: number) => {
    addToCart(
      { id: product.id, name: product.name, price: product.price, category: product.category },
      qty,
      product.quantity,
    )
  }

  return (
    <div className="bg-white">
      <AnnouncementBar />
      <HeroSection
        isSeller={isSeller}
        featuredProducts={featuredProducts}
        activeFeaturedIndex={activeFeaturedIndex}
        fiatSymbol={fiatSymbol}
        onDotClick={setActiveFeaturedIndex}
      />
      <CategoryTiles />
      <FeaturedProductsSection
        products={featuredProducts}
        isSeller={isSeller}
        fiatSymbol={fiatSymbol}
        onAddToCart={handleAddToCart}
      />
      <TrustStrip />
    </div>
  )
}