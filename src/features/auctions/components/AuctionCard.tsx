"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Gavel, Clock, ArrowUpRight } from "lucide-react"
import type { Auction } from "@/types"

type Props = {
  auction: Auction
  fiatSymbol: string
  isAuthenticated: boolean
  onJoin: (id: string) => void
}

function getTimeRemaining(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now()
  if (diff <= 0) return "Ended"
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

export function AuctionCard({ auction, fiatSymbol, isAuthenticated, onJoin }: Props) {
  const isLive = auction.status === "active"
  const isJoinable = auction.status === "active" || auction.status === "upcoming"

  return (
    <Card className="bg-white shadow-md hover:shadow-lg transition-shadow">
      <div className="h-48 bg-[linear-gradient(135deg,#fef3c7,#ffffff)] flex items-center justify-center relative overflow-hidden">
        {auction.image_url ? (
          <img src={auction.image_url} alt={auction.title} className="h-full w-full object-cover" />
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

      <CardHeader className="pt-5">
        <CardTitle className="text-lg text-gray-900">{auction.title}</CardTitle>
        <CardDescription className="text-gray-600">
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
          {getTimeRemaining(auction.end_time)}
        </div>
        <Button
          className="w-full mt-2"
          disabled={!isJoinable}
          onClick={() => onJoin(auction.id)}
        >
          {isAuthenticated ? (isLive ? "Join Auction" : "Get Notified") : "Sign In to Join"}
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
