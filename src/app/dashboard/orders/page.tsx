"use client"

export const runtime = "edge"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShoppingBag, ArrowLeft } from "lucide-react"
import { useApp } from "@/components/shared/app-provider"

export default function DashboardOrdersPage() {
  const { isAuthenticated } = useApp()
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
        <Card className="bg-white shadow-md">
          <CardContent className="p-12 text-center">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-gray-900">No orders yet</h3>
            <p className="mt-2 text-gray-600">Your completed purchases will appear here once checkout is available.</p>
            <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-white">
              <Link href="/shop">Browse Shop</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
