"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useDynamicCategories } from "@/hooks/useDynamicCategories"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar, Package, Search, X, Loader2, CheckCircle2,
  Users, Clock, Tag, LockKeyhole, ShoppingCart, Minus, Plus as PlusIcon, Info,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useApp } from "@/components/shared/app-provider"
import { preOrdersApi } from "@/lib/api-client"
import type { PreOrder } from "@/types"

type StatusFilter = "all" | "active" | "closed"

export default function PreOrderPage() {
  const { requireAuth, fiatSymbol, isAuthenticated, addToCart, cartItems } = useApp()
  const { categories: dynamicCategories } = useDynamicCategories()

  const [preOrders, setPreOrders] = useState<PreOrder[]>([])
  const [loading, setLoading] = useState(true)
  /** Track per-card quantity before adding to cart */
  const [quantities, setQuantities] = useState<Record<string, number>>({})

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
      result = result.filter((p) =>
        p.game.toLowerCase() === gameFilter.toLowerCase() ||
        p.game.toLowerCase() === (dynamicCategories.find((c) => c.label === gameFilter)?.slug ?? gameFilter).toLowerCase()
      )
    }
    return result
  }, [preOrders, searchQuery, activeTab, gameFilter, dynamicCategories])

  const hasFilters = searchQuery.trim() !== "" || activeTab !== "all" || gameFilter !== "All"

  const clearFilters = () => {
    setSearchQuery("")
    setActiveTab("all")
    setGameFilter("All")
  }

  const getQty = (id: string) => quantities[id] ?? 1

  const adjustQty = (id: string, delta: number, max?: number | null) => {
    setQuantities((prev) => {
      const next = Math.max(1, (prev[id] ?? 1) + delta)
      if (max !== null && max !== undefined && next > max) return prev
      return { ...prev, [id]: next }
    })
  }

  const handleAddToCart = async (preOrder: PreOrder) => {
    if (!requireAuth()) return
    const qty = getQty(preOrder.id)

    /** Create or update the DB reservation first — seller count should reflect real reservations */
    try {
      const result = await preOrdersApi.reserve(preOrder.id, qty)
      if (!result.success) {
        toast.error(result.error ?? "Failed to reserve slot")
        return
      }
    } catch {
      toast.error("Failed to reserve pre-order slot")
      return
    }

    addToCart(
      {
        id:          preOrder.id,
        name:        preOrder.title,
        price:       preOrder.price,
        category:    preOrder.game,
        itemType:    "pre_order",
        preOrderId:  preOrder.id,
        seller_id:   preOrder.seller_id ?? undefined,
      },
      qty,
      preOrder.max_slots ?? undefined
    )

    toast.success(`${preOrder.title} ×${qty} added to cart`)

    /** Refresh reservation count from server so the displayed count is accurate */
    fetchPreOrders()
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <p className="label-meta mb-2 text-foreground">Pre-orders</p>
          <h1 className="text-3xl font-black">Pre-order Upcoming Releases</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Reserve booster boxes, bundles, and sealed releases before launch day.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-2 lg:px-8">
        {/* Info button */}
        <Link href="/pre-orders/how-it-works">
          <div className="mb-4 flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:border-foreground">
            <div className="shrink-0 rounded-md border border-border bg-background p-1.5">
              <Info className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">How Pre-Orders Work</p>
              <p className="text-xs text-muted-foreground truncate">
                Down payments, allocation, cancellations, and more.
              </p>
            </div>
            <div className="hidden whitespace-nowrap text-xs font-semibold text-foreground underline sm:block">
              Learn more →
            </div>
          </div>
        </Link>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            {/* Static "All" pill */}
            <button
              type="button"
              onClick={() => setGameFilter("All")}
              className={`h-10 rounded-full border px-3 text-xs font-bold transition ${
                gameFilter === "All"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {/* Dynamic category pills */}
            {dynamicCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setGameFilter(cat.label)}
                className={`h-10 rounded-full border px-3 text-xs font-bold transition ${
                  gameFilter === cat.label
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 text-muted-foreground">
              <X className="h-4 w-4 mr-1" />Clear
            </Button>
          )}
        </div>

        <p className="label-meta mb-4 text-muted-foreground">
          Showing <span className="text-foreground">{filtered.length}</span> of {preOrders.length} pre-orders
        </p>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading pre-orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/45" />
            <h3 className="text-lg font-semibold text-foreground">No pre-orders found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
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
              const isReserved  = cartItems.some((c) => c.id === po.id)
              const slotsLeft   = po.max_slots !== null ? po.max_slots - (po.reservation_count ?? 0) : null

              return (
                <Card
                  key={po.id}
                  className={`card-interactive flex flex-col overflow-hidden ${isClosed ? "opacity-70" : ""}`}
                >
                  {/* Image — links to detail page */}
                  <Link href={`/pre-order/${po.id}`} className="block">
                    <div className="relative flex h-48 items-center justify-center overflow-hidden bg-muted">
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
                          <Badge className="flex items-center gap-1 bg-primary text-xs text-primary-foreground">
                            <CheckCircle2 className="h-3 w-3" />Reserved
                          </Badge>
                        </div>
                      )}
                    </div>
                  </Link>

                  <CardContent className="p-4 flex flex-col flex-1 gap-3">
                    {/* Game tag */}
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="border-border bg-card text-xs text-foreground">
                        <Tag className="h-3 w-3 mr-1" />{po.game}
                      </Badge>
                      {(po.seller_business ?? po.seller_name) && (
                        <span className="text-xs text-muted-foreground">by {po.seller_business ?? po.seller_name}</span>
                      )}
                    </div>

                    {/* Title + price */}
                    <div>
                      <Link href={`/pre-order/${po.id}`} className="hover:underline">
                        <h3 className="font-black leading-tight text-foreground">{po.title}</h3>
                      </Link>
                      {po.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{po.description}</p>
                      )}
                      <p className="price mt-2 text-xl text-foreground">
                        {fiatSymbol}{po.price.toLocaleString()}
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Releases {new Date(po.release_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      {/* <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {po.reservation_count ?? 0} reserved
                      </span> */}
                    </div>

                    {/* Slots */}
                    {slotsLeft !== null && !isClosed && (
                      <p className={`text-xs font-medium flex items-center gap-1 ${slotsLeft <= 5 ? "text-red-600" : "text-amber-600"}`}>
                        <Clock className="h-3 w-3" />
                        {slotsLeft <= 0 ? "No slots remaining" : `${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} left`}
                      </p>
                    )}

                    {/* CTA */}
                    <div className="mt-auto pt-1 space-y-2">
                      {isReserved ? (
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white" disabled>
                          <CheckCircle2 className="h-4 w-4 mr-2" />Added to cart
                        </Button>
                      ) : isClosed || isFull ? (
                        <Button className="w-full" variant="outline" disabled>
                          <LockKeyhole className="h-4 w-4 mr-2" />{isFull ? "Fully Reserved" : "Closed"}
                        </Button>
                      ) : (
                        <>
                          {/* Quantity picker */}
                          <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                            <span className="label-meta text-muted-foreground">Qty</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => adjustQty(po.id, -1)}
                                className="h-6 w-6 rounded-full border border-border flex items-center justify-center hover:bg-muted transition"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center text-sm font-bold">{getQty(po.id)}</span>
                              <button
                                type="button"
                                onClick={() => adjustQty(po.id, 1, po.max_slots !== null ? po.max_slots - (po.reservation_count ?? 0) : null)}
                                className="h-6 w-6 rounded-full border border-border flex items-center justify-center hover:bg-muted transition"
                              >
                                <PlusIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <Button
                            className="w-full font-bold"
                            onClick={() => handleAddToCart(po)}
                            disabled={!isAuthenticated}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            {isAuthenticated ? "Add to Cart" : "Sign in to Order"}
                          </Button>
                        </>
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
