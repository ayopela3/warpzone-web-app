"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, Trophy, MapPin, Users, Calendar } from "lucide-react"
import { tournamentsApi } from "@/lib/api-client"
import type { Tournament } from "@/types"

const INITIAL_FORM = {
  name: "",
  playerSize: "",
  description: "",
  preregistrationFee: "",
  tournamentDate: "",
  location: "",
  format: "",
  prizePool: "",
}

export function TournamentsTab() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [listLoading, setListLoading] = useState(true)

  const fetchTournaments = useCallback(async () => {
    setListLoading(true)
    try {
      const data = await tournamentsApi.list()
      if (data.success) setTournaments(data.tournaments)
    } catch {
      // silently ignore — list is best-effort
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => { fetchTournaments() }, [fetchTournaments])

  const handleChange = (field: keyof typeof INITIAL_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const data = await tournamentsApi.create({
        name: form.name,
        playerSize: parseInt(form.playerSize) || 0,
        description: form.description,
        preregistrationFee: parseFloat(form.preregistrationFee) || 0,
        tournamentDate: form.tournamentDate,
        location: form.location,
        format: form.format,
        prizePool: form.prizePool,
      })

      if (!data.success) throw new Error(data.error || "Failed to create tournament")

      setSuccess(true)
      setForm(INITIAL_FORM)
      await fetchTournaments()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tournament")
    } finally {
      setLoading(false)
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    upcoming: "bg-amber-50 text-amber-700 border-amber-200",
    open:     "bg-green-50 text-green-700 border-green-200",
    past:     "bg-gray-100 text-gray-500 border-gray-200",
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle>Create Tournament</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>}
            {success && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Tournament created successfully!
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name">Tournament Name *</Label>
                <Input id="name" value={form.name} onChange={handleChange("name")} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="playerSize">Player Size *</Label>
                <Input id="playerSize" type="number" min="2" value={form.playerSize} onChange={handleChange("playerSize")} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tournamentDate">Date *</Label>
                <Input id="tournamentDate" type="datetime-local" value={form.tournamentDate} onChange={handleChange("tournamentDate")} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="preregistrationFee">Entry Fee</Label>
                <Input id="preregistrationFee" type="number" min="0" step="0.01" value={form.preregistrationFee} onChange={handleChange("preregistrationFee")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="format">Format</Label>
                <Input id="format" placeholder="e.g. Swiss, Single Elimination" value={form.format} onChange={handleChange("format")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={form.location} onChange={handleChange("location")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prizePool">Prize Pool</Label>
                <Input id="prizePool" placeholder="e.g. $500 store credit" value={form.prizePool} onChange={handleChange("prizePool")} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description *</Label>
              <Input id="description" value={form.description} onChange={handleChange("description")} required />
            </div>

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Tournament
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tournaments list table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">All Tournaments</h3>
        {listLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white py-12 text-center shadow-sm">
            <Trophy className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No tournaments yet. Create one above.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tournament</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Players</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Entry Fee</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
            </div>
            <div className="divide-y divide-gray-100">
              {tournaments.map((t) => (
                <div key={t.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors">
                  {/* Name + format */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
                    {t.format && <p className="text-xs text-gray-400 truncate">{t.format}</p>}
                    {t.prize_pool && <p className="text-xs text-gray-400 truncate">Prize: {t.prize_pool}</p>}
                  </div>
                  {/* Date */}
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    {new Date(t.tournament_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  {/* Location */}
                  <div className="flex items-center gap-1 text-sm text-gray-600 truncate">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{t.location || "—"}</span>
                  </div>
                  {/* Players */}
                  <div className="flex items-center gap-1 text-sm text-gray-700">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    {t.registered_players}
                    <span className="text-gray-400">/ {t.player_size}</span>
                  </div>
                  {/* Entry fee */}
                  <span className="text-sm text-gray-700">
                    {t.preregistration_fee > 0 ? `₱${t.preregistration_fee.toLocaleString()}` : "Free"}
                  </span>
                  {/* Status */}
                  <Badge variant="outline" className={`text-xs capitalize w-fit ${STATUS_COLORS[t.status] ?? ""}`}>
                    {t.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
