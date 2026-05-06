"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Package, CheckCircle, Search, Truck, X } from "lucide-react"
import { useApp } from "@/components/shared/app-provider"

interface PreOrder {
  id: number
  product: string
  orderDate: string
  releaseDate: string
  status: string
  price: number
}

const preOrders: PreOrder[] = []

type PreOrderFilter = "all" | "active" | "closed"

export default function PreOrderPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<PreOrderFilter>("all")
  const { addToCart, requireAuth, fiatSymbol } = useApp()

  const filteredPreOrders = useMemo(() => {
    let result = [...preOrders]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((o) =>
        o.product.toLowerCase().includes(query)
      )
    }

    if (activeTab !== "all") {
      result = result.filter((o) => o.status === activeTab)
    }

    return result
  }, [searchQuery, activeTab])

  const hasActiveFilters = searchQuery.trim() !== "" || activeTab !== "all"

  const clearFilters = () => {
    setSearchQuery("")
    setActiveTab("all")
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <h1 className="text-3xl font-black">Pre-order upcoming releases</h1>
          <p className="mt-1 text-neutral-600">Reserve booster boxes, bundles, and sealed releases before launch day.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {/* Info Card */}
        <Card className="mb-6 border-primary/30 bg-primary/10">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-white rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">How Pre-Orders Work</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Pre-order upcoming card releases and secure your items before they sell out.
                  Pick up in-store or ship when the release arrives.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search pre-orders..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PreOrderFilter)} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>
          </Tabs>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{filteredPreOrders.length}</span> of {preOrders.length} pre-orders
          </p>
        </div>

        {/* Pre-Orders List */}
        {filteredPreOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No pre-orders found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters ? "Try adjusting your filters" : "You have no pre-orders at this time"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPreOrders.map((order) => (
              <Card key={order.id} className="border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-black hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Image */}
                    <div className="w-full md:w-32 h-40 bg-[linear-gradient(135deg,#fff7cc,#ffffff)] rounded-lg flex items-center justify-center shrink-0">
                      <Package className="h-12 w-12 text-primary" />
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-black">{order.product}</h3>
                          <p className="text-2xl font-black text-black mt-1">
                            {fiatSymbol}{order.price.toLocaleString()}
                          </p>
                        </div>
                        <Badge 
                          variant={
                            order.status === "confirmed" ? "default" :
                            order.status === "processing" ? "secondary" :
                            order.status === "shipped" ? "outline" : "outline"
                          }
                        >
                          {order.status === "confirmed" && <Clock className="h-3 w-3 mr-1" />}
                          {order.status === "processing" && <Package className="h-3 w-3 mr-1" />}
                          {order.status === "shipped" && <Truck className="h-3 w-3 mr-1" />}
                          {order.status === "delivered" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {order.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Ordered On</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {order.orderDate}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Release Date</p>
                          <p className="font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {order.releaseDate}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        {order.status === "confirmed" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (!requireAuth()) {
                                  return
                                }

                                addToCart({
                                  id: `pre-order-${order.id}`,
                                  name: order.product,
                                  price: order.price,
                                  category: "Pre-order",
                                })
                              }}
                            >
                              Reserve now
                            </Button>
                            <Button variant="outline" size="sm">Details</Button>
                          </>
                        )}
                        {order.status === "shipped" && (
                          <Button size="sm">Track Package</Button>
                        )}
                        <Link href={`/shop/1`}>
                          <Button variant="ghost" size="sm">View Product</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
