"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar, Package, Search, X, Loader2, CheckCircle2,
  Users, Clock, Tag, LockKeyhole,
} from "lucide-react"
import { toast } from "sonner"
import { useApp } from "@/components/shared/app-provider"
import { preOrdersApi } from "@/lib/api-client"
import type { PreOrder } from "@/types"

const GAME_OPTIONS = ["All", "Pokemon", "MTG", "Yu-Gi-Oh!", "Plushies", "Accessories", "Other"]

type StatusFilter = "all" | "active" | "closed"

export default function PreOrderPage() {
  const { requireAuth, fiatSymbol, isAuthenticated } = useApp()

  const [preOrders, setPreOrders] = useState<PreOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [reservingId, setReservingId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<StatusFilter>("all")
  const [gameFilter, setGameFilter] = useState("All")

  const fetchPreOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await preOrdersApi.list()
      if (data.success) setPreOrders(data.preOrders)
    } catch {
      toast.error("Failed to load pre-orders")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPreOrders() }, [fetchPreOrders])

  const filtered = useMemo(() => {
    let result = [...preOrders]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((p) => p.title.toLowerCase().includes(q) || p.game.toLowerCase().includes(q))
    }
    if (activeTab !== "all") {
      result = result.filter((p) => p.status === activeTab)
    }
    if (gameFilter !== "All") {
      result = result.filter((p) => p.game === gameFilter)
    }
    return result
  }, [preOrders, searchQuery, activeTab, gameFilter])

  const hasFilters = searchQuery.trim() !== "" || activeTab !== "all" || gameFilter !== "All"

  const clearFilters = () => {
    setSearchQuery("")
    setActiveTab("all")
    setGameFilter("All")
  }

  const handleReserve = async (preOrder: PreOrder) => {
    if (!requireAuth()) return
    if (preOrder.user_reserved) {
      toast.info("You already have a reservation for this pre-order.")
      return
    }
    setReservingId(preOrder.id)
    try {
      const result = await preOrdersApi.reserve(preOrder.id, 1)
      if (!result.success) throw new Error(result.error ?? "Failed to reserve")
      toast.success(`Reserved: ${preOrder.title}`)
      setPreOrders((prev) =>
        prev.map((p) =>
          p.id === preOrder.id
            ? { ...p, user_reserved: true, user_quantity: 1, reservation_count: (p.reservation_count ?? 0) + 1 }
            : p
        )
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reserve")
    } finally {
      setReservingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <h1 className="text-3xl font-black">Pre-order Upcoming Releases</h1>
          <p className="mt-1 text-neutral-600">Reserve booster boxes, bundles, and sealed releases before launch day.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {/* Info banner */}
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-4">
            <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">How Pre-Orders Work</p>
              <p className="text-sm text-gray-600 mt-0.5">
                Reserve an item now to guarantee your slot. Pay when the item arrives — pick up
                in-store or contact the seller to arrange shipping.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search pre-orders..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-1.5 flex-wrap">
            {GAME_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGameFilter(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  gameFilter === g
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 shrink-0">
              <X className="h-4 w-4 mr-1" />Clear
            </Button>
          )}
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Showing <span className="font-semibold text-gray-800">{filtered.length}</span> of {preOrders.length} pre-orders
        </p>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-gray-500">Loading pre-orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800">No pre-orders found</h3>
            <p className="text-sm text-gray-500 mt-1">
              {hasFilters ? "Try adjusting your filters." : "No pre-orders are currently available. Check back soon!"}
            </p>
            {hasFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((po) => {
              const isClosed    = po.status === "closed"
              const isFull      = po.max_slots !== null && (po.reservation_count ?? 0) >= po.max_slots
              const isReserved  = po.user_reserved === true
              const isReserving = reservingId === po.id
              const slotsLeft   = po.max_slots !== null ? po.max_slots - (po.reservation_count ?? 0) : null

              return (
                <Card
                  key={po.id}
                  className={`bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col ${isClosed ? "opacity-70" : ""}`}
                >
                  {/* Image */}
                  <div className="relative h-48 bg-gradient-to-br from-amber-50 to-white rounded-t-lg overflow-hidden flex items-center justify-center">
                    {po.image_url ? (
                      <Image src={po.image_url} alt={po.title} fill className="object-contain" />
                    ) : (
                      <Package className="h-16 w-16 text-primary/30" />
                    )}
                    {/* Status badge overlay */}
                    <div className="absolute top-2 right-2">
                      {isClosed ? (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <LockKeyhole className="h-3 w-3" />Closed
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500 text-white text-xs">Active</Badge>
                      )}
                    </div>
                    {isReserved && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-primary text-white text-xs flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />Reserved
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 flex flex-col flex-1 gap-3">
                    {/* Game tag */}
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">
                        <Tag className="h-3 w-3 mr-1" />{po.game}
                      </Badge>
                      {(po.seller_business ?? po.seller_name) && (
                        <span className="text-xs text-gray-400">by {po.seller_business ?? po.seller_name}</span>
                      )}
                    </div>

                    {/* Title + price */}
                    <div>
                      <h3 className="font-black text-gray-900 leading-tight">{po.title}</h3>
                      {po.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{po.description}</p>
                      )}
                      <p className="text-xl font-black text-primary mt-2">
                        {fiatSymbol}{po.price.toLocaleString()}
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Releases {new Date(po.release_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {po.reservation_count ?? 0} reserved
                      </span>
                    </div>

                    {/* Slots */}
                    {slotsLeft !== null && !isClosed && (
                      <p className={`text-xs font-medium flex items-center gap-1 ${slotsLeft <= 5 ? "text-red-600" : "text-amber-600"}`}>
                        <Clock className="h-3 w-3" />
                        {slotsLeft <= 0 ? "No slots remaining" : `${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} left`}
                      </p>
                    )}

                    {/* CTA */}
                    <div className="mt-auto pt-1">
                      {isReserved ? (
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white" disabled>
                          <CheckCircle2 className="h-4 w-4 mr-2" />Your slot is reserved
                        </Button>
                      ) : isClosed || isFull ? (
                        <Button className="w-full" variant="outline" disabled>
                          <LockKeyhole className="h-4 w-4 mr-2" />{isFull ? "Fully Reserved" : "Closed"}
                        </Button>
                      ) : (
                        <Button
                          className="w-full bg-primary hover:bg-primary/90 text-white"
                          onClick={() => handleReserve(po)}
                          disabled={isReserving || !isAuthenticated}
                        >
                          {isReserving
                            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reserving…</>
                            : isAuthenticated ? "Reserve Now" : "Sign in to Reserve"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
