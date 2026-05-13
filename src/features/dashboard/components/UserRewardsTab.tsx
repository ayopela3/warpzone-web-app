"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Star, Gift, Loader2, CheckCircle2, Clock, XCircle, Package,
} from "lucide-react"

type RewardItem = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  points_cost: number
  stock: number | null
}

type PointsEntry = {
  id: string
  type: string
  points: number
  note: string | null
  created_at: string
}

type Redemption = {
  id: string
  reward_item_id: string
  item_name: string
  item_image_url: string | null
  points_spent: number
  status: string
  note: string | null
  created_at: string
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
})

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:   <Clock className="h-3.5 w-3.5 text-amber-500" />,
  fulfilled: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  cancelled: <XCircle className="h-3.5 w-3.5 text-red-500" />,
}

type Props = { balance: number; onBalanceChange: () => void }

export function UserRewardsTab({ balance, onBalanceChange }: Props) {
  const [items, setItems]             = useState<RewardItem[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [history, setHistory]         = useState<PointsEntry[]>([])
  const [loading, setLoading]         = useState(true)
  const [claimingId, setClaimingId]   = useState<string | null>(null)
  const [view, setView]               = useState<"catalogue" | "history">("catalogue")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [itemsRes, pointsRes, redemptionsRes] = await Promise.all([
        fetch("/api/reward-items", { headers: authHeaders() }),
        fetch("/api/user/points", { headers: authHeaders() }),
        fetch("/api/user/redemptions", { headers: authHeaders() }),
      ])
      const [itemsData, pointsData, redData] = await Promise.all([
        itemsRes.json() as Promise<{ success: boolean; rewardItems: RewardItem[] }>,
        pointsRes.json() as Promise<{ success: boolean; balance: number; history: PointsEntry[] }>,
        redemptionsRes.json() as Promise<{ success: boolean; redemptions: Redemption[] }>,
      ])
      if (itemsData.success) setItems(itemsData.rewardItems)
      if (pointsData.success) setHistory(pointsData.history)
      if (redData.success) setRedemptions(redData.redemptions)
    } catch {
      toast.error("Failed to load rewards data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleClaim = async (item: RewardItem) => {
    if (balance < item.points_cost) {
      toast.error(`You need ${item.points_cost} pts — you only have ${balance} pts`)
      return
    }
    setClaimingId(item.id)
    try {
      const res = await fetch(`/api/reward-items/${item.id}/redeem`, {
        method: "POST",
        headers: authHeaders(),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) throw new Error(data.error ?? "Failed")
      toast.success(`Claimed "${item.name}"! The admin will fulfil your request shortly.`)
      onBalanceChange()
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Claim failed")
    } finally {
      setClaimingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Sub-nav */}
      <div className="flex gap-2">
        <Button
          size="sm" variant={view === "catalogue" ? "default" : "outline"}
          onClick={() => setView("catalogue")}
          className={view === "catalogue" ? "bg-primary text-white" : ""}
        >
          <Gift className="h-3.5 w-3.5 mr-1.5" /> Rewards Catalogue
        </Button>
        <Button
          size="sm" variant={view === "history" ? "default" : "outline"}
          onClick={() => setView("history")}
          className={view === "history" ? "bg-primary text-white" : ""}
        >
          <Star className="h-3.5 w-3.5 mr-1.5" /> My Claims
        </Button>
      </div>

      {view === "catalogue" && (
        <>
          {items.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Gift className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-600">No rewards available yet</p>
                <p className="text-sm text-gray-400">Check back soon!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const canClaim = balance >= item.points_cost && (item.stock === null || item.stock > 0)
                return (
                  <Card key={item.id} className={`overflow-hidden transition-shadow hover:shadow-md ${!canClaim ? "opacity-70" : ""}`}>
                    {/* Image */}
                    <div className="relative h-40 bg-gray-100 flex items-center justify-center">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.name} fill className="object-contain p-3" />
                      ) : (
                        <Package className="h-12 w-12 text-gray-300" />
                      )}
                      {item.stock !== null && item.stock <= 5 && item.stock > 0 && (
                        <Badge className="absolute top-2 right-2 text-xs bg-amber-100 text-amber-700 border-amber-200">
                          Only {item.stock} left!
                        </Badge>
                      )}
                      {item.stock === 0 && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <p className="font-bold text-gray-400">Out of Stock</p>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <p className="font-bold text-gray-900">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                          <span className="font-black text-amber-600 text-lg">{item.points_cost.toLocaleString()}</span>
                          <span className="text-xs text-gray-400">pts</span>
                        </div>
                        <Button
                          size="sm"
                          disabled={!canClaim || claimingId === item.id}
                          onClick={() => handleClaim(item)}
                          className="h-8 text-xs bg-primary hover:bg-primary/90 text-white"
                        >
                          {claimingId === item.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : canClaim ? "Claim" : "Not enough pts"}
                        </Button>
                      </div>
                      {balance < item.points_cost && item.stock !== 0 && (
                        <p className="text-xs text-gray-400">
                          You need {(item.points_cost - balance).toLocaleString()} more pts
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {view === "history" && (
        <div className="space-y-4">
          {/* Redemption claims */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Redemption Requests</h3>
            {redemptions.length === 0 ? (
              <p className="text-sm text-gray-400">No claims yet.</p>
            ) : (
              <div className="space-y-2">
                {redemptions.map((r) => (
                  <Card key={r.id} className="bg-white">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="relative h-10 w-10 bg-gray-100 rounded shrink-0 overflow-hidden">
                        {r.item_image_url
                          ? <Image src={r.item_image_url} alt={r.item_name} fill className="object-contain p-1" />
                          : <Gift className="h-5 w-5 text-gray-300 m-auto absolute inset-0" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{r.item_name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleDateString()} · {r.points_spent} pts
                        </p>
                        {r.note && <p className="text-xs text-blue-600 mt-0.5">{r.note}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {STATUS_ICON[r.status]}
                        <span className="text-xs capitalize font-medium text-gray-600">{r.status}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Points history */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Points History</h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">No points activity yet.</p>
            ) : (
              <div className="space-y-1.5">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 bg-white rounded-lg border px-3 py-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${entry.points > 0 ? "bg-green-100" : "bg-red-100"}`}>
                      <Star className={`h-3.5 w-3.5 ${entry.points > 0 ? "text-green-600" : "text-red-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{entry.note ?? entry.type}</p>
                      <p className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`font-black text-sm shrink-0 ${entry.points > 0 ? "text-green-600" : "text-red-500"}`}>
                      {entry.points > 0 ? "+" : ""}{entry.points.toLocaleString()} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
