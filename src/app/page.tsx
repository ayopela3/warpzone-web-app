"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/components/shared/app-provider"
import { HeroSection, CtaSection } from "@/features/home/components/HeroSection"
import { ServicesGrid } from "@/features/home/components/ServicesGrid"
import { FeaturedProductsSection } from "@/features/home/components/FeaturedProductsSection"
import { productsApi } from "@/lib/api-client"
import type { Product } from "@/types"

export default function HomePage() {
  const { userRole, isAuthenticated } = useApp()
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

  return (
    <div className="bg-white text-black">
      <HeroSection
        isSeller={isSeller}
        featuredProducts={featuredProducts}
        activeFeaturedIndex={activeFeaturedIndex}
        onDotClick={setActiveFeaturedIndex}
      />
      <ServicesGrid />
      <FeaturedProductsSection products={featuredProducts} isSeller={isSeller} />
      <CtaSection isSeller={isSeller} />
    </div>
  )
}