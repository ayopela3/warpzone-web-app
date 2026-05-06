"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Gavel, Trophy, DollarSign, ShoppingBag, ArrowRight } from "lucide-react"

type Stats = {
  totalOrders: number
  activeBids: number
  tournaments: number
  totalSpent: number
}

type Props = { fiatSymbol: string }

export function UserDashboard({ fiatSymbol }: Props) {
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, activeBids: 0, tournaments: 0, totalSpent: 0 })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/user/stats", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
      },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d.stats) })
      .catch(console.error)
      .finally(() => setStatsLoading(false))
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

          {(["orders", "auctions", "tournaments"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 capitalize">
                  {tab === "orders" ? "Recent Orders" : tab === "auctions" ? "Active Bids" : "Registered Tournaments"}
                </h2>
                <Link href={`/dashboard/${tab}`}>
                  <Button variant="outline" size="sm" className="border-2">
                    View All <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <Card className="bg-white shadow-md">
                <CardContent className="p-12 text-center">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    {tab === "orders" ? <ShoppingBag className="h-8 w-8 text-gray-400" />
                      : tab === "auctions" ? <Gavel className="h-8 w-8 text-gray-400" />
                      : <Trophy className="h-8 w-8 text-gray-400" />}
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-900">
                    {tab === "orders" ? "No orders yet" : tab === "auctions" ? "No active bids" : "No tournaments yet"}
                  </h3>
                  <p className="mt-2 text-gray-600">
                    {tab === "orders" ? "Start shopping to see your orders here"
                      : tab === "auctions" ? "Join auctions to see your active bids here"
                      : "Register for tournaments to see them here"}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
