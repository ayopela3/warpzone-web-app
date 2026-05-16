"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Loader2, CheckCircle2, Clock, DollarSign, AlertCircle,
} from "lucide-react"

type CashoutRow = {
  id: string
  seller_id: string
  seller_name: string
  seller_business: string | null
  amount: number
  notes: string | null
  status: string
  settled_at: string | null
  admin_note: string | null
  created_at: string
}

type Props = { fiatSymbol: string }

export function CashoutsTab({ fiatSymbol }: Props) {
  const [cashouts, setCashouts]     = useState<CashoutRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [showAll, setShowAll]       = useState(false)
  const [settlingId, setSettlingId] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [pendingTotal, setPendingTotal] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  const fmt = (n: number) =>
    `${fiatSymbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
  })

  const fetchCashouts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/cashouts?status=${showAll ? "all" : "pending"}`, {
        headers: authHeader(),
      })
      const data = await res.json() as {
        success: boolean
        cashouts: CashoutRow[]
        pendingTotal: number
        pendingCount: number
      }
      if (data.success) {
        setCashouts(data.cashouts)
        setPendingTotal(data.pendingTotal)
        setPendingCount(data.pendingCount)
      }
    } catch {
      toast.error("Failed to load cashout requests")
    } finally {
      setLoading(false)
    }
  }, [showAll])

  useEffect(() => { fetchCashouts() }, [fetchCashouts])

  const handleSettle = async (cashout: CashoutRow) => {
    setSettlingId(cashout.id)
    try {
      const res = await fetch(`/api/admin/cashouts/${cashout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          action: "settle",
          admin_note: adminNotes[cashout.id]?.trim() || undefined,
        }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) throw new Error(data.error ?? "Failed")
      toast.success(`Cashout of ${fmt(cashout.amount)} settled for ${cashout.seller_business ?? cashout.seller_name}`)
      await fetchCashouts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to settle cashout")
    } finally {
      setSettlingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Cashout Requests</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Sellers request payouts here. Transfer funds to the seller then mark as settled.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show Pending" : "Show All"}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pending Transfers</p>
            <p className="text-3xl font-black text-red-600 mt-1">{fmt(pendingTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">Across {pendingCount} request(s)</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-400">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Action Required</p>
            <p className="text-3xl font-black text-green-600 mt-1">{pendingCount}</p>
            <p className="text-xs text-gray-400 mt-1">Awaiting your transfer</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : cashouts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <p className="font-semibold text-gray-700">No pending cashout requests</p>
            <p className="text-sm text-gray-400 mt-1">All seller payouts are settled.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cashouts.map((cashout) => (
            <Card
              key={cashout.id}
              className={cashout.status === "settled" ? "border-green-100" : "border-red-100"}
            >
              <CardContent className="p-4 space-y-3">
                {/* Seller + amount row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900">
                        {cashout.seller_business ?? cashout.seller_name}
                      </p>
                      {cashout.seller_business && (
                        <p className="text-xs text-gray-400">({cashout.seller_name})</p>
                      )}
                      {cashout.status === "pending" ? (
                        <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                          <Clock className="h-3 w-3 mr-1" />Pending
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Settled
                        </Badge>
                      )}
                    </div>
                    <p className="text-2xl font-black text-gray-900 mt-1">{fmt(cashout.amount)}</p>
                    {cashout.notes && (
                      <div className="flex items-start gap-1.5 mt-1">
                        <AlertCircle className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-700 font-medium">{cashout.notes}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Requested {new Date(cashout.created_at).toLocaleString()}
                      {cashout.settled_at && ` · Settled ${new Date(cashout.settled_at).toLocaleString()}`}
                    </p>
                    {cashout.admin_note && (
                      <p className="text-xs text-gray-500 italic mt-0.5">Note: {cashout.admin_note}</p>
                    )}
                  </div>
                </div>

                {/* Settle controls */}
                {cashout.status === "pending" && (
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Input
                      placeholder="Optional note (e.g. GCash ref #)"
                      value={adminNotes[cashout.id] ?? ""}
                      onChange={(e) =>
                        setAdminNotes((prev) => ({ ...prev, [cashout.id]: e.target.value }))
                      }
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      className="shrink-0 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                      disabled={settlingId === cashout.id}
                      onClick={() => handleSettle(cashout)}
                    >
                      {settlingId === cashout.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <DollarSign className="h-3.5 w-3.5" />}
                      Mark Settled
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
