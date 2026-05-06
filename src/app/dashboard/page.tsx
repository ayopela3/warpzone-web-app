"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/components/shared/app-provider"
import { SellerDashboard } from "@/features/dashboard/components/SellerDashboard"
import { UserDashboard } from "@/features/dashboard/components/UserDashboard"

export default function DashboardPage() {
  const { isAuthenticated, userRole, userId, fiatSymbol } = useApp()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) router.push("/auth/signin")
    if (userRole === "admin") router.push("/admin")
  }, [isAuthenticated, userRole, router])

  if (!isAuthenticated || userRole === "admin") return null

  if (userRole === "seller") {
    return <SellerDashboard userId={userId} fiatSymbol={fiatSymbol} />
  }

  return <UserDashboard fiatSymbol={fiatSymbol} />
}
