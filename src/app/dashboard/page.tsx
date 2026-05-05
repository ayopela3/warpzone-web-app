"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Package,
  Gavel,
  Trophy,
  Calendar,
  DollarSign,
  ShoppingBag,
  Clock,
  ArrowRight,
  Plus,
  CheckCircle2,
  XCircle,
  Hourglass
} from "lucide-react"
import { useApp } from "@/components/shared/app-provider"

const recentOrders: Array<{ id: string; date: string; total: number; status: string; items: number }> = []

const activeBids: Array<{ id: number; item: string; currentBid: number; yourBid: number; endTime: string; status: string }> = []

const upcomingTournaments: Array<{ id: number; name: string; date: string; location: string }> = []

const sellerOrders: Array<{ id: string; customer: string; total: number; status: string, items: number }> = []

type SellerProduct = {
  id: string
  name: string
  sku: string
  category: string
  rarity: string | null
  description: string | null
  image_url: string | null
  approval_status: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, userRole, userId } = useApp()
  const [sellerProducts, setSellerProducts] = useState<SellerProduct[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/signin")
    }
  }, [isAuthenticated, router])

  const fetchSellerProducts = useCallback(async () => {
    setIsLoadingProducts(true)
    try {
      const response = await fetch(`/api/products?sellerId=${userId}&approvalStatus=approved`)
      const data = await response.json()
      if (data.success) {
        setSellerProducts(data.products || [])
      }
    } catch (error) {
      console.error("Failed to fetch seller products:", error)
    } finally {
      setIsLoadingProducts(false)
    }
  }, [userId])

  useEffect(() => {
    if (isAuthenticated && userRole === "seller" && userId) {
      fetchSellerProducts()
    }
  }, [isAuthenticated, userRole, userId, fetchSellerProducts])

  if (!isAuthenticated) {
    return null
  }

  // Redirect admin to admin dashboard
  if (userRole === "admin") {
    router.push("/admin")
    return null
  }

  // Seller dashboard
  if (userRole === "seller") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="border-b bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
                <p className="text-gray-600 mt-1">Manage your products, auctions, and orders</p>
              </div>
              <Button asChild className="bg-primary hover:bg-primary/90 text-white">
                <Link href="/seller/listings/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Listing
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-primary to-primary/90 text-white shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-white/90">Products</p>
                    <p className="text-4xl font-black mt-2">0</p>
                    <p className="text-xs font-medium text-white/80 mt-1">Total listings</p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Orders</p>
                    <p className="text-4xl font-bold mt-2 text-gray-900">0</p>
                    <p className="text-xs text-gray-500 mt-1">Pending fulfillment</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <ShoppingBag className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all border-l-4 border-l-emerald-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Revenue</p>
                    <p className="text-4xl font-bold mt-2 text-gray-900">$0</p>
                    <p className="text-xs text-emerald-600 mt-1">+0% from last month</p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-xl">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all border-l-4 border-l-amber-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Auctions</p>
                    <p className="text-4xl font-bold mt-2 text-gray-900">0</p>
                    <p className="text-xs text-amber-600 mt-1">Currently live</p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <Gavel className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="products" className="space-y-6">
            <TabsList className="grid w-full max-w-lg grid-cols-3 bg-white p-1">
              <TabsTrigger value="products" className="data-[state=active]:bg-primary data-[state=active]:text-white">Products</TabsTrigger>
              <TabsTrigger value="auctions" className="data-[state=active]:bg-primary data-[state=active]:text-white">Auctions</TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-white">Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Your Products</h2>
              </div>
              {isLoadingProducts ? (
                <Card className="bg-white shadow-md">
                  <CardContent className="p-12 text-center">
                    <p className="text-gray-600">Loading products...</p>
                  </CardContent>
                </Card>
              ) : sellerProducts.length === 0 ? (
                <Card className="bg-white shadow-md">
                  <CardContent className="p-12 text-center">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-gray-900">No listings yet</h3>
                    <p className="mt-2 text-gray-600">Add your first listing to start selling on Warpzone</p>
                    <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-white">
                      <Link href="/seller/listings/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Listing
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sellerProducts.map((product) => (
                    <Card
                      key={product.id}
                      className={`bg-white shadow-md hover:shadow-lg transition-shadow ${
                        product.approval_status === "pending" ? "opacity-60" : ""
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-gray-900">{product.name}</p>
                              <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                            </div>
                            {product.approval_status === "pending" && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                                <Hourglass className="h-3 w-3" />
                                Pending
                              </Badge>
                            )}
                            {product.approval_status === "approved" && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Approved
                              </Badge>
                            )}
                            {product.approval_status === "rejected" && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                Rejected
                              </Badge>
                            )}
                          </div>
                          {product.image_url && (
                            <div className="w-full h-32 rounded-md overflow-hidden bg-gray-100">
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="pt-4 border-t">
                            <p className="text-sm text-gray-600">{product.category}</p>
                            {product.rarity && (
                              <p className="text-sm text-gray-500">Rarity: {product.rarity}</p>
                            )}
                          </div>
                          {product.approval_status === "pending" && (
                            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                              Your product is pending admin approval. You&apos;ll be able to create listings once approved.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="auctions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Your Auctions</h2>
                <Button asChild className="bg-primary hover:bg-primary/90 text-white">
                  <Link href="/seller/auctions/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Auction
                  </Link>
                </Button>
              </div>
              <Card className="bg-white shadow-md">
                <CardContent className="p-12 text-center">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <Gavel className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-900">No auctions yet</h3>
                  <p className="mt-2 text-gray-600">Create your first auction to start bidding wars on your products</p>
                  <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-white">
                    <Link href="/seller/auctions/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Auction
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Incoming Orders</h2>
              </div>
              {sellerOrders.length === 0 ? (
                <Card className="bg-white shadow-md">
                  <CardContent className="p-12 text-center">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                      <ShoppingBag className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-gray-900">No orders yet</h3>
                    <p className="mt-2 text-gray-600">Orders from customers will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {sellerOrders.map((order) => (
                    <Card key={order.id} className="bg-white shadow-md">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl">
                              <ShoppingBag className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{order.customer}</p>
                              <p className="text-sm text-gray-600">{order.items} items</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">${order.total.toFixed(2)}</p>
                            <Badge variant={
                              order.status === "delivered" ? "secondary" :
                              order.status === "shipped" ? "outline" : "default"
                            } className="text-sm">
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  // Regular user dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here is your overview.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-primary to-primary/90 text-white shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-white/90">Total Orders</p>
                  <p className="text-4xl font-black mt-2">12</p>
                  <p className="text-xs font-medium text-white/80 mt-1">All time</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-lg hover:shadow-xl transition-all border-l-4 border-l-amber-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Bids</p>
                  <p className="text-4xl font-bold mt-2 text-gray-900">2</p>
                  <p className="text-xs text-amber-600 mt-1">Currently bidding</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Gavel className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-lg hover:shadow-xl transition-all border-l-4 border-l-emerald-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tournaments</p>
                  <p className="text-4xl font-bold mt-2 text-gray-900">3</p>
                  <p className="text-xs text-emerald-600 mt-1">Registered</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Trophy className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-lg hover:shadow-xl transition-all border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-4xl font-bold mt-2 text-gray-900">$2,439</p>
                  <p className="text-xs text-blue-600 mt-1">Lifetime</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3 bg-white p-1">
            <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-white">Orders</TabsTrigger>
            <TabsTrigger value="auctions" className="data-[state=active]:bg-primary data-[state=active]:text-white">Auctions</TabsTrigger>
            <TabsTrigger value="tournaments" className="data-[state=active]:bg-primary data-[state=active]:text-white">Tournaments</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
              <Link href="/dashboard/orders">
                <Button variant="outline" size="sm" className="border-2">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-4">
              {recentOrders.length === 0 ? (
                <Card className="bg-white shadow-md">
                  <CardContent className="p-12 text-center">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                      <ShoppingBag className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-gray-900">No orders yet</h3>
                    <p className="mt-2 text-gray-600">Start shopping to see your orders here</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <Card key={order.id} className="bg-white shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl">
                              <ShoppingBag className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{order.id}</p>
                              <p className="text-sm text-gray-600">{order.items} items &bull; {order.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">${order.total.toFixed(2)}</p>
                            <Badge variant={
                              order.status === "delivered" ? "secondary" :
                              order.status === "shipped" ? "outline" : "default"
                            } className="text-sm">
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="auctions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Active Bids</h2>
              <Link href="/dashboard/auctions">
                <Button variant="outline" size="sm" className="border-2">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-4">
              {activeBids.length === 0 ? (
                <Card className="bg-white shadow-md">
                  <CardContent className="p-12 text-center">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                      <Gavel className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-gray-900">No active bids</h3>
                    <p className="mt-2 text-gray-600">Join auctions to see your active bids here</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {activeBids.map((bid) => (
                    <Card key={bid.id} className="bg-white shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-100 rounded-xl">
                              <Gavel className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{bid.item}</p>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Ends in {bid.endTime}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Current Bid</p>
                            <p className="text-2xl font-bold text-gray-900">${bid.currentBid.toLocaleString()}</p>
                            <Badge variant={bid.status === "winning" ? "secondary" : "destructive"} className="text-sm">
                              {bid.status === "winning" ? "Winning" : "Outbid"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Registered Tournaments</h2>
              <Link href="/dashboard/tournaments">
                <Button variant="outline" size="sm" className="border-2">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-4">
              {upcomingTournaments.length === 0 ? (
                <Card className="bg-white shadow-md">
                  <CardContent className="p-12 text-center">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                      <Trophy className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-gray-900">No tournaments yet</h3>
                    <p className="mt-2 text-gray-600">Register for tournaments to see them here</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {upcomingTournaments.map((tournament) => (
                    <Card key={tournament.id} className="bg-white shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 rounded-xl">
                              <Trophy className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{tournament.name}</p>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {tournament.date}
                              </p>
                            </div>
                          </div>
                          <Badge className="text-sm">Registered</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
