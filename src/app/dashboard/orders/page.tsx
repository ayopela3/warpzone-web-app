"use client"

export const runtime = "edge"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useApp } from "@/components/shared/app-provider"
import { UserOrdersTab } from "@/features/dashboard/components/UserOrdersTab"

export default function DashboardOrdersPage() {
  const { isAuthenticated, fiatSymbol } = useApp()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) router.push("/auth/signin")
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4" />Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-1">Track your purchase history and order status.</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
        <UserOrdersTab fiatSymbol={fiatSymbol} />
      </div>
    </div>
  )
}
