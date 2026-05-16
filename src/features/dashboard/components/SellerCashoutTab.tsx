"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Loader2, Wallet, CheckCircle2, Clock, ArrowDownToLine, Info,
} from "lucide-react"

type CashoutRequest = {
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
  history: CashoutRequest[]
}

type Props = { fiatSymbol: string }

export function SellerCashoutTab({ fiatSymbol }: Props) {
  const [data, setData]       = useState<CashoutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount]   = useState("")
  const [notes, setNotes]     = useState("")
  const [submitting, setSubmitting] = useState(false)

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
      toast.error("Failed to load cashout data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRequest = async () => {
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    if (data && parsed > data.available + 0.01) {
      toast.error(`Amount exceeds available balance of ${fmt(data.available)}`)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/seller/cashout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
        },
        body: JSON.stringify({ amount: parsed, notes: notes.trim() || undefined }),
      })
      const json = await res.json() as { success: boolean; error?: string }
      if (!json.success) throw new Error(json.error ?? "Failed")
      toast.success("Cashout request submitted — the admin will review and transfer funds.")
      setAmount("")
      setNotes("")
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request")
    } finally {
      setSubmitting(false)
    }
  }

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
      {/* Balance overview */}
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
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Available</p>
            <p className="text-3xl font-black text-blue-600 mt-1">{fmt(data?.available ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">Ready to request</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Settled</p>
            <p className="text-3xl font-black text-amber-600 mt-1">{fmt(data?.settledAmount ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-1">Transferred to you</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending notice */}
      {hasPending && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            You have a pending cashout of <span className="font-semibold">{fmt(data!.pendingAmount)}</span> awaiting admin transfer.
            Once settled, the balance will update and you can request again.
          </p>
        </div>
      )}

      {/* Request form */}
      <Card className="bg-white shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-gray-900">Request Cashout</h3>
          </div>

          {(data?.available ?? 0) <= 0 ? (
            <p className="text-sm text-gray-500">
              {hasPending
                ? "Your current balance is tied up in a pending request. Wait for the admin to settle it."
                : "No available balance yet. Earnings appear here once buyers complete payment."}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="cashout-amount">Amount to request</Label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-semibold">{fiatSymbol}</span>
                  <Input
                    id="cashout-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    max={data?.available}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="max-w-[160px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(String(data?.available?.toFixed(2) ?? ""))}
                  >
                    Max
                  </Button>
                </div>
                <p className="text-xs text-gray-400">Available: {fmt(data?.available ?? 0)}</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="cashout-notes">Payment details <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Textarea
                  id="cashout-notes"
                  rows={2}
                  placeholder="e.g. GCash: 09XX XXX XXXX — Juan Dela Cruz"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <p className="text-xs text-gray-400">Tell the admin where to send the funds.</p>
              </div>

              <Button
                onClick={handleRequest}
                disabled={submitting || !amount}
                className="bg-primary hover:bg-primary/90"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>
                  : <><ArrowDownToLine className="h-4 w-4 mr-2" />Request Cashout</>}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {(data?.history ?? []).length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-900">Cashout History</h3>
          {data!.history.map((req) => (
            <Card key={req.id} className={req.status === "settled" ? "border-green-100" : "border-amber-100"}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{fmt(req.amount)}</span>
                    {req.status === "settled" ? (
                      <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Settled
                      </Badge>
                    ) : (
                      <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                        <Clock className="h-3 w-3 mr-1" />Pending
                      </Badge>
                    )}
                  </div>
                  {req.notes && <p className="text-xs text-gray-500 truncate">{req.notes}</p>}
                  {req.admin_note && (
                    <p className="text-xs text-blue-600 italic">Admin: {req.admin_note}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    Requested {new Date(req.created_at).toLocaleDateString()}
                    {req.settled_at && ` · Settled ${new Date(req.settled_at).toLocaleDateString()}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
