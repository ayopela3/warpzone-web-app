"use client"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Search, X, Loader2 } from "lucide-react"
import { useApp } from "@/components/shared/app-provider"
import { TournamentCard } from "@/features/tournaments/components/TournamentCard"
import { tournamentsApi } from "@/lib/api-client"
import type { Tournament } from "@/types"

type TournamentFilter = "all" | "upcoming" | "open" | "past"

export default function TournamentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<TournamentFilter>("all")
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [registeringId, setRegisteringId] = useState<string | null>(null)
  const { requireAuth, userId } = useApp()

  const fetchTournaments = async () => {
    try {
      const data = await tournamentsApi.list()
      if (data.success) setTournaments(data.tournaments)
    } catch (error) {
      console.error("Failed to fetch tournaments:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTournaments() }, [])

  const handleRegister = async (tournamentId: string, tournamentName: string) => {
    if (!requireAuth()) return
    setRegisteringId(tournamentId)
    try {
      const data = await tournamentsApi.register(tournamentId, userId ?? "")
      if (!data.success) throw new Error(data.error ?? "Failed to register")
      console.log(`Registered for ${tournamentName}`)
      await fetchTournaments()
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Failed to register for tournament")
    } finally {
      setRegisteringId(null)
    }
  }

  const filtered = useMemo(() => {
    let result = [...tournaments]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) ||
          (t.location?.toLowerCase().includes(q)) ||
          (t.format?.toLowerCase().includes(q))
      )
    }
    if (activeTab !== "all") result = result.filter((t) => t.status === activeTab)
    return result
  }, [searchQuery, activeTab, tournaments])

  const hasActiveFilters = searchQuery.trim() !== "" || activeTab !== "all"
  const clearFilters = () => { setSearchQuery(""); setActiveTab("all") }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <h1 className="text-3xl font-black">Tournaments & Events</h1>
          <p className="mt-1 text-neutral-600">Register for local tournaments, casual play nights, and prerelease events.</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
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

        <p className="text-sm text-muted-foreground mb-4">
          Showing <span className="font-medium">{filtered.length}</span> of {tournaments.length} tournaments
        </p>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading tournaments...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">No tournaments found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters ? "Try adjusting your filters" : "Check back later for new events"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                registering={registeringId === tournament.id}
                onRegister={handleRegister}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
