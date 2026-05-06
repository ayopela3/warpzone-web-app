"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, MapPin, Calendar, Users, DollarSign, Search, X, Loader2 } from "lucide-react"
import { useApp } from "@/components/shared/app-provider"

interface Tournament {
  id: string
  name: string
  tournament_date: string
  location: string
  format: string
  prize_pool: string
  registered_players: number
  player_size: number
  status: string
  preregistration_fee: number
  description: string
}

type TournamentFilter = "all" | "upcoming" | "open" | "past"

export default function TournamentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<TournamentFilter>("all")
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [registeringTournamentId, setRegisteringTournamentId] = useState<string | null>(null)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const { requireAuth, userId } = useApp()

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      const response = await fetch("/api/tournaments")
      const data = await response.json()
      if (data.success) {
        setTournaments(data.tournaments)
      }
    } catch (error) {
      console.error("Failed to fetch tournaments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (tournamentId: string, tournamentName: string) => {
    if (!requireAuth()) {
      return
    }

    setRegisteringTournamentId(tournamentId)
    setRegistrationError(null)

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to register for tournament")
      }

      // Refresh tournaments to update registered count
      await fetchTournaments()
      alert(`Successfully registered for ${tournamentName}!`)
    } catch (error) {
      setRegistrationError(error instanceof Error ? error.message : "Failed to register")
      alert(error instanceof Error ? error.message : "Failed to register for tournament")
    } finally {
      setRegisteringTournamentId(null)
    }
  }

  const filteredTournaments = useMemo(() => {
    let result = [...tournaments]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          (t.location && t.location.toLowerCase().includes(query)) ||
          (t.format && t.format.toLowerCase().includes(query))
      )
    }

    if (activeTab !== "all") {
      result = result.filter((t) => t.status === activeTab)
    }

    return result
  }, [searchQuery, activeTab, tournaments])

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
          <h1 className="text-3xl font-black">Tournaments & Events</h1>
          <p className="mt-1 text-neutral-600">Register for local tournaments, casual play nights, and prerelease events.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tournaments..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TournamentFilter)} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="open">Registration Open</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
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
            Showing <span className="font-medium">{filteredTournaments.length}</span> of {tournaments.length} tournaments
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading tournaments...</p>
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No tournaments found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters ? "Try adjusting your filters" : "Check back later for new events"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
              <Card key={tournament.id} className="border-neutral-200 bg-white py-0 shadow-sm transition hover:-translate-y-1 hover:border-black hover:shadow-xl">
                <div className="h-32 bg-[linear-gradient(135deg,#fff7cc,#ffffff)] flex items-center justify-center">
                  <Trophy className="h-12 w-12 text-primary" />
                </div>
                <CardHeader className="pt-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={tournament.status === "open" ? "default" : "secondary"}>
                      {tournament.status === "open" ? "Registration Open" : "Upcoming"}
                    </Badge>
                    <Badge variant="outline">{tournament.format}</Badge>
                  </div>
                  <CardTitle className="text-lg">{tournament.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {tournament.location}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Date
                      </span>
                      <span className="font-medium">{new Date(tournament.tournament_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Prize Pool
                      </span>
                      <span className="font-black text-black">{tournament.prize_pool || "TBD"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Registered
                      </span>
                      <span className="font-medium">{tournament.registered_players} / {tournament.player_size}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${(tournament.registered_players / tournament.player_size) * 100}%` }}
                      ></div>
                    </div>
                    <Button
                      className="w-full mt-2"
                      disabled={registeringTournamentId === tournament.id || tournament.registered_players >= tournament.player_size}
                      onClick={() => handleRegister(tournament.id, tournament.name)}
                    >
                      {registeringTournamentId === tournament.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Registering...
                        </>
                      ) : tournament.registered_players >= tournament.player_size ? (
                        "Full"
                      ) : tournament.status === "open" ? (
                        "Register Now"
                      ) : (
                        "View Details"
                      )}
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
