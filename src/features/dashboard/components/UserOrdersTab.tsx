"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingBag, Package, Loader2, ChevronDown, ChevronUp,
  CalendarDays, Store, Truck, ArrowRight,
} from "lucide-react"
import { ordersApi } from "@/lib/api-client"
import { OrderStatusBadge } from "@/features/checkout/components/OrderStatusBadge"
import type { Order } from "@/types"

/** Human-readable tip per status for the buyer */
const STATUS_TIPS: Partial<Record<string, string>> = {
  pending_payment:    "Send the exact amount via the seller's QR. The seller will verify shortly.",
  payment_submitted:  "Proof received! The seller is reviewing your payment.",
  confirming_payment: "The seller is verifying your payment. Hang tight!",
  confirmed:          "Payment confirmed! Your item is reserved for you.",
  ready_for_pickup:   "Your order is ready. Head to the shop to collect it.",
  shortlisted:        "Your order is in review. The seller will update you soon.",
  out_of_stock:       "Unfortunately this item is out of stock. A refund will be processed.",
  cancelled:          "This order has been cancelled.",
}

type Props = { fiatSymbol: string }

export function UserOrdersTab({ fiatSymbol }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
    <div className="space-y-3">
      {orders.map((order) => {
        const isExpanded = expandedId === order.id
        const tip = STATUS_TIPS[order.status]

        return (
          <Card key={order.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm font-mono">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <OrderStatusBadge status={order.status} size="sm" />
                    <Badge
                      variant="outline"
                      className="text-xs bg-gray-50 text-gray-500 border-gray-200 capitalize flex items-center gap-1"
                    >
                      {order.fulfillment_type === "pickup"
                        ? <Store className="h-3 w-3" />
                        : <Truck className="h-3 w-3" />}
                      {order.fulfillment_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                    {(order.seller_business ?? order.seller_name) && (
                      <span>Seller: {order.seller_business ?? order.seller_name}</span>
                    )}
                  </div>
                  {/* Status tip */}
                  {tip && (
                    <p className="mt-1.5 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 w-fit">{tip}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-primary text-base">
                    {fiatSymbol}{order.total.toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400"
                    aria-label="Toggle order details"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded items */}
              {isExpanded && (
                <div className="mt-4 border-t pt-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</p>
                  <div className="space-y-2">
                    {(order.items ?? []).map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {item.product_image_url
                            ? <Image src={item.product_image_url} alt={item.product_name ?? ""} fill className="object-contain" />
                            : <Package className="h-5 w-5 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.product_name ?? "Product"}</p>
                          <p className="text-xs text-gray-500">x{item.quantity} @ {fiatSymbol}{item.price.toLocaleString()}</p>
                        </div>
                        <p className="text-sm font-bold text-gray-900 shrink-0">
                          {fiatSymbol}{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Your notes</p>
                      <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">{order.notes}</p>
                    </div>
                  )}

                  {/* Payment proof submitted by buyer */}
                  {order.payment_proof_url && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Payment Screenshot</p>
                      <a
                        href={order.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={order.payment_proof_url}
                          alt="Payment screenshot"
                          className="max-h-40 w-full object-contain rounded-xl border border-border bg-muted cursor-zoom-in"
                        />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      <div className="text-center pt-2">
        <Button variant="outline" asChild size="sm">
          <Link href="/dashboard/orders">
            View All Orders <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
