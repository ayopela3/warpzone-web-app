"use client"

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
  ArrowRight
} from "lucide-react"

const recentOrders = [
  { id: "ORD-001", date: "Dec 8, 2024", total: 299.99, status: "delivered", items: 2 },
  { id: "ORD-002", date: "Dec 5, 2024", total: 149.99, status: "shipped", items: 1 },
  { id: "ORD-003", date: "Dec 1, 2024", total: 599.99, status: "processing", items: 3 },
]

const activeBids = [
  { id: 1, item: "1st Edition Charizard", currentBid: 25000, yourBid: 23000, endTime: "2h 30m", status: "outbid" },
  { id: 2, item: "Tropical Mega Battle Pikachu", currentBid: 8500, yourBid: 8500, endTime: "5h 15m", status: "winning" },
]

const upcomingTournaments = [
  { id: 1, name: "Pokemon Regional Championship", date: "Dec 15, 2024", location: "Los Angeles, CA" },
  { id: 2, name: "MTG Pro Tour", date: "Dec 22, 2024", location: "Las Vegas, NV" },
]

export default function DashboardPage() {
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
