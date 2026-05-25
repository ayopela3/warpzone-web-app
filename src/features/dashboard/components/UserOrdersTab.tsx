"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Loader2, Eye, ArrowRight } from "lucide-react"
import { ordersApi } from "@/lib/api-client"
import { OrderTable } from "@/components/orders/OrderTable"
import { getStatusUpdate, clearStatusUpdate } from "@/lib/status-sync"
import type { Order } from "@/types"
import type { ExtendedOrder } from "@/components/orders/OrderTable"

type Props = { fiatSymbol: string }

export function UserOrdersTab({ fiatSymbol }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await ordersApi.list()
      if (data.success && data.orders) {
        setOrders(data.orders)
      } else {
        setOrders([])
      }
    } catch (error) {
      console.error('Error fetching buyer orders:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Handle status updates from admin actions
  const handleStatusUpdate = useCallback((oldStatus: string, newStatus: string) => {
    console.log(`Status updated for buyer orders: ${oldStatus} -> ${newStatus}`)
    fetchOrders()
  }, [fetchOrders])

  // Set up status synchronization for all orders
  useEffect(() => {
    // Check for any status updates every 3 seconds
    const interval = setInterval(() => {
      orders.forEach(order => {
        const update = getStatusUpdate(order.id)
        if (update) {
          handleStatusUpdate(update.oldStatus, update.newStatus)
          clearStatusUpdate(order.id)
        }
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [orders, handleStatusUpdate])

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
            <Link href="/shop" prefetch={false}>Browse Shop</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <OrderTable
        orders={orders as ExtendedOrder[]}
        fiatSymbol={fiatSymbol}
        loading={loading}
        config={{
          columns: ["order", "date", "status", "total", "actions"],
          renderActions: (order) => (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-700 hover:bg-gray-100 gap-1.5"
            >
              <Link href={`/dashboard/orders/${order.id}`} prefetch={false}>
                View <Eye className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )
        }}
      />

      <div className="text-center pt-1">
        <Button variant="outline" asChild size="sm">
          <Link href="/dashboard/orders" prefetch={false}>
            View All Orders <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
