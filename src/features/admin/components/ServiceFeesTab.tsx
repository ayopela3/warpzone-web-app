"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Loader2, CheckCircle2, ChevronDown, ChevronUp,
  Gavel, Package, DollarSign,
} from "lucide-react"

type FeeSummary = {
  seller_id: string
  seller_name: string
  seller_business: string | null
  total_unpaid: number
  total_paid: number
  total_all: number
  unpaid_count: number
}

type FeeRow = {
  id: string
  seller_id: string
  source_type: string
  source_id: string
  description: string
  gross_amount: number
  fee_rate: number
  fee_amount: number
  status: string
  paid_at: string | null
  created_at: string
}

type EndedAuction = {
  id: string
  title: string
  seller_name: string
  seller_business: string | null
  current_bid: number
  end_time: string
  fee_recorded: number
}

type Props = { fiatSymbol: string }

export function ServiceFeesTab({ fiatSymbol }: Props) {
  const [summary, setSummary]               = useState<FeeSummary[]>([])
  const [fees, setFees]                     = useState<FeeRow[]>([])
  const [loading, setLoading]               = useState(true)
  const [expandedSeller, setExpanded]       = useState<string | null>(null)
  const [markingId, setMarkingId]           = useState<string | null>(null)
  const [showPaid, setShowPaid]             = useState(false)
  const [endedAuctions, setEndedAuctions]   = useState<EndedAuction[]>([])
  const [settlingId, setSettlingId]         = useState<string | null>(null)

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
  })

  const fetchFees = useCallback(async () => {
    setLoading(true)
    try {
      const [feesRes, auctionsRes] = await Promise.all([
        fetch("/api/admin/service-fees", { headers: authHeader() }),
        fetch("/api/auctions", { headers: authHeader() }),
      ])
      const feesData = await feesRes.json() as { success: boolean; summary: FeeSummary[]; fees: FeeRow[] }
      const auctionsData = await auctionsRes.json() as { success: boolean; auctions: EndedAuction[] }

      if (feesData.success) { setSummary(feesData.summary); setFees(feesData.fees) }
      if (auctionsData.success) {
        const now = new Date()
        setEndedAuctions(
          auctionsData.auctions.filter(
            (a) => new Date(a.end_time) < now && !a.fee_recorded
          )
        )
      }
    } catch {
      toast.error("Failed to load service fees")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFees() }, [fetchFees])

  const handleSettleAuction = async (auction: EndedAuction) => {
    setSettlingId(auction.id)
    try {
      const res = await fetch(`/api/auctions/${auction.id}/settle`, {
        method: "POST",
        headers: authHeader(),
      })
      const data = await res.json() as { success: boolean; feeAmount?: number; error?: string }
      if (!data.success) throw new Error(data.error ?? "Failed")
      toast.success(`Auction settled — ${fmt(data.feeAmount ?? 0)} fee recorded`)
      await fetchFees()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to settle auction")
    } finally {
      setSettlingId(null)
    }
  }

  const fmt = (n: number) => `${fiatSymbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const handleMarkAllPaid = async (sellerId: string, sellerName: string) => {
    setMarkingId(sellerId)
    try {
      const res = await fetch(`/api/admin/service-fees/${sellerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
        },
        body: JSON.stringify({ action: "mark_paid_all_for_seller", seller_id: sellerId }),
      })
      const data = await res.json() as { success: boolean }
      if (!data.success) throw new Error()
      toast.success(`All fees for ${sellerName} marked as paid`)
      await fetchFees()
    } catch {
      toast.error("Failed to mark fees as paid")
    } finally {
      setMarkingId(null)
    }
  }

  const handleMarkOnePaid = async (feeId: string) => {
    setMarkingId(feeId)
    try {
      const res = await fetch(`/api/admin/service-fees/${feeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
        },
        body: JSON.stringify({ action: "mark_paid" }),
      })
      const data = await res.json() as { success: boolean }
      if (!data.success) throw new Error()
      toast.success("Fee marked as paid")
      await fetchFees()
    } catch {
      toast.error("Failed to mark fee as paid")
    } finally {
      setMarkingId(null)
    }
  }

  const totalUnpaid = summary.reduce((s, r) => s + r.total_unpaid, 0)
  const totalPaid   = summary.reduce((s, r) => s + r.total_paid, 0)

  const visibleSummary = showPaid ? summary : summary.filter((s) => s.total_unpaid > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Service Fees</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            5% on pre-order transactions · 10% on auction settlements. Deducted from seller earnings.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPaid((v) => !v)}>
          {showPaid ? "Hide Paid" : "Show All"}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Outstanding</p>
            <p className="text-3xl font-black text-red-600 mt-1">{fmt(totalUnpaid)}</p>
            <p className="text-xs text-gray-400 mt-1">Across {summary.filter((s) => s.unpaid_count > 0).length} seller(s)</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-400">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Collected</p>
            <p className="text-3xl font-black text-green-600 mt-1">{fmt(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">All Time Fees</p>
            <p className="text-3xl font-black text-blue-600 mt-1">{fmt(totalUnpaid + totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <>
        {/* ── Unsettled ended auctions ─────────────────────────── */}
        {endedAuctions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Gavel className="h-4 w-4 text-purple-600" />
              <h3 className="font-bold text-gray-800">Ended Auctions — Pending Settlement ({endedAuctions.length})</h3>
            </div>
            <p className="text-xs text-gray-500 -mt-1">
              Record the 10% service fee for each ended auction. This locks the record and adds it to the seller&apos;s outstanding balance.
            </p>
            {endedAuctions.map((auction) => (
              <Card key={auction.id} className="border-purple-100">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Gavel className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{auction.title}</p>
                    <p className="text-xs text-gray-400">
                      {auction.seller_business ?? auction.seller_name} ·
                      Final bid: <span className="font-bold text-gray-700">{fmt(auction.current_bid)}</span> ·
                      10% fee: <span className="font-bold text-purple-700">{fmt(auction.current_bid * 0.1)}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Ended {new Date(auction.end_time).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                    disabled={settlingId === auction.id}
                    onClick={() => handleSettleAuction(auction)}
                  >
                    {settlingId === auction.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <DollarSign className="h-3.5 w-3.5" />}
                    Settle
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {visibleSummary.length === 0 && endedAuctions.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
              <p className="font-semibold text-gray-700">No outstanding fees</p>
              <p className="text-sm text-gray-400 mt-1">All seller fees are settled.</p>
            </CardContent>
          </Card>
        )}

        {/* Seller summary table */}
        {visibleSummary.length > 0 && (
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Seller</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Settled</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Billed</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</span>
            </div>

            <div className="divide-y divide-gray-100">
              {visibleSummary.map((seller) => {
                const isExpanded = expandedSeller === seller.seller_id
                const sellerFees = fees.filter((f) => f.seller_id === seller.seller_id)

                return (
                  <div key={seller.seller_id}>
                    {/* Summary row */}
                    <div className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors ${isExpanded ? "bg-gray-50" : ""}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{seller.seller_business ?? seller.seller_name}</p>
                        {seller.seller_business && <p className="text-xs text-gray-400 truncate">{seller.seller_name}</p>}
                        <p className="text-xs text-gray-400">{seller.unpaid_count} unpaid fee(s)</p>
                      </div>
                      <span className={`text-sm font-bold ${seller.total_unpaid > 0 ? "text-red-600" : "text-gray-400"}`}>
                        {fmt(seller.total_unpaid)}
                      </span>
                      <span className="text-sm font-semibold text-green-700">{fmt(seller.total_paid)}</span>
                      <span className="text-sm text-gray-700">{fmt(seller.total_all)}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {seller.total_unpaid > 0 && (
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs"
                            disabled={markingId === seller.seller_id}
                            onClick={() => handleMarkAllPaid(seller.seller_id, seller.seller_business ?? seller.seller_name)}
                          >
                            {markingId === seller.seller_id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <DollarSign className="h-3.5 w-3.5" />}
                            Mark All Paid
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpanded(isExpanded ? null : seller.seller_id)}
                          className="inline-flex items-center gap-1.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors"
                        >
                          Details {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded: per-fee table */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/50">
                        {sellerFees.length === 0 ? (
                          <p className="px-5 py-4 text-sm text-gray-400">No fee records found.</p>
                        ) : (
                          <>
                            <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_auto] gap-3 px-8 py-2 border-b border-gray-100">
                              <span className="w-6" />
                              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Description</span>
                              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date</span>
                              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Gross / Rate</span>
                              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Fee</span>
                              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Action</span>
                            </div>
                            {sellerFees.map((fee) => (
                              <div
                                key={fee.id}
                                className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_auto] gap-3 px-8 py-2.5 items-center border-b border-gray-100 last:border-0 hover:bg-white transition-colors"
                              >
                                <div className="p-1 rounded bg-white border w-6 flex items-center justify-center">
                                  {fee.source_type === "auction"
                                    ? <Gavel className="h-3 w-3 text-purple-500" />
                                    : <Package className="h-3 w-3 text-blue-500" />}
                                </div>
                                <p className="text-sm text-gray-800 truncate">{fee.description}</p>
                                <span className="text-xs text-gray-500">{new Date(fee.created_at).toLocaleDateString()}</span>
                                <span className="text-xs text-gray-500">{fmt(fee.gross_amount)} @ {(fee.fee_rate * 100).toFixed(0)}%</span>
                                <span className={`text-sm font-bold ${fee.status === "paid" ? "text-green-700" : "text-red-600"}`}>{fmt(fee.fee_amount)}</span>
                                {fee.status === "paid" ? (
                                  <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 h-5 px-1.5 whitespace-nowrap">
                                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                    Paid {fee.paid_at ? new Date(fee.paid_at).toLocaleDateString() : ""}
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs shrink-0 bg-green-600 hover:bg-green-700 text-white"
                                    disabled={markingId === fee.id}
                                    onClick={() => handleMarkOnePaid(fee.id)}
                                  >
                                    {markingId === fee.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Paid"}
                                  </Button>
                                )}
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        </>
      )}
    </div>
  )
}
