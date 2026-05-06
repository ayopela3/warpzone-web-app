"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Gavel, ArrowLeft, Loader2 } from "lucide-react"
import { useApp } from "@/components/shared/app-provider"

type UserAuction = {
  id: string
  title: string
  category: string
  condition: string
  image_url: string | null
  starting_price: number
  current_bid: number
  status: string
  start_time: string
  end_time: string
  joined_at: string
}

type Filter = "all" | "active" | "upcoming" | "ended"

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  upcoming: "bg-amber-50 text-amber-700 border-amber-200",
  ended: "bg-gray-50 text-gray-500 border-gray-200",
}

const STATUS_LABEL: Record<string, string> = {
  active: "Live",
  upcoming: "Upcoming",
  ended: "Ended",
}

export default function DashboardAuctionsPage() {
  const { isAuthenticated, fiatSymbol } = useApp()
  const router = useRouter()
  const [auctions, setAuctions] = useState<UserAuction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/signin"); return }

    fetch("/api/user/auctions", {
      headers: { Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setAuctions(d.auctions ?? []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isAuthenticated, router])

  const filtered = filter === "all" ? auctions : auctions.filter((a) => a.status === filter)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4" />Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">My Auction Registrations</h1>
          <p className="text-gray-600 mt-1">All auctions you have joined or are watching.</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 space-y-6">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="w-auto">
          <TabsList className="bg-white p-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-white">All</TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-white">Live</TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-primary data-[state=active]:text-white">Upcoming</TabsTrigger>
            <TabsTrigger value="ended" className="data-[state=active]:bg-primary data-[state=active]:text-white">Ended</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <Card className="bg-white shadow-md">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="bg-white shadow-md">
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Gavel className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                {filter === "all" ? "No auction registrations yet" : `No ${filter} auctions`}
              </h3>
              <p className="mt-2 text-gray-600">
                {filter === "all" ? "Click \"Get Notified\" on any auction to register your interest." : "Try a different filter."}
              </p>
              {filter === "all" && (
                <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-white">
                  <Link href="/auctions">Browse Auctions</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((auction) => (
              <Card key={auction.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-4 items-center">
                    <div className="w-20 h-20 shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                      {auction.image_url
                        ? <img src={auction.image_url} alt={auction.title} className="w-full h-full object-contain" />
                        : <Gavel className="h-8 w-8 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-gray-900">{auction.title}</p>
                        <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[auction.status] ?? ""}`}>
                          {STATUS_LABEL[auction.status] ?? auction.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 capitalize mt-0.5">{auction.category} · {auction.condition}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex gap-4 text-sm">
                          <span className="text-gray-500">Starting: <span className="font-medium text-gray-700">{fiatSymbol}{auction.starting_price.toLocaleString()}</span></span>
                          <span className="text-gray-500">Current: <span className="font-bold text-primary">{fiatSymbol}{(auction.current_bid || auction.starting_price).toLocaleString()}</span></span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Ends: {new Date(auction.end_time).toLocaleString()} · Registered: {new Date(auction.joined_at).toLocaleDateString()}
                      </p>
                    </div>
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
