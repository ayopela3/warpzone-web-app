"use client"

export const runtime = "edge"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Package, Loader2 } from "lucide-react"
import { useApp } from "@/components/shared/app-provider"
import { ordersApi } from "@/lib/api-client"
import { OrderStatusBadge } from "@/features/checkout/components/OrderStatusBadge"
import { Badge } from "@/components/ui/badge"
import type { Order } from "@/types"

/** Friendly status label for the summary sentence */
const STATUS_LABEL: Record<string, string> = {
  pending_payment:    "Pending Payment",
  payment_submitted:  "Proof Submitted",
  confirming_payment: "Confirming Payment",
  confirmed:          "Confirmed",
  ready_for_pickup:   "Ready for Pickup",
  shortlisted:        "Shortlisted",
  out_of_stock:       "Out of Stock",
  cancelled:          "Cancelled",
}

export default function OrderDetailPage() {
  const { isAuthenticated, fiatSymbol } = useApp()
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    if (!params.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await ordersApi.get(params.id)
      if (data.success) {
        setOrder(data.order)
      } else {
        setError("Order not found.")
      }
    } catch {
      setError("Failed to load order.")
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (!isAuthenticated) router.push("/auth/signin")
  }, [isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) fetchOrder()
  }, [isAuthenticated, fetchOrder])

  if (!isAuthenticated) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">{error ?? "Order not found."}</p>
        <Link href="/dashboard/orders" className="text-primary text-sm hover:underline">
          ← Back to Orders
        </Link>
      </div>
    )
  }

  const shortId     = order.id.slice(0, 6).toUpperCase()
  const placedOn    = new Date(order.created_at).toLocaleDateString("en-PH", {
    month: "long",
    day:   "numeric",
    year:  "numeric",
  })
  const statusLabel = STATUS_LABEL[order.status] ?? order.status
  const subtotal    = (order.items ?? []).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const dpAdjustment = order.total < subtotal ? order.total - subtotal : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 space-y-6">
        {/* Summary sentence */}
        <p className="text-sm text-gray-600">
          Order{" "}
          <span className="font-bold text-primary font-mono">#{shortId}</span>
          {" "}was placed on{" "}
          <span className="font-semibold text-gray-800">{placedOn}</span>
          {" "}and is currently{" "}
          <span className="font-semibold text-gray-800">{statusLabel}</span>.
        </p>

        {/* Order details card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Order details</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Column headers */}
            <div className="grid grid-cols-2 px-6 py-3 bg-gray-50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</span>
            </div>

            {/* Items */}
            {(order.items ?? []).map((item) => {
              const isPreOrder = Boolean(item.pre_order_id)
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-2 items-center gap-4 px-6 py-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Product thumbnail */}
                    <div className="relative h-12 w-12 rounded-md bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.product_image_url ? (
                        <Image
                          src={item.product_image_url}
                          alt={item.product_name ?? ""}
                          fill
                          className="object-contain"
                          sizes="48px"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {item.product_name ?? "Product"} &times; {item.quantity}
                      </p>
                      {isPreOrder && (
                        <Badge className="mt-1 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 border-amber-200 font-semibold uppercase">
                          Pre-Order
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {fiatSymbol}{(item.price * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )
            })}

            {/* Subtotal */}
            <div className="grid grid-cols-2 px-6 py-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtotal:</span>
              <span className="text-sm text-gray-800">
                {fiatSymbol}{subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Shipping */}
            <div className="grid grid-cols-2 px-6 py-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Shipping:</span>
              <span className="text-sm text-gray-800 capitalize">
                {order.fulfillment_type === "pickup"
                  ? "In-store pickup"
                  : "LBC — shipping cost to be confirmed after allocation"}
              </span>
            </div>

            {/* Down-payment adjustment (only shown when total ≠ subtotal) */}
            {dpAdjustment !== 0 && (
              <div className="grid grid-cols-2 px-6 py-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">DP Adjustment:</span>
                <span className="text-sm text-gray-800">
                  -{fiatSymbol}{Math.abs(dpAdjustment).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Total */}
            <div className="grid grid-cols-2 px-6 py-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total:</span>
              <span className="text-sm font-bold text-gray-900">
                {fiatSymbol}{order.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Payment method */}
            <div className="grid grid-cols-2 px-6 py-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Method:</span>
              <div>
                <span className="text-sm font-semibold text-primary">Direct bank transfer</span>
                {order.payment_proof_url && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Payment screenshot:</p>
                    <a href={order.payment_proof_url} target="_blank" rel="noopener noreferrer">
                      <Image
                        src={order.payment_proof_url}
                        alt="Payment proof"
                        width={160}
                        height={220}
                        className="rounded-lg border border-gray-200 object-contain cursor-zoom-in max-h-40 w-auto"
                      />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Order notes */}
            {order.notes && (
              <div className="grid grid-cols-2 px-6 py-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes:</span>
                <span className="text-sm text-gray-700">{order.notes}</span>
              </div>
            )}

            {/* Order status */}
            <div className="grid grid-cols-2 items-center px-6 py-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status:</span>
              <OrderStatusBadge status={order.status} size="sm" />
            </div>
          </div>
        </div>

        {/* Billing / Shipping addresses */}
        {(order.buyer_name ?? order.buyer_email) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Billing address */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4">Billing address</h3>
              <address className="not-italic text-sm text-gray-700 space-y-1">
                {order.buyer_name && <p>{order.buyer_name}</p>}
                {order.buyer_email && <p>{order.buyer_email}</p>}
                {order.buyer_phone && <p>{order.buyer_phone}</p>}
              </address>
            </div>

            {/* Shipping address */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4">Shipping address</h3>
              <address className="not-italic text-sm text-gray-700 space-y-1">
                {order.buyer_name && <p>{order.buyer_name}</p>}
                {order.buyer_email && <p>{order.buyer_email}</p>}
                {order.buyer_phone && <p>{order.buyer_phone}</p>}
                {order.fulfillment_type === "pickup" && (
                  <p className="text-xs text-gray-500 mt-1 italic">In-store pickup selected</p>
                )}
              </address>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
