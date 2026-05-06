"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Gavel, Clock, Search, ArrowUpRight, X } from "lucide-react"
import { useApp } from "@/components/shared/app-provider"

interface Auction {
  id: string
  title: string
  description: string
  starting_price: number
  current_bid: number
  min_bid_increment: number
  start_time: string
  end_time: string
  status: string
  product_name: string
  image_url: string
  seller_name: string
  business_name: string
}

type AuctionFilter = "all" | "live" | "upcoming" | "ended"

export default function AuctionsPage() {
  const { isAuthenticated, requireAuth, fiatSymbol } = useApp()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<AuctionFilter>("all")
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAuctions = async () => {
    try {
      const response = await fetch("/api/auctions")
      const data = await response.json()
      if (data.success) {
        setAuctions(data.auctions)
      }
    } catch (error) {
      console.error("Failed to fetch auctions:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuctions()
  }, [])

  const handleJoinAuction = async (auctionId: string) => {
    if (!requireAuth()) {
      return
    }

    try {
      const response = await fetch(`/api/auctions/${auctionId}/join`, {
        method: "POST",
      })
      const data = await response.json()
      if (data.success) {
        alert("Successfully joined the auction!")
        fetchAuctions()
      } else {
        alert(data.error || "Failed to join auction")
      }
    } catch (error) {
      console.log(error)
      alert("Failed to join auction")
    }
  }

  const filteredAuctions = useMemo(() => {
    let result = [...auctions]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.product_name.toLowerCase().includes(query) ||
          a.seller_name.toLowerCase().includes(query)
      )
    }

    if (activeTab !== "all") {
      result = result.filter((a) => a.status === activeTab)
    }

    return result
  }, [searchQuery, activeTab, auctions])

  const hasActiveFilters = searchQuery.trim() !== "" || activeTab !== "all"

  const clearFilters = () => {
    setSearchQuery("")
    setActiveTab("all")
  }

  const getTimeRemaining = (endTime: string) => {
    const end = new Date(endTime)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    if (diff <= 0) return "Ended"
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Live Auctions</h1>
          <p className="text-gray-600 mt-1">Bid on rare collectibles, sealed products, and exclusive items from verified sellers.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search auctions..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AuctionFilter)} className="w-auto">
            <TabsList className="bg-white p-1">
              <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-white">All</TabsTrigger>
              <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-white">Live Now</TabsTrigger>
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-primary data-[state=active]:text-white">Upcoming</TabsTrigger>
              <TabsTrigger value="ended" className="data-[state=active]:bg-primary data-[state=active]:text-white">Ended</TabsTrigger>
            </TabsList>
          </Tabs>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-600">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            Showing <span className="font-medium text-gray-900">{filteredAuctions.length}</span> of {auctions.length} auctions
          </p>
        </div>

        {/* Auction Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading auctions...</p>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <Card className="bg-white shadow-md">
            <CardContent className="p-12 text-center">
              <Gavel className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">No auctions found</h3>
              <p className="text-gray-600 mt-1">
                {hasActiveFilters ? "Try adjusting your filters" : "Check back later for new auctions"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4 border-2" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAuctions.map((auction) => (
              <Card key={auction.id} className="bg-white shadow-md hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gradient-to-br from-amber-50 to-white flex items-center justify-center relative">
                  {auction.image_url ? (
                    <img src={auction.image_url} alt={auction.title} className="h-full w-full object-cover" />
                  ) : (
                    <Gavel className="h-16 w-16 text-amber-400" />
                  )}
                  <Badge 
                    className="absolute top-3 right-3" 
                    variant={auction.status === "active" ? "default" : "secondary"}
                  >
                    {auction.status === "active" ? "Live" : auction.status === "upcoming" ? "Upcoming" : "Ended"}
                  </Badge>
                  {auction.status === "active" && (
                    <div className="absolute top-3 left-3">
                      <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    </div>
                  )}
                </div>
                <CardHeader className="pt-5">
                  <CardTitle className="text-lg text-gray-900">{auction.title}</CardTitle>
                  <CardDescription className="text-gray-600">
                    {auction.business_name || auction.seller_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Current Bid</span>
                      <span className="text-2xl font-bold text-primary">{fiatSymbol}{auction.current_bid.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Starting Bid</span>
                      <span className="font-medium text-gray-900">{fiatSymbol}{auction.starting_price.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getTimeRemaining(auction.end_time)}
                      </span>
                    </div>
                    <Button
                      className="w-full mt-2"
                      disabled={auction.status !== "active" && auction.status !== "upcoming"}
                      onClick={() => handleJoinAuction(auction.id)}
                    >
                      {isAuthenticated ? (auction.status === "active" ? "Join Auction" : "Get Notified") : "Sign In to Join"}
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
