"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  ShoppingBag, Package, Loader2, ChevronDown, ChevronUp,
  CheckCheck, ImageIcon, Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { toast } from "sonner"
import { sellerOrdersApi, ordersApi } from "@/lib/api-client"
import { OrderTable } from "@/components/orders/OrderTable"
import type { Order, OrderStatus } from "@/types"
import type { ExtendedOrder } from "@/components/orders/OrderTable"

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
  const [showFeeInfo, setShowFeeInfo] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sellerOrdersApi.list()
      if (data.success) {
        setOrders(data.orders)
      }
    } catch (error) {
      console.error('Error fetching seller orders:', error)
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
    <div className="space-y-4">
      {/* Platform fee info with toggle */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowFeeInfo(!showFeeInfo)}
          className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
        >
          <Info className="h-4 w-4" />
          {showFeeInfo ? "Hide fee info" : "How fees work"}
        </button>
      </div>

      {showFeeInfo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Platform fees apply to all sales.</span> The buyer pays your listed price in full. A platform fee is deducted from your payout — you keep the rest.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-white border border-amber-200 p-3 space-y-1.5">
              <p className="font-semibold text-gray-700">Shop Orders — 5% fee</p>
              <div className="flex justify-between text-gray-500"><span>Buyer pays</span><span>{fiatSymbol}620</span></div>
              <div className="flex justify-between text-red-500"><span>Platform fee (5%)</span><span>− {fiatSymbol}31</span></div>
              <div className="flex justify-between font-semibold text-green-700 border-t pt-1"><span>You receive</span><span>{fiatSymbol}589</span></div>
            </div>
            <div className="rounded-lg bg-white border border-amber-200 p-3 space-y-1.5">
              <p className="font-semibold text-gray-700">Auctions — 10% fee</p>
              <div className="flex justify-between text-gray-500"><span>Winning bid</span><span>{fiatSymbol}620</span></div>
              <div className="flex justify-between text-red-500"><span>Platform fee (10%)</span><span>− {fiatSymbol}62</span></div>
              <div className="flex justify-between font-semibold text-green-700 border-t pt-1"><span>You receive</span><span>{fiatSymbol}558</span></div>
            </div>
          </div>
        </div>
      )}

      <OrderTable
        orders={orders as ExtendedOrder[]}
        fiatSymbol={fiatSymbol}
        loading={loading}
        config={{
          columns: ["order", "buyer", "date", "status", "total", "actions"],
          showExpanded: true,
          expandedId,
          onToggleExpand: (id) => setExpandedId(expandedId === id ? null : id),
          renderActions: (order) => (
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
              className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors"
              aria-label="Toggle details"
            >
              Details {expandedId === order.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          ),
          renderExpanded: (order) => (
            <div className="px-5 pb-5 space-y-4">
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
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment Proof</p>
                {order.payment_proof_url ? (
                  <div className="space-y-3">
                    <a
                      href={order.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white rounded-lg overflow-hidden border border-gray-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={order.payment_proof_url}
                        alt="Payment proof"
                        className="max-h-64 w-full object-contain cursor-zoom-in"
                      />
                    </a>
                    {(order.status === "pending_payment" || order.status === "payment_submitted" || order.status === "confirming_payment") && (
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-11"
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
                  <div className="flex items-center gap-3 text-sm text-gray-500 bg-white rounded-lg px-4 py-4 border border-gray-200 border-dashed">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <ImageIcon className="h-4 w-4 shrink-0" />
                    </div>
                    <span>No payment screenshot uploaded yet.</span>
                  </div>
                )}
              </div>

              {/* Status action */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-2 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700">Update status</p>
                <Select
                  value={order.status}
                  onValueChange={(v) => handleStatusChange(order.id, v as OrderStatus)}
                  disabled={updatingId === order.id || order.status === "cancelled"}
                >
                  <SelectTrigger className="w-full sm:w-64 h-10 text-sm bg-white">
                    {updatingId === order.id
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
          )
        }}
      />
    </div>
  )
}
