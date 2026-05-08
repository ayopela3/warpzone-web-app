"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Gavel, Clock, ArrowUpRight } from "lucide-react"
import type { Auction } from "@/types"
import type { ProductCondition } from "@/types"

//todo: move this condition labels to a shared utility file
const CONDITION_LABELS: Record<ProductCondition, string> = {
  NEW: "Brand New",
  "LIKE NEW": "Near Mint",
  GOOD: "Lightly Played",
  FAIR: "Moderately Played",
  POOR: "Heavily Played",
  DAMAGED: "Damaged",
}

type Props = {
  auction: Auction
  fiatSymbol: string
  isAuthenticated: boolean
  onJoin: (id: string) => void
}

function getTimeRemaining(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now()
  if (diff <= 0) return "Ended"
  const totalMinutes = Math.floor(diff / (1000 * 60))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function AuctionCard({ auction, fiatSymbol, isAuthenticated, onJoin }: Props) {
  const isLive = auction.status === "active"
  const isJoinable = auction.status === "active" || auction.status === "upcoming"

  const [timeLabel, setTimeLabel] = useState(() => getTimeRemaining(auction.end_time))

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLabel(getTimeRemaining(auction.end_time))
    }, 1_000)
    return () => clearInterval(interval)
  }, [auction.end_time])

  return (
    <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
      <div className="h-48 bg-[linear-gradient(135deg,#fef3c7,#ffffff)] flex items-center justify-center relative overflow-hidden">
        {auction.image_url ? (
          <Image src={auction.image_url} alt={auction.title} fill className="object-contain" />
        ) : (
          <Gavel className="h-16 w-16 text-amber-400" />
        )}
        <Badge
          className="absolute top-3 right-3"
          variant={isLive ? "default" : "secondary"}
        >
          {isLive ? "Live" : auction.status === "upcoming" ? "Upcoming" : "Ended"}
        </Badge>
        {isLive && (
          <div className="absolute top-3 left-3">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          </div>
        )}
      </div>

      <CardHeader className="pt-5 pb-2">
        <CardTitle className="text-lg text-gray-900">{auction.title}</CardTitle>
        <div className="flex flex-wrap gap-1.5 mt-1">
          <Badge variant="outline" className="text-xs capitalize">{auction.category}</Badge>
          <Badge variant="secondary" className="text-xs">
            {CONDITION_LABELS[auction.condition as ProductCondition] ?? auction.condition}
          </Badge>
          {auction.rarity && <Badge variant="outline" className="text-xs">{auction.rarity}</Badge>}
        </div>
        <CardDescription className="text-gray-500 text-xs mt-1">
          {auction.business_name ?? auction.seller_name ?? "Unknown seller"}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Current Bid</span>
          <span className="text-2xl font-bold text-primary">{fiatSymbol}{(auction.current_bid ?? auction.starting_price ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Starting Bid</span>
          <span className="font-medium text-gray-900">{fiatSymbol}{(auction.starting_price ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600 gap-1">
          <Clock className="h-3 w-3" />
          {timeLabel}
        </div>
        {isLive ? (
          <Button className="w-full mt-2" asChild>
            <Link href={`/auctions/${auction.id}`}>
              Place a Bid <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : isJoinable ? (
          <Button
            className="w-full mt-2"
            variant="outline"
            onClick={() => onJoin(auction.id)}
          >
            {isAuthenticated ? "Get Notified" : "Sign In to Join"}
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button className="w-full mt-2" disabled>
            Auction Ended
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
