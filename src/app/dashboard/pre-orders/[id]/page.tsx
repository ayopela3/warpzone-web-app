"use client"

export const runtime = "edge"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Package, Loader2, Calendar, CheckCircle2, LockKeyhole, Clock, AlertTriangle, Wallet, Banknote } from "lucide-react"
import { useApp } from "@/components/shared/app-provider"
import { preOrdersApi, walletApi } from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { PreOrder, PreOrderReservation } from "@/types"

/** Human-readable allocation status labels */
const ALLOCATION_LABEL: Record<string, { label: string; className: string }> = {
  pending:     { label: "Pending Allocation",  className: "bg-amber-50 text-amber-700 border-amber-200" },
  allocated:   { label: "Allocated",           className: "bg-green-50 text-green-700 border-green-200" },
  shortlisted: { label: "Cut from Allocation", className: "bg-red-50 text-red-700 border-red-200" },
  refunded:    { label: "Refunded",            className: "bg-gray-50 text-gray-500 border-gray-200" },
}

export default function PreOrderDetailPage() {
  const { isAuthenticated, fiatSymbol } = useApp()
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [preOrder,     setPreOrder]     = useState<PreOrder | null>(null)
  const [reservation,  setReservation]  = useState<PreOrderReservation | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [refundLoading, setRefundLoading] = useState(false)
  const [refundRequested, setRefundRequested] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!params.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await preOrdersApi.myReservationDetail(params.id)
      if (data.success) {
        setPreOrder(data.preOrder)
        setReservation(data.reservation)
      } else {
        setError("Pre-order reservation not found.")
      }
    } catch {
      setError("Failed to load pre-order details.")
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (!isAuthenticated) router.push("/auth/signin")
  }, [isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) fetchDetail()
  }, [isAuthenticated, fetchDetail])

  if (!isAuthenticated) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !preOrder || !reservation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">{error ?? "Pre-order not found."}</p>
        <Link href="/dashboard" className="text-primary text-sm hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  const reservedOn   = new Date(reservation.reserved_at).toLocaleDateString("en-PH", {
    month: "long", day: "numeric", year: "numeric",
  })
  const releaseDate  = preOrder.release_date
    ? new Date(preOrder.release_date).toLocaleDateString("en-PH", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null

  const isDownpayment = Boolean(preOrder.downpayment_amount && preOrder.downpayment_amount > 0)
  const lineTotal     = (preOrder.price ?? 0) * reservation.quantity
  const allocationCfg = ALLOCATION_LABEL[reservation.allocation_status ?? "pending"]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Pre-Order Details</h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 space-y-6">

        {/* Summary sentence */}
        <p className="text-sm text-gray-600">
          Pre-order{" "}
          <span className="font-bold text-primary">{preOrder.title}</span>
          {" "}was reserved on{" "}
          <span className="font-semibold text-gray-800">{reservedOn}</span>
          {" "}and is currently{" "}
          <span className="font-semibold text-gray-800">{allocationCfg?.label ?? reservation.allocation_status}</span>.
        </p>

        {/* Product card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Product</h2>
          </div>
          <div className="p-6 flex items-center gap-5">
            <div className="relative h-20 w-20 shrink-0 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
              {preOrder.image_url ? (
                <Image
                  src={preOrder.image_url}
                  alt={preOrder.title}
                  fill
                  className="object-contain"
                  sizes="80px"
                />
              ) : (
                <Package className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{preOrder.title}</p>
                {preOrder.game && (
                  <Badge variant="outline" className="text-xs">{preOrder.game}</Badge>
                )}
                <Badge className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 border-amber-200 font-semibold uppercase">
                  Pre-Order
                </Badge>
                {preOrder.status === "closed" ? (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <LockKeyhole className="h-3 w-3" /> Closed
                  </Badge>
                ) : (
                  <Badge className="bg-green-500 text-white text-xs flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </Badge>
                )}
              </div>
              {preOrder.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{preOrder.description}</p>
              )}
              {releaseDate && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Expected release: {releaseDate}
                </p>
              )}
              {(preOrder.seller_business ?? preOrder.seller_name) && (
                <p className="text-xs text-gray-500">
                  Seller: {preOrder.seller_business ?? preOrder.seller_name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Reservation details card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Reservation details</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Column headers */}
            <div className="grid grid-cols-2 px-6 py-3 bg-gray-50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</span>
            </div>

            {/* Item row */}
            <div className="grid grid-cols-2 items-center gap-4 px-6 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-12 w-12 rounded-md bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {preOrder.image_url ? (
                    <Image
                      src={preOrder.image_url}
                      alt={preOrder.title}
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
                    {preOrder.title} &times; {reservation.quantity}
                  </p>
                  <Badge className="mt-1 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 border-amber-200 font-semibold uppercase">
                    Pre-Order
                  </Badge>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {fiatSymbol}{lineTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Subtotal */}
            <div className="grid grid-cols-2 px-6 py-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtotal:</span>
              <span className="text-sm text-gray-800">
                {fiatSymbol}{lineTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Down-payment row — shown only when pre-order uses downpayment model */}
            {isDownpayment && (
              <div className="grid grid-cols-2 px-6 py-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Downpayment (paid now):</span>
                <span className="text-sm text-gray-800">
                  {fiatSymbol}{((preOrder.downpayment_amount ?? 0) * reservation.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Remaining balance */}
            {isDownpayment && (
              <div className="grid grid-cols-2 px-6 py-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Remaining Balance:</span>
                <span className="text-sm text-gray-800">
                  {fiatSymbol}{(reservation.remaining_balance ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Full price */}
            {isDownpayment && (
              <div className="grid grid-cols-2 px-6 py-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Price:</span>
                <span className="text-sm font-bold text-gray-900">
                  {fiatSymbol}{((preOrder.full_price ?? 0) * reservation.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Total (for non-downpayment pre-orders) */}
            {!isDownpayment && (
              <div className="grid grid-cols-2 px-6 py-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total:</span>
                <span className="text-sm font-bold text-gray-900">
                  {fiatSymbol}{lineTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Payment status */}
            <div className="grid grid-cols-2 items-center px-6 py-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Downpayment Paid:</span>
              <span className="text-sm">
                {reservation.downpayment_paid
                  ? <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Paid</span>
                  : <span className="text-amber-600 font-medium flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Pending</span>}
              </span>
            </div>

            {/* Allocation status */}
            <div className="grid grid-cols-2 items-center px-6 py-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Allocation Status:</span>
              <Badge
                variant="outline"
                className={`${allocationCfg?.className ?? ""} text-xs w-fit`}
              >
                {allocationCfg?.label ?? reservation.allocation_status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Shortlisted (cut) — wallet/refund choice */}
        {reservation.allocation_status === 'shortlisted' && !refundRequested && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 px-5 py-5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-700 text-base">You&apos;ve been cut from the allocation</p>
                <p className="text-sm text-red-600 mt-1">
                  Unfortunately you did not receive a slot for <strong>{preOrder.title}</strong>.
                  Your paid amount of{" "}
                  <strong>{fiatSymbol}{(reservation.total_paid ?? (preOrder.price ?? 0) * reservation.quantity).toLocaleString()}</strong>{" "}
                  has been added to your shop credit.
                </p>
              </div>
            </div>
            <p className="text-sm font-medium text-red-700">What would you like to do with your shop credit?</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 rounded-lg border border-green-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="h-4 w-4 text-green-600" />
                  <p className="font-semibold text-green-700 text-sm">Keep as Shop Credit</p>
                </div>
                <p className="text-xs text-gray-500">Use your balance for future purchases or pre-orders in the shop.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 border-green-300 text-green-700 hover:bg-green-50 w-full"
                  onClick={() => toast.success('Your credit is saved — use it on your next purchase.')}
                >
                  Keep Credit
                </Button>
              </div>
              <div className="flex-1 rounded-lg border border-amber-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="h-4 w-4 text-amber-600" />
                  <p className="font-semibold text-amber-700 text-sm">Request Cash Refund</p>
                </div>
                <p className="text-xs text-gray-500">Ask the seller to return your money directly. They will be notified.</p>
                <Button
                  size="sm"
                  className="mt-3 bg-amber-500 hover:bg-amber-600 text-white w-full"
                  disabled={refundLoading}
                  onClick={async () => {
                    if (!reservation.id) return
                    setRefundLoading(true)
                    try {
                      const res = await walletApi.requestRefund(reservation.id)
                      if (!res.success) throw new Error(res.error)
                      setRefundRequested(true)
                      toast.success('Cash refund requested — the seller has been notified.')
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Failed to request refund')
                    } finally {
                      setRefundLoading(false)
                    }
                  }}
                >
                  {refundLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Request Cash Refund'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Refund requested confirmation */}
        {reservation.allocation_status === 'shortlisted' && refundRequested && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-700">Cash refund requested</p>
              <p className="text-sm text-green-600 mt-0.5">The seller has been notified and will process your refund.</p>
            </div>
          </div>
        )}

        {/* Info notice — only for non-cut reservations */}
        {reservation.allocation_status !== 'shortlisted' && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
            <p className="font-medium mb-0.5">What happens next?</p>
            <p className="text-blue-600 text-xs">
              Once the pre-order closes and stock is allocated, you will be notified to pay the remaining balance.
              Your reservation is guaranteed as long as your downpayment has been received.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
