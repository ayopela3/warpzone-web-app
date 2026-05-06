"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, ArrowLeft, Loader2, CalendarDays, MapPin, Users, DollarSign } from "lucide-react"
import { useApp } from "@/components/shared/app-provider"

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

type Filter = "all" | "upcoming" | "active" | "ended"

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  upcoming: "bg-amber-50 text-amber-700 border-amber-200",
  ended: "bg-gray-50 text-gray-500 border-gray-200",
}

export default function DashboardTournamentsPage() {
  const { isAuthenticated, fiatSymbol } = useApp()
  const router = useRouter()
  const [tournaments, setTournaments] = useState<UserTournament[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/signin"); return }

    fetch("/api/user/tournaments", {
      headers: { Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setTournaments(d.tournaments ?? []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isAuthenticated, router])

  const filtered = filter === "all" ? tournaments : tournaments.filter((t) => t.status === filter)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4" />Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">My Tournaments</h1>
          <p className="text-gray-600 mt-1">All tournaments you have registered for.</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 space-y-6">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="w-auto">
          <TabsList className="bg-white p-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-white">All</TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-primary data-[state=active]:text-white">Upcoming</TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-white">Active</TabsTrigger>
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
                <Trophy className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                {filter === "all" ? "No tournament registrations yet" : `No ${filter} tournaments`}
              </h3>
              <p className="mt-2 text-gray-600">
                {filter === "all" ? "Register for a tournament to see it here." : "Try a different filter."}
              </p>
              {filter === "all" && (
                <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-white">
                  <Link href="/tournaments">Browse Tournaments</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <Card key={t.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{t.name}</p>
                      {t.format && <p className="text-sm text-gray-500">{t.format}</p>}
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[t.status] ?? ""}`}>
                      {t.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <CalendarDays className="h-4 w-4 text-gray-400" />
                      {new Date(t.tournament_date).toLocaleDateString()}
                    </span>
                    {t.location && (
                      <span className="flex items-center gap-1.5 text-gray-600">
                        <MapPin className="h-4 w-4 text-gray-400" />{t.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <Users className="h-4 w-4 text-gray-400" />
                      {t.registered_players}/{t.player_size} players
                    </span>
                    {t.preregistration_fee > 0 && (
                      <span className="flex items-center gap-1.5 text-gray-600">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        {fiatSymbol}{t.preregistration_fee.toLocaleString()} fee
                      </span>
                    )}
                  </div>
                  {t.prize_pool && (
                    <p className="mt-2 text-sm text-emerald-700 font-medium">🏆 Prize pool: {t.prize_pool}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Registered: {new Date(t.registered_at).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
