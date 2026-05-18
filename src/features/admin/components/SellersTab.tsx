"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle, XCircle, Loader2, Store, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type SellerEntry = {
  user_id: string
  email: string
  created_at: string
  full_name: string
  business_name: string | null
  phone_number: string | null
  city: string | null
  province: string | null
  role: string
}

const sessionIdKey = "warpzone-session-id"

export function SellersTab() {
  const [sellers, setSellers] = useState<SellerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)

  const fetchSellers = useCallback(async () => {
    setLoading(true)
    try {
      const sessionId = typeof window !== "undefined" ? window.localStorage.getItem(sessionIdKey) : null
      const res = await fetch("/api/admin/sellers", {
        headers: { Authorization: `Bearer ${sessionId}` },
      })
      const data = await res.json()
      if (data.success) setSellers(data.sellers)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSellers() }, [fetchSellers])

  const handleAction = async (userId: string, action: "approve" | "reject") => {
    setActioning(userId)
    try {
      const sessionId = typeof window !== "undefined" ? window.localStorage.getItem(sessionIdKey) : null
      const res = await fetch("/api/admin/sellers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify({ userId, action }),
      })
      const data = await res.json()
      if (data.success) {
        setSellers((prev) =>
          prev.map((s) => s.user_id === userId ? { ...s, role: data.role } : s)
        )
      }
    } finally {
      setActioning(null)
    }
  }

  const pending  = sellers.filter((s) => s.role === "pending-seller")
  const approved = sellers.filter((s) => s.role === "seller")

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Seller Applications</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            {pending.length} pending &middot; {approved.length} approved
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSellers}>
          <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Pending table */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Pending approval</h3>
          <SellerTable sellers={pending} actioning={actioning} onAction={handleAction} />
        </div>
      )}

      {pending.length === 0 && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 py-10 text-center">
          <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-neutral-600">No pending applications</p>
        </div>
      )}

      {/* Approved table */}
      {approved.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Approved sellers</h3>
          <SellerTable sellers={approved} actioning={actioning} onAction={handleAction} />
        </div>
      )}
    </div>
  )
}

function SellerTable({
  sellers,
  actioning,
  onAction,
}: {
  sellers: SellerEntry[]
  actioning: string | null
  onAction: (userId: string, action: "approve" | "reject") => void
}) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
        <span className="w-9" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Seller</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</span>
      </div>

      <div className="divide-y divide-gray-100">
        {sellers.map((s) => {
          const isPending = s.role === "pending-seller"
          const isActioning = actioning === s.user_id
          return (
            <div key={s.user_id} className="grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors">
              {/* Icon */}
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Store className="h-4 w-4 text-primary" />
              </div>
              {/* Name + business */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{s.full_name}</p>
                {s.business_name && <p className="text-xs text-gray-400 truncate">{s.business_name}</p>}
              </div>
              {/* Email */}
              <p className="text-sm text-gray-600 truncate">{s.email}</p>
              {/* Location */}
              <p className="text-sm text-gray-500 truncate">
                {[s.city, s.province].filter(Boolean).join(", ") || "—"}
              </p>
              {/* Status badge */}
              <span className={`text-xs font-bold rounded-full px-2.5 py-1 w-fit ${
                isPending
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}>
                {isPending ? "Pending" : "Approved"}
              </span>
              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isPending && (
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => onAction(s.user_id, "approve")}
                    disabled={isActioning}
                  >
                    {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle className="h-3 w-3" />Approve</>}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                  onClick={() => onAction(s.user_id, "reject")}
                  disabled={isActioning}
                >
                  <XCircle className="h-3 w-3" />{isPending ? "Reject" : "Revoke"}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
