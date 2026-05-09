"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, MapPin, Calendar, Users, DollarSign, Loader2, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react"
import type { Tournament } from "@/types"

type Props = {
  tournament: Tournament
  registering: boolean
  onRegister: (id: string, name: string) => void
}

export function TournamentCard({ tournament, registering, onRegister }: Props) {
  const [expanded, setExpanded] = useState(false)
  const isFull = tournament.registered_players >= tournament.player_size
  const fillPct = Math.min((tournament.registered_players / tournament.player_size) * 100, 100)
  const isOpen = tournament.status === "open"
  const isRegistered = tournament.user_registered === 1

  return (
    <Card className="border-neutral-200 bg-white py-0 shadow-sm transition hover:-translate-y-1 hover:border-black hover:shadow-xl">
      <div className="h-32 bg-[linear-gradient(135deg,#fff7cc,#ffffff)] flex items-center justify-center">
        <Trophy className="h-12 w-12 text-primary" />
      </div>

      <CardHeader className="pt-5">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant={tournament.status === "open" ? "default" : "secondary"}>
            {tournament.status === "open" ? "Registration Open" : "Upcoming"}
          </Badge>
          {tournament.format && <Badge variant="outline">{tournament.format}</Badge>}
          {isRegistered && (
            <Badge className="bg-green-100 text-green-700 border border-green-200 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Registered
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg">{tournament.name}</CardTitle>
        {tournament.location && (
          <CardDescription className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {tournament.location}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pb-5 space-y-3">
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
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-primary h-2 rounded-full" style={{ width: `${fillPct}%` }} />
        </div>
        {/* Description — toggled by View Details */}
        {expanded && tournament.description && (
          <p className="text-sm text-muted-foreground border-t border-neutral-100 pt-3">
            {tournament.description}
          </p>
        )}

        {/* View Details toggle — always visible */}
        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <><ChevronUp className="h-4 w-4 mr-2" />Hide Details</>
          ) : (
            <><ChevronDown className="h-4 w-4 mr-2" />View Details</>
          )}
        </Button>

        {/* Register button — only for open tournaments */}
        {isOpen && (
          isRegistered ? (
            <Button className="w-full mt-2 bg-green-600 hover:bg-green-600 text-white cursor-default" disabled>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              You&apos;re Registered
            </Button>
          ) : (
            <Button
              className="w-full mt-2"
              disabled={registering || isFull}
              onClick={() => onRegister(tournament.id, tournament.name)}
            >
              {registering ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registering...</>
              ) : isFull ? "Tournament Full" : "Register Now"}
            </Button>
          )
        )}
      </CardContent>
    </Card>
  )
}
