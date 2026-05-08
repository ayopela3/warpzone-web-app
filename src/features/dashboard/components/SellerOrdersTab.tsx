"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  ShoppingBag, Package, Loader2, ChevronDown, ChevronUp, CalendarDays, User,
  CheckCheck, ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { toast } from "sonner"
import { sellerOrdersApi, ordersApi } from "@/lib/api-client"
import { OrderStatusBadge } from "@/features/checkout/components/OrderStatusBadge"
import type { Order, OrderStatus } from "@/types"

/** Statuses a seller is allowed to set (excludes pending_payment which is buyer-driven) */
const SELLER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "confirming_payment", label: "Confirming Payment" },
  { value: "confirmed",          label: "Confirmed" },
  { value: "ready_for_pickup",   label: "Ready for Pickup" },
  { value: "shortlisted",        label: "Shortlisted" },
  { value: "out_of_stock",       label: "Out of Stock" },
  { value: "cancelled",          label: "Cancelled" },
]

type Props = { fiatSymbol: string }

export function SellerOrdersTab({ fiatSymbol }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sellerOrdersApi.list()
      if (data.success) setOrders(data.orders)
    } catch {
      toast.error("Failed to load orders")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleConfirmPayment = async (orderId: string) => {
    setConfirmingId(orderId)
    try {
      const result = await ordersApi.markPaid(orderId)
      if (!result.success) throw new Error(result.error ?? "Failed to confirm")
      setOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, status: "confirmed" } : o)
      )
      toast.success("Payment confirmed — order marked as Confirmed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm payment")
    } finally {
      setConfirmingId(null)
    }
  }

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId)
    try {
      const result = await sellerOrdersApi.updateStatus(orderId, status)
      if (!result.success) throw new Error(result.error ?? "Failed to update")
      setOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, status, updated_at: new Date().toISOString() } : o)
      )
      toast.success(`Order marked as: ${status.replace(/_/g, " ")}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update order")
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <Card className="bg-white shadow-md">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading orders...</p>
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
          <p className="mt-2 text-gray-600">Incoming customer orders will appear here</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const isExpanded = expandedId === order.id
        const isUpdating = updatingId === order.id

        return (
          <Card key={order.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm font-mono">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <OrderStatusBadge status={order.status} size="sm" />
                    <Badge
                      variant="outline"
                      className="text-xs bg-gray-50 text-gray-600 border-gray-200 capitalize"
                    >
                      {order.fulfillment_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {order.buyer_name ?? order.buyer_email ?? "Unknown buyer"}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-primary text-base">
                    {fiatSymbol}{order.total.toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400"
                    aria-label="Toggle details"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-4 space-y-4 border-t pt-4">
                  {/* Items */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
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
                  </div>

                  {/* Buyer contact */}
                  {(order.buyer_email ?? order.buyer_phone) && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Buyer Contact</p>
                      {order.buyer_email && <p className="text-sm text-gray-700">{order.buyer_email}</p>}
                      {order.buyer_phone && <p className="text-sm text-gray-700">{order.buyer_phone}</p>}
                    </div>
                  )}

                  {/* Notes */}
                  {order.notes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Note from buyer</p>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">{order.notes}</p>
                    </div>
                  )}

                  {/* Payment proof */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment Proof</p>
                    {order.payment_proof_url ? (
                      <div className="space-y-3">
                        <a
                          href={order.payment_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={order.payment_proof_url}
                            alt="Payment proof"
                            className="max-h-48 w-full object-contain rounded-xl border border-border bg-muted cursor-zoom-in"
                          />
                        </a>
                        {(order.status === "pending_payment" || order.status === "payment_submitted" || order.status === "confirming_payment") && (
                          <Button
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                            disabled={confirmingId === order.id}
                            onClick={() => handleConfirmPayment(order.id)}
                          >
                            {confirmingId === order.id
                              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Confirming…</>
                              : <><CheckCheck className="h-4 w-4 mr-2" />Confirm Payment Received</>}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3">
                        <ImageIcon className="h-4 w-4 shrink-0" />
                        No payment screenshot uploaded yet.
                      </div>
                    )}
                  </div>

                  {/* Status action */}
                  <div className="flex items-center gap-3 pt-1">
                    <p className="text-sm font-medium text-gray-700 shrink-0">Update status:</p>
                    <Select
                      value={order.status}
                      onValueChange={(v) => handleStatusChange(order.id, v as OrderStatus)}
                      disabled={isUpdating || order.status === "cancelled"}
                    >
                      <SelectTrigger className="w-56 h-9 text-sm">
                        {isUpdating
                          ? <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Updating…</span>
                          : <SelectValue />}
                      </SelectTrigger>
                      <SelectContent>
                        {SELLER_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
