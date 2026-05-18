"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Loader2, CheckCircle2, AlertCircle, Info,
  Gavel, Package, ChevronDown, ChevronUp, Receipt,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeeRow = {
  id: string
  source_type: string
  source_id: string
  description: string
  gross_amount: number
  fee_rate: number
  fee_amount: number
  status: "unpaid" | "paid"
  paid_at: string | null
  created_at: string
}

type FeeSummary = {
  total_unpaid: number
  total_paid: number
  total_all: number
  unpaid_count: number
  paid_count: number
}

type FilterOption = "all" | "unpaid" | "paid"

type Props = { fiatSymbol: string }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SellerFeesTab({ fiatSymbol }: Props) {
  const [fees,    setFees]    = useState<FeeRow[]>([])
  const [summary, setSummary] = useState<FeeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<FilterOption>("all")
  const [showAll, setShowAll] = useState(false)

  const fmt = (n: number) =>
    `${fiatSymbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const fetchFees = useCallback(async (status: FilterOption = "all") => {
    setLoading(true)
    try {
      const qs = status !== "all" ? `?status=${status}` : ""
      const res = await fetch(`/api/seller/service-fees${qs}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}` },
      })
      const data = await res.json() as { success: boolean; fees: FeeRow[]; summary: FeeSummary; error?: string }
      if (data.success) {
        setFees(data.fees)
        setSummary(data.summary)
      } else {
        toast.error(data.error ?? "Failed to load fees")
      }
    } catch {
      toast.error("Failed to load platform fees")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFees(filter) }, [fetchFees, filter])

  const visibleFees = showAll ? fees : fees.slice(0, 10)

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Outstanding Fees</p>
            <p className="text-3xl font-black text-red-600 mt-1">{fmt(summary?.total_unpaid ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {summary?.unpaid_count ?? 0} unpaid transaction{summary?.unpaid_count !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-400">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Already Settled</p>
            <p className="text-3xl font-black text-green-600 mt-1">{fmt(summary?.total_paid ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {summary?.paid_count ?? 0} settled transaction{summary?.paid_count !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-300">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Billed</p>
            <p className="text-3xl font-black text-gray-700 mt-1">{fmt(summary?.total_all ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">All-time platform fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding balance banner */}
      {(summary?.total_unpaid ?? 0) > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800">
            You have <span className="font-bold">{fmt(summary!.total_unpaid)}</span> in outstanding platform fees.
            The admin will mark these as settled once payment is received.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
          <p className="text-sm text-green-800">All platform fees are settled. You&apos;re up to date!</p>
        </div>
      )}

      {/* Info note */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800">
          Platform fees are automatically recorded when orders are confirmed or pre-order slots are marked as paid.
          Contact the admin to settle outstanding balances.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-gray-500" />
          Fee History
        </h3>
        <div className="ml-auto flex gap-1.5">
          {(["all", "unpaid", "paid"] as FilterOption[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              className={`h-7 text-xs capitalize ${filter === f ? "bg-primary text-white" : ""}`}
              onClick={() => { setFilter(f); setShowAll(false) }}
            >
              {f === "all" ? "All" : f === "unpaid" ? "Outstanding" : "Settled"}
            </Button>
          ))}
        </div>
      </div>

      {/* Fee table */}
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
        {/* Table header */}
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-6" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross / Rate</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Fee</span>
        </div>

        {fees.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Receipt className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No fee records</p>
            <p className="text-xs text-gray-400 mt-1">
              {filter === "unpaid" ? "No outstanding fees — you're all settled up." : "Platform fees will appear here once transactions are confirmed."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visibleFees.map((fee) => (
              <div
                key={fee.id}
                className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors"
              >
                {/* Source icon */}
                <div className="p-1.5 rounded-md bg-gray-50 border w-6 flex items-center justify-center">
                  {fee.source_type === "auction"
                    ? <Gavel className="h-3.5 w-3.5 text-purple-500" />
                    : <Package className="h-3.5 w-3.5 text-blue-500" />}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-800 truncate">{fee.description}</p>

                {/* Date */}
                <span className="text-sm text-gray-600">
                  {new Date(fee.created_at).toLocaleDateString(undefined, {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </span>

                {/* Type */}
                <span className="text-sm text-gray-600 capitalize">
                  {fee.source_type === "pre_order" ? "Pre-Order" : fee.source_type === "auction" ? "Auction" : "Order"}
                </span>

                {/* Gross / rate */}
                <span className="text-sm text-gray-600">
                  {fmt(fee.gross_amount)}{" "}
                  <span className="text-xs text-gray-400">@ {(fee.fee_rate * 100).toFixed(0)}%</span>
                </span>

                {/* Fee amount + badge */}
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-sm font-bold ${fee.status === "paid" ? "text-green-700" : "text-red-600"}`}>
                    {fmt(fee.fee_amount)}
                  </span>
                  {fee.status === "paid" ? (
                    <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 h-4 px-1.5">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Settled
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                      <AlertCircle className="h-2.5 w-2.5 mr-0.5" />Outstanding
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show more / less toggle */}
        {fees.length > 10 && (
          <div className="border-t border-gray-100 px-5 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-gray-500 hover:text-gray-700"
              onClick={() => setShowAll((p) => !p)}
            >
              {showAll ? (
                <><ChevronUp className="h-4 w-4 mr-1" />Show less</>
              ) : (
                <><ChevronDown className="h-4 w-4 mr-1" />Show {fees.length - 10} more</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
