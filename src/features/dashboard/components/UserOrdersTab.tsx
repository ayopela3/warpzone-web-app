"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Loader2, Eye, ArrowRight } from "lucide-react"
import { ordersApi } from "@/lib/api-client"
import { OrderStatusBadge } from "@/features/checkout/components/OrderStatusBadge"
import type { Order } from "@/types"

type Props = { fiatSymbol: string }

export function UserOrdersTab({ fiatSymbol }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await ordersApi.list()
      if (data.success) setOrders(data.orders)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  if (loading) {
    return (
      <Card className="bg-white shadow-md">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
        </CardContent>
      </Card>
    )
  }

  if (orders.length === 0) {
    return (
      <Card className="bg-white shadow-md">
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mt-6 text-xl font-semibold text-gray-900">No orders yet</h3>
          <p className="mt-2 text-gray-600">Start shopping to see your orders here</p>
          <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-white">
            <Link href="/shop">Browse Shop</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1.5fr_1.5fr_1.5fr_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</span>
        </div>

        {/* Table rows */}
        <div className="divide-y divide-gray-100">
          {orders.map((order) => {
            const itemCount = order.items?.length ?? 0
            return (
              <div
                key={order.id}
                className="grid grid-cols-[1fr_1.5fr_1.5fr_1.5fr_auto] gap-4 px-5 py-4 items-center hover:bg-gray-50 transition-colors"
              >
                {/* Order # */}
                <span className="text-sm font-bold text-primary font-mono">
                  #{order.id.slice(0, 6).toUpperCase()}
                </span>

                {/* Date */}
                <span className="text-sm text-gray-700">
                  {new Date(order.created_at).toLocaleDateString("en-PH", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>

                {/* Status */}
                <div>
                  <OrderStatusBadge status={order.status} size="sm" />
                </div>

                {/* Total */}
                <span className="text-sm font-semibold text-gray-900">
                  {fiatSymbol}{order.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  {itemCount > 0 && (
                    <span className="text-xs font-normal text-gray-500 ml-1">
                      for {itemCount} {itemCount === 1 ? "item" : "items"}
                    </span>
                  )}
                </span>

                {/* Actions */}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100 gap-1.5"
                >
                  <Link href={`/dashboard/orders/${order.id}`}>
                    View <Eye className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="text-center pt-1">
        <Button variant="outline" asChild size="sm">
          <Link href="/dashboard/orders">
            View All Orders <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
