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

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Pending approval</h3>
          <div className="space-y-3">
            {pending.map((s) => (
              <SellerRow
                key={s.user_id}
                seller={s}
                actioning={actioning === s.user_id}
                onApprove={() => handleAction(s.user_id, "approve")}
                onReject={() => handleAction(s.user_id, "reject")}
              />
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 py-10 text-center">
          <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-neutral-600">No pending applications</p>
        </div>
      )}

      {/* Approved */}
      {approved.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Approved sellers</h3>
          <div className="space-y-3">
            {approved.map((s) => (
              <SellerRow
                key={s.user_id}
                seller={s}
                actioning={actioning === s.user_id}
                onApprove={() => handleAction(s.user_id, "approve")}
                onReject={() => handleAction(s.user_id, "reject")}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SellerRow({
  seller,
  actioning,
  onApprove,
  onReject,
}: {
  seller: SellerEntry
  actioning: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const isPending = seller.role === "pending-seller"

  return (
    <div className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Store className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-neutral-900 truncate">{seller.full_name}</p>
        {seller.business_name && (
          <p className="text-xs text-neutral-500 truncate">{seller.business_name}</p>
        )}
        <p className="text-xs text-neutral-400 truncate">{seller.email}</p>
        {(seller.city || seller.province) && (
          <p className="text-xs text-neutral-400">{[seller.city, seller.province].filter(Boolean).join(", ")}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
          isPending
            ? "bg-amber-50 text-amber-700 border border-amber-200"
            : "bg-green-50 text-green-700 border border-green-200"
        }`}>
          {isPending ? "Pending" : "Approved"}
        </span>
        {isPending ? (
          <>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={onApprove}
              disabled={actioning}
            >
              {actioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle className="h-3 w-3 mr-1" />Approve</>}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
              onClick={onReject}
              disabled={actioning}
            >
              <XCircle className="h-3 w-3 mr-1" />Reject
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
            onClick={onReject}
            disabled={actioning}
          >
            <XCircle className="h-3 w-3 mr-1" />Revoke
          </Button>
        )}
      </div>
    </div>
  )
}
