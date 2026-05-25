"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Loader2, ArrowRight, LockKeyhole, CheckCircle2, Eye, Clock, XCircle } from "lucide-react"
import { preOrdersApi } from "@/lib/api-client"
import type { PreOrderReservation } from "@/types"

const ALLOCATION_LABELS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending:    { label: "Pending",   color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  allocated:  { label: "Allocated", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle2 },
  shortlisted:{ label: "Cut",       color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
  refunded:   { label: "Refunded",  color: "bg-gray-50 text-gray-500 border-gray-200", icon: LockKeyhole },
}

type Props = { fiatSymbol: string }

export function UserPreOrdersTab({ fiatSymbol }: Props) {
  const [reservations, setReservations] = useState<PreOrderReservation[]>([])
  const [loading, setLoading]           = useState(true)

  const fetchReservations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await preOrdersApi.myReservations()
      if (data.success) setReservations(data.reservations)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReservations() }, [fetchReservations])

  if (loading) {
    return (
      <Card className="bg-white shadow-md">
        <CardContent className="p-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
        </CardContent>
      </Card>
    )
  }

  if (reservations.length === 0) {
    return (
      <Card className="bg-white shadow-md">
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <Package className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mt-6 text-xl font-semibold text-gray-900">No pre-orders reserved</h3>
          <p className="mt-2 text-gray-600">Reserve upcoming card releases to see them here</p>
          <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-white">
            <Link href="/pre-order" prefetch={false}>Browse Pre-Orders</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1.5fr_1.2fr_1.2fr_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pre-Order</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Release Date</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {reservations.map((r) => {
            const allocationCfg = ALLOCATION_LABELS[r.allocation_status ?? "pending"]
            const AllocationIcon = allocationCfg.icon
            return (
              <div
                key={r.id}
                className="grid grid-cols-[2fr_1.5fr_1.2fr_1.2fr_auto] gap-4 px-5 py-4 items-center hover:bg-gray-50 transition-colors"
              >
                {/* Pre-Order title + game */}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-primary truncate">{r.title ?? "Pre-Order"}</p>
                  {r.game && (
                    <span className="text-xs text-gray-500">{r.game} &middot; Qty: {r.quantity}</span>
                  )}
                </div>

                {/* Release date */}
                <span className="text-sm text-gray-700">
                  {r.release_date
                    ? new Date(r.release_date).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })
                    : "—"}
                </span>

                {/* Status badge - now using allocation_status */}
                <div>
                  <Badge variant="outline" className={`${allocationCfg.color} text-xs flex items-center gap-1 w-fit`}>
                    <AllocationIcon className="h-3 w-3" />
                    {allocationCfg.label}
                  </Badge>
                </div>

                {/* Price */}
                <span className="text-sm font-semibold text-gray-900">
                  {fiatSymbol}{(r.price ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>

                {/* Actions */}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100 gap-1.5"
                >
                  <Link href={`/dashboard/pre-orders/${r.pre_order_id}`} prefetch={false}>
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
          <Link href="/pre-order">
            Browse More Pre-Orders <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
