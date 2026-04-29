"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Package, 
  DollarSign, 
  TrendingUp,
  Search,
  Star,
  AlertCircle,
  CheckCircle
} from "lucide-react"

const stats = {
  totalListings: 0,
  activeListings: 0,
  pendingApproval: 0,
  totalSales: 0,
  revenue: 0,
  rating: 0
}

const listings: Array<{
  id: number
  product: string
  price: number
  stock: number
  status: string
  sales: number
}> = []

export default function SellerDashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Seller Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage your store and listings</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold">Premium Cards Store</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>{stats.rating} rating</span>
                </div>
              </div>
              <Link href="/seller/listings/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Listing
                </Button>
              </Link>
            </div>
          </div>
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
                  <p className="text-sm text-muted-foreground">Active Listings</p>
                  <p className="text-2xl font-bold">{stats.activeListings}</p>
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
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">${stats.revenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">{stats.totalSales}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{stats.pendingApproval}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Listings */}
        <Tabs defaultValue="all" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All Listings</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="sold_out">Sold Out</TabsTrigger>
            </TabsList>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search listings..." className="pl-10" />
            </div>
          </div>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4">
              {listings.map((listing) => (
                <Card key={listing.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center">
                          <Package className="h-8 w-8 text-primary/30" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{listing.product}</h3>
                          <p className="text-lg font-bold text-primary">${listing.price}</p>
                          <p className="text-sm text-muted-foreground">Stock: {listing.stock} &bull; Sold: {listing.sales}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={
                            listing.status === "active" ? "secondary" :
                            listing.status === "pending" ? "outline" : "destructive"
                          }
                        >
                          {listing.status === "active" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {listing.status === "pending" && <AlertCircle className="h-3 w-3 mr-1" />}
                          {listing.status.replace("_", " ")}
                        </Badge>
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="outline" size="sm">View</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active">
            <p className="text-muted-foreground">Showing active listings only...</p>
          </TabsContent>
          
          <TabsContent value="pending">
            <p className="text-muted-foreground">Showing pending listings...</p>
          </TabsContent>
          
          <TabsContent value="sold_out">
            <p className="text-muted-foreground">Showing sold out listings...</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
