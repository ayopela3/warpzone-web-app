"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, CheckCircle2, Clock, ArrowDownToLine, RefreshCw } from "lucide-react"
import { sellerRefundsApi } from "@/lib/api-client"

type RefundRow = {
  id: string
  user_id: string
  type: string
  amount: number
  reservation_id: string | null
  note: string | null
  created_at: string
  buyer_name: string | null
  buyer_email: string | null
  user_email: string | null
  pre_order_title: string | null
}

type Props = { fiatSymbol: string }

export function SellerRefundsTab({ fiatSymbol }: Props) {
  const [refunds, setRefunds]       = useState<RefundRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [showSettled, setShowSettled] = useState(false)
  const [settlingId, setSettlingId] = useState<string | null>(null)

  const fmt = (n: number) =>
    `${fiatSymbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const fetchRefunds = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sellerRefundsApi.list(showSettled)
      if (data.success) {
        setRefunds(data.refunds as RefundRow[])
      }
    } catch {
      toast.error("Failed to load refund requests")
    } finally {
      setLoading(false)
    }
  }, [showSettled])

  useEffect(() => { fetchRefunds() }, [fetchRefunds])

  const handleSettle = async (row: RefundRow) => {
    setSettlingId(row.id)
    try {
      const res = await sellerRefundsApi.settle(row.id)
      if (!res.success) throw new Error(res.error ?? "Failed")
      toast.success(`Refund of ${fmt(row.amount)} marked as settled for ${row.buyer_name ?? row.buyer_email ?? "buyer"}`)
      await fetchRefunds()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to settle refund")
    } finally {
      setSettlingId(null)
    }
  }

  const pending = refunds.filter((r) => r.type === "refund_request")
  const settled = refunds.filter((r) => r.type === "refunded")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Refund Requests</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Buyers who were cut from a pre-order allocation and requested a cash refund.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={fetchRefunds} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettled((v) => !v)}>
            {showSettled ? "Hide Settled" : "Show Settled"}
          </Button>
        </div>
      </div>

      {/* Summary card */}
      {pending.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {pending.length} pending refund{pending.length > 1 ? "s" : ""} totalling{" "}
            <strong>{fmt(pending.reduce((s, r) => s + r.amount, 0))}</strong>
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : pending.length === 0 && (!showSettled || settled.length === 0) ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">No pending refund requests</p>
            <p className="text-sm text-gray-400 mt-1">
              Cut buyers will appear here if they request a cash refund instead of keeping shop credit.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Pending */}
          {pending.length > 0 && (
            <>
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Awaiting Your Transfer</h3>
              {pending.map((row) => (
                <Card key={row.id} className="border-l-4 border-l-amber-400">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900">
                            {row.buyer_name ?? row.buyer_email ?? row.user_email ?? "Unknown buyer"}
                          </p>
                          <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                            <Clock className="h-3 w-3 mr-1" />Pending
                          </Badge>
                        </div>
                        {row.pre_order_title && (
                          <p className="text-sm text-gray-500 mt-0.5 truncate">{row.pre_order_title}</p>
                        )}
                        <p className="text-2xl font-black text-gray-900 mt-1">{fmt(row.amount)}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Requested {new Date(row.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0 bg-primary hover:bg-primary/90 gap-1.5"
                        disabled={settlingId === row.id}
                        onClick={() => handleSettle(row)}
                      >
                        {settlingId === row.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <ArrowDownToLine className="h-3.5 w-3.5" />}
                        Mark Refunded
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {/* Settled history */}
          {showSettled && settled.length > 0 && (
            <>
              <h3 className="font-bold text-gray-500 text-sm uppercase tracking-wider pt-2">Settled</h3>
              {settled.map((row) => (
                <Card key={row.id} className="border-green-100 opacity-70">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-700">
                            {row.buyer_name ?? row.buyer_email ?? row.user_email ?? "Unknown buyer"}
                          </p>
                          <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Refunded
                          </Badge>
                        </div>
                        {row.pre_order_title && (
                          <p className="text-sm text-gray-400 mt-0.5 truncate">{row.pre_order_title}</p>
                        )}
                        <p className="text-xl font-black text-gray-600 mt-1">{fmt(row.amount)}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Settled {new Date(row.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
