"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Gavel, Search, X } from "lucide-react"
import { toast } from "sonner"
import { useApp } from "@/components/shared/app-provider"
import { AuctionCard } from "@/features/auctions/components/AuctionCard"
import { auctionsApi } from "@/lib/api-client"
import type { Auction } from "@/types"

type AuctionFilter = "all" | "active" | "upcoming" | "ended"

export default function AuctionsPage() {
  const { isAuthenticated, requireAuth, fiatSymbol } = useApp()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<AuctionFilter>("all")
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAuctions = async () => {
    try {
      const data = await auctionsApi.list()
      if (data.success) setAuctions(data.auctions ?? [])
    } catch (error) {
      console.error("Failed to fetch auctions:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAuctions() }, [])

  const handleJoin = async (auctionId: string) => {
    if (!requireAuth()) return
    const data = await auctionsApi.join(auctionId)
    if (data.success) {
      toast.success("You're registered! We'll notify you when the auction goes live.")
      fetchAuctions()
    } else {
      const msg = data.error ?? "Failed to register"
      if (msg.includes("already participating")) {
        toast.info("You're already registered for this auction.")
      } else {
        toast.error(msg)
      }
    }
  }

  const filtered = useMemo(() => {
    let result = [...auctions]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          (a.seller_name ?? "").toLowerCase().includes(q)
      )
    }
    if (activeTab !== "all") result = result.filter((a) => a.status === activeTab)
    return result
  }, [searchQuery, activeTab, auctions])

  const hasActiveFilters = searchQuery.trim() !== "" || activeTab !== "all"
  const clearFilters = () => { setSearchQuery(""); setActiveTab("all") }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <p className="label-meta mb-2 text-foreground">Auction Block</p>
          <h1 className="text-3xl font-black text-foreground">Live Auctions</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Bid on rare collectibles, sealed products, and exclusive items from verified sellers.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search auctions..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AuctionFilter)} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Live Now</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="ended">Ended</TabsTrigger>
            </TabsList>
          </Tabs>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <p className="label-meta mb-4 text-muted-foreground">
          Showing <span className="text-foreground">{filtered.length}</span> of {auctions.length} auctions
        </p>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading auctions...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Gavel className="mx-auto mb-4 h-16 w-16 text-muted-foreground/45" />
              <h3 className="text-xl font-semibold text-foreground">No auctions found</h3>
              <p className="mt-1 text-muted-foreground">
                {hasActiveFilters ? "Try adjusting your filters" : "Check back later for new auctions"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                fiatSymbol={fiatSymbol}
                isAuthenticated={isAuthenticated}
                onJoin={handleJoin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
