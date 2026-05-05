"use client"

import { useEffect } from "react"
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
  Plus
} from "lucide-react"
import { useApp } from "@/components/shared/app-provider"

const recentOrders: Array<{ id: string; date: string; total: number; status: string; items: number }> = []

const activeBids: Array<{ id: number; item: string; currentBid: number; yourBid: number; endTime: string; status: string }> = []

const upcomingTournaments: Array<{ id: number; name: string; date: string; location: string }> = []

const sellerProducts: Array<{ id: string; name: string; sku: string; price: number; quantity: number, condition: string }> = []

const sellerOrders: Array<{ id: string; customer: string; total: number; status: string, items: number }> = []

export default function DashboardPage() {
  const router = useRouter()
  const { isAuthenticated, userRole } = useApp()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/signin")
    }
  }, [isAuthenticated, router])

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
      <div className="min-h-screen bg-background">
        <div className="border-b bg-muted/50">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
            <h1 className="text-3xl font-bold">Seller Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your products and orders</p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Products</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShoppingBag className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Orders</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold">$0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="products" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="products">Manage Products</TabsTrigger>
              <TabsTrigger value="orders">Manage Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your Products</h2>
                <Button asChild>
                  <Link href="/seller/listings/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Link>
                </Button>
              </div>
              {sellerProducts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No products yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Add your first product to start selling</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {sellerProducts.map((product) => (
                    <Card key={product.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{product.name}</p>
                            <p className="text-sm text-muted-foreground">SKU: {product.sku} · {product.condition}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${product.price}</p>
                            <Badge variant="outline">{product.quantity} in stock</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Incoming Orders</h2>
              </div>
              {sellerOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No orders yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Orders from customers will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {sellerOrders.map((order) => (
                    <Card key={order.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <ShoppingBag className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">{order.customer}</p>
                              <p className="text-sm text-muted-foreground">{order.items} items</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${order.total.toFixed(2)}</p>
                            <Badge variant={
                              order.status === "delivered" ? "secondary" :
                              order.status === "shipped" ? "outline" : "default"
                            }>
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here is your overview.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Gavel className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Bids</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Trophy className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tournaments</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold">$2,439</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="auctions">Auctions</TabsTrigger>
            <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Orders</h2>
              <Link href="/dashboard/orders">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <ShoppingBag className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{order.id}</p>
                          <p className="text-sm text-muted-foreground">{order.items} items &bull; {order.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${order.total.toFixed(2)}</p>
                        <Badge variant={
                          order.status === "delivered" ? "secondary" :
                          order.status === "shipped" ? "outline" : "default"
                        }>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="auctions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Active Bids</h2>
              <Link href="/dashboard/auctions">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-4">
              {activeBids.map((bid) => (
                <Card key={bid.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Gavel className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{bid.item}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Ends in {bid.endTime}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Current Bid</p>
                        <p className="font-bold">${bid.currentBid.toLocaleString()}</p>
                        <Badge variant={bid.status === "winning" ? "secondary" : "destructive"}>
                          {bid.status === "winning" ? "Winning" : "Outbid"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Registered Tournaments</h2>
              <Link href="/dashboard/tournaments">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="space-y-4">
              {upcomingTournaments.map((tournament) => (
                <Card key={tournament.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <Trophy className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{tournament.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {tournament.date}
                          </p>
                        </div>
                      </div>
                      <Badge>Registered</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
