"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useApp } from "@/components/shared/app-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, ShoppingBag, Gavel, Trophy, Package } from "lucide-react"

export default function AdminDashboard() {
  const router = useRouter()
  const { isAuthenticated, userRole } = useApp()

  useEffect(() => {
    if (!isAuthenticated || userRole !== "admin") {
      router.push("/")
    }
  }, [isAuthenticated, userRole, router])

  if (!isAuthenticated || userRole !== "admin") {
    return null
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-black">Admin Dashboard</h1>
          <p className="mt-2 text-lg text-neutral-600">Manage your platform</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-600">Total Users</span>
                <Users className="h-5 w-5 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-black">0</p>
            </CardContent>
          </Card>

          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-600">Products</span>
                <ShoppingBag className="h-5 w-5 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-black">0</p>
            </CardContent>
          </Card>

          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-600">Active Auctions</span>
                <Gavel className="h-5 w-5 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-black">0</p>
            </CardContent>
          </Card>

          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-600">Tournaments</span>
                <Trophy className="h-5 w-5 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black text-black">0</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600">No recent orders</p>
            </CardContent>
          </Card>

          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black">Recent Listings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600">No recent listings</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" asChild>
                  <button className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Manage Users
                  </button>
                </Button>
                <Button variant="outline" asChild>
                  <button className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Manage Products
                  </button>
                </Button>
                <Button variant="outline" asChild>
                  <button className="flex items-center gap-2">
                    <Gavel className="h-4 w-4" />
                    Manage Auctions
                  </button>
                </Button>
                <Button variant="outline" asChild>
                  <button className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Manage Tournaments
                  </button>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
