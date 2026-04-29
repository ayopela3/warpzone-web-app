"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Gavel, Clock, Users, TrendingUp, Search, ArrowUpRight, X } from "lucide-react"
import { useApp } from "@/components/shared/app-provider"

interface Auction {
  id: number
  name: string
  currentBid: number
  startingBid: number
  endTime: string
  bids: number
  watchers: number
  status: string
  category: string
}

const auctions: Auction[] = [
  {
    id: 1,
    name: "PSA 10 Umbreon VMAX Alt Art",
    currentBid: 1180,
    startingBid: 800,
    endTime: "2h 14m",
    bids: 28,
    watchers: 91,
    status: "live",
    category: "Pokemon Slab",
  },
  {
    id: 2,
    name: "Sealed Evolving Skies Booster Box",
    currentBid: 640,
    startingBid: 450,
    endTime: "5h 40m",
    bids: 17,
    watchers: 64,
    status: "live",
    category: "Sealed Product",
  },
  {
    id: 3,
    name: "The One Ring Borderless Foil",
    currentBid: 220,
    startingBid: 150,
    endTime: "Starts tomorrow",
    bids: 0,
    watchers: 32,
    status: "upcoming",
    category: "Magic",
  },
]

type AuctionFilter = "all" | "live" | "upcoming" | "ended"

export default function AuctionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<AuctionFilter>("all")
  const { requireAuth } = useApp()

  const filteredAuctions = useMemo(() => {
    let result = [...auctions]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.category.toLowerCase().includes(query)
      )
    }

    if (activeTab !== "all") {
      result = result.filter((a) => a.status === activeTab)
    }

    return result
  }, [searchQuery, activeTab])

  const hasActiveFilters = searchQuery.trim() !== "" || activeTab !== "all"

  const clearFilters = () => {
    setSearchQuery("")
    setActiveTab("all")
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <h1 className="text-3xl font-black">Live Auctions</h1>
          <p className="mt-1 text-neutral-600">Bid on slabs, sealed products, rare singles, and weekly collector lots.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {/* Search and Filters */}
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
              <TabsTrigger value="live">Live Now</TabsTrigger>
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

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{filteredAuctions.length}</span> of {auctions.length} auctions
          </p>
        </div>

        {/* Auction Grid */}
        {filteredAuctions.length === 0 ? (
          <div className="text-center py-12">
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No auctions found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters ? "Try adjusting your filters" : "Check back later for new auctions"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAuctions.map((auction) => (
              <Card key={auction.id} className="border-neutral-200 bg-white py-0 shadow-sm transition hover:-translate-y-1 hover:border-black hover:shadow-xl">
                <div className="h-40 bg-[linear-gradient(135deg,#fff7cc,#ffffff)] flex items-center justify-center relative">
                  <Gavel className="h-16 w-16 text-amber-400" />
                  <Badge 
                    className="absolute top-3 right-3" 
                    variant={auction.status === "live" ? "default" : "secondary"}
                  >
                    {auction.status === "live" ? "Live" : "Upcoming"}
                  </Badge>
                  {auction.status === "live" && (
                    <div className="absolute top-3 left-3">
                      <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    </div>
                  )}
                </div>
                <CardHeader className="pt-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{auction.category}</Badge>
                  </div>
                  <CardTitle className="text-lg">{auction.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Ends in {auction.endTime}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current Bid</span>
                      <span className="text-2xl font-bold text-primary">${auction.currentBid.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Starting Bid</span>
                      <span className="font-medium">${auction.startingBid.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {auction.bids} bids
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {auction.watchers} watching
                      </span>
                    </div>
                    <Button
                      className="w-full mt-2"
                      variant={auction.status === "live" ? "default" : "outline"}
                      onClick={() => {
                        if (!requireAuth()) {
                          return
                        }

                        window.alert(
                          auction.status === "live"
                            ? `Bid flow opened for ${auction.name}.`
                            : `You will be notified for ${auction.name}.`
                        )
                      }}
                    >
                        {auction.status === "live" ? "Place Bid" : "Notify Me"}
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
