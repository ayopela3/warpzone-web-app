"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, CheckCircle2, Clock, Info, TrendingUp } from "lucide-react"

type PayoutRecord = {
  id: string
  amount: number
  notes: string | null
  status: string
  settled_at: string | null
  admin_note: string | null
  created_at: string
}

type CashoutData = {
  netEarnings: number
  settledAmount: number
  pendingAmount: number
  available: number
  history: PayoutRecord[]
}

type Props = { fiatSymbol: string }

export function SellerCashoutTab({ fiatSymbol }: Props) {
  const [data, setData]       = useState<CashoutData | null>(null)
  const [loading, setLoading] = useState(true)

  const fmt = (n: number) =>
    `${fiatSymbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/seller/cashout", {
        headers: { Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}` },
      })
      const json = await res.json() as CashoutData & { success: boolean }
      if (json.success) setData(json)
    } catch {
      toast.error("Failed to load earnings data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    )
  }

  const hasPending = data && data.pendingAmount > 0

  return (
    <div className="space-y-6">
      {/* Earnings overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-400">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Earned</p>
            <p className="text-3xl font-black text-green-600 mt-1">{fmt(data?.netEarnings ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">After platform fees</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Awaiting Payout</p>
            <p className="text-3xl font-black text-blue-600 mt-1">{fmt(data?.available ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">Admin will transfer this to you</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Paid Out</p>
            <p className="text-3xl font-black text-amber-600 mt-1">{fmt(data?.settledAmount ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">Already transferred to you</p>
          </CardContent>
        </Card>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800">
          {hasPending
            ? <>You have <span className="font-semibold">{fmt(data!.pendingAmount)}</span> pending transfer. The admin will settle this shortly.</>
            : "Payouts are issued by the admin. Your available balance will be transferred to you automatically after each settlement cycle."}
        </p>
      </div>

      {/* Payout history */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-gray-500" />
          Payout History
        </h3>

        {(data?.history ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Clock className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No payouts yet</p>
              <p className="text-xs text-gray-400 mt-1">Your payout history will appear here once the admin issues a transfer.</p>
            </CardContent>
          </Card>
        ) : (
          data!.history.map((rec) => (
            <Card key={rec.id} className={rec.status === "settled" ? "border-green-100" : "border-amber-100"}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{fmt(rec.amount)}</span>
                    {rec.status === "settled" ? (
                      <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Settled
                      </Badge>
                    ) : (
                      <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                        <Clock className="h-3 w-3 mr-1" />Pending
                      </Badge>
                    )}
                  </div>
                  {rec.admin_note && (
                    <p className="text-xs text-blue-600 italic">Note: {rec.admin_note}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    Issued {new Date(rec.created_at).toLocaleDateString()}
                    {rec.settled_at && ` · Settled ${new Date(rec.settled_at).toLocaleDateString()}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
