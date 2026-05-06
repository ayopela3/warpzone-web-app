"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2 } from "lucide-react"
import { tournamentsApi } from "@/lib/api-client"

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
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tournament")
    } finally {
      setLoading(false)
    }
  }

  return (
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
  )
}
