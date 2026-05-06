"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Gavel, Trophy, DollarSign, ShoppingBag, ArrowRight, Loader2, CalendarDays, MapPin } from "lucide-react"

type Stats = {
  totalOrders: number
  activeBids: number
  tournaments: number
  totalSpent: number
}

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

type UserTournament = {
  id: string
  name: string
  description: string
  tournament_date: string
  location: string | null
  format: string | null
  prize_pool: string | null
  status: string
  player_size: number
  registered_players: number
  preregistration_fee: number
  registered_at: string
}

type Props = { fiatSymbol: string }

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
})

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  upcoming: "bg-amber-50 text-amber-700 border-amber-200",
  ended: "bg-gray-50 text-gray-500 border-gray-200",
}

export function UserDashboard({ fiatSymbol }: Props) {
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, activeBids: 0, tournaments: 0, totalSpent: 0 })
  const [statsLoading, setStatsLoading] = useState(true)
  const [auctions, setAuctions] = useState<UserAuction[]>([])
  const [auctionsLoading, setAuctionsLoading] = useState(true)
  const [tournaments, setTournaments] = useState<UserTournament[]>([])
  const [tournamentsLoading, setTournamentsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/user/stats", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d.stats) })
      .catch(console.error)
      .finally(() => setStatsLoading(false))

    fetch("/api/user/auctions", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setAuctions(d.auctions ?? []) })
      .catch(console.error)
      .finally(() => setAuctionsLoading(false))

    fetch("/api/user/tournaments", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setTournaments(d.tournaments ?? []) })
      .catch(console.error)
      .finally(() => setTournamentsLoading(false))
  }, [])

  const statVal = (n: number) => statsLoading ? "—" : n.toLocaleString()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here is your overview.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-primary text-white shadow-lg">
            <CardContent className="p-6 flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-white/90">Total Orders</p>
                <p className="text-4xl font-black mt-2">{statVal(stats.totalOrders)}</p>
                <p className="text-xs text-white/80 mt-1">All time</p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl"><Package className="h-6 w-6 text-white" /></div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-lg border-l-4 border-l-amber-500">
            <CardContent className="p-6 flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Bids</p>
                <p className="text-4xl font-bold mt-2 text-gray-900">{statVal(stats.activeBids)}</p>
                <p className="text-xs text-amber-600 mt-1">Currently bidding</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl"><Gavel className="h-6 w-6 text-amber-600" /></div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-lg border-l-4 border-l-emerald-500">
            <CardContent className="p-6 flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Tournaments</p>
                <p className="text-4xl font-bold mt-2 text-gray-900">{statVal(stats.tournaments)}</p>
                <p className="text-xs text-emerald-600 mt-1">Registered</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl"><Trophy className="h-6 w-6 text-emerald-600" /></div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-lg border-l-4 border-l-blue-500">
            <CardContent className="p-6 flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-4xl font-bold mt-2 text-gray-900">
                  {statsLoading ? "—" : `${fiatSymbol}${stats.totalSpent.toLocaleString()}`}
                </p>
                <p className="text-xs text-blue-600 mt-1">Lifetime</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl"><DollarSign className="h-6 w-6 text-blue-600" /></div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3 bg-white p-1">
            <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-white">Orders</TabsTrigger>
            <TabsTrigger value="auctions" className="data-[state=active]:bg-primary data-[state=active]:text-white">Auctions</TabsTrigger>
            <TabsTrigger value="tournaments" className="data-[state=active]:bg-primary data-[state=active]:text-white">Tournaments</TabsTrigger>
          </TabsList>

          {/* Orders tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
              <Link href="/dashboard/orders">
                <Button variant="outline" size="sm" className="border-2">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
            <Card className="bg-white shadow-md">
              <CardContent className="p-12 text-center">
                <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">No orders yet</h3>
                <p className="mt-2 text-gray-600">Start shopping to see your orders here</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auctions tab */}
          <TabsContent value="auctions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Active Bids</h2>
              <Link href="/dashboard/auctions">
                <Button variant="outline" size="sm" className="border-2">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
            {auctionsLoading ? (
              <Card className="bg-white shadow-md">
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                </CardContent>
              </Card>
            ) : auctions.length === 0 ? (
              <Card className="bg-white shadow-md">
                <CardContent className="p-12 text-center">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <Gavel className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-900">No active bids</h3>
                  <p className="mt-2 text-gray-600">Join auctions to see your active bids here</p>
                  <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-white">
                    <Link href="/auctions">Browse Auctions</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {auctions.slice(0, 5).map((auction) => (
                  <Card key={auction.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                          {auction.image_url
                            ? <img src={auction.image_url} alt={auction.title} className="w-full h-full object-contain" />
                            : <Gavel className="h-7 w-7 text-amber-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-gray-900 truncate">{auction.title}</p>
                            <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[auction.status] ?? ""}`}>
                              {auction.status === "active" ? "Live" : auction.status === "upcoming" ? "Upcoming" : "Ended"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 capitalize">{auction.category} · {auction.condition}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm text-gray-500">Current bid</span>
                            <span className="font-bold text-primary">{fiatSymbol}{(auction.current_bid || auction.starting_price).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tournaments tab */}
          <TabsContent value="tournaments" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Registered Tournaments</h2>
              <Link href="/dashboard/tournaments">
                <Button variant="outline" size="sm" className="border-2">View All <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
            {tournamentsLoading ? (
              <Card className="bg-white shadow-md">
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                </CardContent>
              </Card>
            ) : tournaments.length === 0 ? (
              <Card className="bg-white shadow-md">
                <CardContent className="p-12 text-center">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <Trophy className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-900">No tournaments yet</h3>
                  <p className="mt-2 text-gray-600">Register for tournaments to see them here</p>
                  <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-white">
                    <Link href="/tournaments">Browse Tournaments</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tournaments.slice(0, 5).map((t) => (
                  <Card key={t.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{t.name}</p>
                          <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {new Date(t.tournament_date).toLocaleDateString()}
                            </span>
                            {t.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />{t.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[t.status] ?? ""}`}>
                          {t.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
