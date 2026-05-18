"use client"

export const runtime = "edge"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Loader2, CalendarDays, MapPin, Users, Trophy,
  DollarSign, AlertTriangle, CheckCircle2, XCircle,
} from "lucide-react"
import { useApp } from "@/components/shared/app-provider"
import { tournamentsApi } from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Tournament } from "@/types"

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-green-50 text-green-700 border-green-200",
  upcoming: "bg-amber-50 text-amber-700 border-amber-200",
  ended:    "bg-gray-50 text-gray-500 border-gray-200",
}

type Registration = { id: string; registered_at: string }

export default function TournamentDetailPage() {
  const { isAuthenticated, fiatSymbol } = useApp()
  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [tournament,   setTournament]   = useState<Tournament | null>(null)
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [cancelling,   setCancelling]   = useState(false)
  const [cancelled,    setCancelled]    = useState(false)
  const [cancelError,  setCancelError]  = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    if (!params.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await tournamentsApi.myTournamentDetail(params.id)
      if (data.success) {
        setTournament(data.tournament)
        setRegistration(data.registration)
      } else {
        setError("Tournament registration not found.")
      }
    } catch {
      setError("Failed to load tournament details.")
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (!isAuthenticated) router.push("/auth/signin")
  }, [isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) fetchDetail()
  }, [isAuthenticated, fetchDetail])

  const handleCancel = async () => {
    if (!tournament || !params.id) return
    setCancelling(true)
    setCancelError(null)
    try {
      const result = await tournamentsApi.cancelRegistration(params.id)
      if (result.success) {
        setCancelled(true)
      } else {
        setCancelError(result.error ?? "Failed to cancel registration.")
      }
    } catch {
      setCancelError("Something went wrong. Please try again.")
    } finally {
      setCancelling(false)
    }
  }

  if (!isAuthenticated) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !tournament || !registration) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">{error ?? "Tournament not found."}</p>
        <Link href="/dashboard/tournaments" className="text-primary text-sm hover:underline">
          ← Back to Tournaments
        </Link>
      </div>
    )
  }

  const tournamentDate = new Date(tournament.tournament_date).toLocaleDateString("en-PH", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })
  const registeredOn = new Date(registration.registered_at).toLocaleDateString("en-PH", {
    month: "long", day: "numeric", year: "numeric",
  })
  const canCancel = tournament.status === "upcoming" && !cancelled
  const spotsLeft = tournament.player_size - tournament.registered_players

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
          <Link
            href="/dashboard/tournaments"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tournaments
          </Link>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
              {tournament.format && (
                <p className="text-gray-500 mt-1 text-sm">{tournament.format}</p>
              )}
            </div>
            <Badge variant="outline" className={`shrink-0 text-sm capitalize ${STATUS_COLORS[tournament.status] ?? ""}`}>
              {tournament.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 space-y-6">

        {/* Cancellation success banner */}
        {cancelled && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-5 py-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Registration cancelled</p>
              <p className="text-green-700 text-xs mt-0.5">Your spot has been released. You can re-register anytime while slots are available.</p>
            </div>
          </div>
        )}

        {/* Cancel error */}
        {cancelError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-5 py-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-red-700 text-sm">{cancelError}</p>
          </div>
        )}

        {/* Summary sentence */}
        <p className="text-sm text-gray-600">
          You registered for{" "}
          <span className="font-bold text-gray-900">{tournament.name}</span>
          {" "}on{" "}
          <span className="font-semibold text-gray-800">{registeredOn}</span>.
          {" "}The tournament is currently{" "}
          <span className="font-semibold text-gray-800 capitalize">{tournament.status}</span>.
        </p>

        {/* Tournament details card */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900">Tournament details</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Date */}
            <div className="grid grid-cols-2 px-6 py-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Date
              </span>
              <span className="text-sm text-gray-800">{tournamentDate}</span>
            </div>

            {/* Location */}
            {tournament.location && (
              <div className="grid grid-cols-2 px-6 py-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Location
                </span>
                <span className="text-sm text-gray-800">{tournament.location}</span>
              </div>
            )}

            {/* Format */}
            {tournament.format && (
              <div className="grid grid-cols-2 px-6 py-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Format</span>
                <span className="text-sm text-gray-800">{tournament.format}</span>
              </div>
            )}

            {/* Players */}
            <div className="grid grid-cols-2 px-6 py-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Players
              </span>
              <span className="text-sm text-gray-800">
                {tournament.registered_players} / {tournament.player_size} registered
                {spotsLeft > 0 && (
                  <span className="text-xs text-gray-500 ml-1">({spotsLeft} spots left)</span>
                )}
              </span>
            </div>

            {/* Registration fee */}
            {tournament.preregistration_fee > 0 && (
              <div className="grid grid-cols-2 px-6 py-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" /> Registration Fee
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {fiatSymbol}{tournament.preregistration_fee.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Prize pool */}
            {tournament.prize_pool && (
              <div className="grid grid-cols-2 px-6 py-4">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prize Pool</span>
                <span className="text-sm font-semibold text-emerald-700">🏆 {tournament.prize_pool}</span>
              </div>
            )}

            {/* Registered on */}
            <div className="grid grid-cols-2 px-6 py-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered On</span>
              <span className="text-sm text-gray-800">{registeredOn}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {tournament.description && (
          <Card className="bg-white shadow-sm">
            <CardContent className="px-6 py-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">About this Tournament</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{tournament.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Cancel registration */}
        {canCancel && (
          <Card className="bg-white shadow-sm border-red-100">
            <CardContent className="px-6 py-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900">Cancel Registration</h3>
                  <p className="text-xs text-gray-500 mt-0.5 mb-4">
                    You can only cancel while the tournament is still upcoming. This action will free your spot for other players.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="gap-1.5"
                  >
                    {cancelling ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cancelling…</>
                    ) : (
                      <><XCircle className="h-3.5 w-3.5" /> Cancel Registration</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already cancelled note */}
        {cancelled && (
          <div className="text-center pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/tournaments">Browse More Tournaments →</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
