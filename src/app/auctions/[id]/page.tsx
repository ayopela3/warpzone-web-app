"use client"

export const runtime = "edge"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Gavel, Clock, ArrowLeft, Loader2, TrendingUp, Users, AlertCircle, CheckCircle2, Zap,
} from "lucide-react"
import { toast } from "sonner"
import { useApp } from "@/components/shared/app-provider"

type Bid = {
  bid_amount: number
  bid_time: string
  bidder_name: string | null
}

type AuctionDetail = {
  id: string
  seller_id: string
  title: string
  description: string | null
  category: string
  condition: string
  rarity: string | null
  image_url: string | null
  starting_price: number
  current_bid: number
  min_bid_increment: number
  start_time: string
  end_time: string
  status: string
  seller_name: string | null
  business_name: string | null
}

function getTimeRemaining(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now()
  if (diff <= 0) return "Ended"
  const totalMinutes = Math.floor(diff / (1000 * 60))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}d ${hours}h remaining`
  if (hours > 0) return `${hours}h ${minutes}m remaining`
  return `${minutes}m remaining`
}

const CONDITION_LABELS: Record<string, string> = {
  NEW: "Brand New",
  "LIKE NEW": "Near Mint",
  GOOD: "Lightly Played",
  FAIR: "Moderately Played",
  POOR: "Heavily Played",
  DAMAGED: "Damaged",
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  upcoming: "bg-amber-50 text-amber-700 border-amber-200",
  ended: "bg-gray-50 text-gray-500 border-gray-200",
}

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isAuthenticated, requireAuth, fiatSymbol } = useApp()

  const [auction, setAuction] = useState<AuctionDetail | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [bidAmount, setBidAmount] = useState("")
  const [placing, setPlacing] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState("")
  const [sniped, setSniped] = useState(false)
  const [isSeller, setIsSeller] = useState(false)

  const fetchAuction = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${id}`)
      const data = await res.json()
      if (data.success) {
        setAuction(data.auction)
        setBids(data.bids ?? [])
        setTimeRemaining(getTimeRemaining(data.auction.end_time))
      } else {
        router.push("/auctions")
      }
    } catch {
      router.push("/auctions")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { fetchAuction() }, [fetchAuction])

  // Determine if the current user is the seller
  useEffect(() => {
    if (!auction || !isAuthenticated) return
    fetch("/api/user/profile", {
      headers: { Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.profile?.id === auction.seller_id) setIsSeller(true)
      })
      .catch(() => {})
  }, [auction, isAuthenticated])

  // 1-second countdown ticker
  useEffect(() => {
    if (!auction) return
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(auction.end_time))
    }, 1_000)
    return () => clearInterval(interval)
  }, [auction])

  // 15-second live poll to pick up bids from other users
  useEffect(() => {
    if (!auction || auction.status !== "active") return
    const interval = setInterval(() => { fetchAuction() }, 15_000)
    return () => clearInterval(interval)
  }, [auction, fetchAuction])

  const minBid = auction
    ? (auction.current_bid || auction.starting_price) + auction.min_bid_increment
    : 0

  const handleBid = async () => {
    if (!requireAuth()) return
    if (!auction) return

    const amount = Number(bidAmount)
    if (!amount || amount < minBid) {
      toast.error(`Minimum bid is ${fiatSymbol}${minBid.toLocaleString()}`)
      return
    }

    setPlacing(true)
    try {
      const res = await fetch(`/api/auctions/${id}/bid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("warpzone-session-id") ?? ""}`,
        },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()

      if (data.success) {
        if (data.extended) {
          setSniped(true)
          toast.warning(`⏱️ Snipe detected! Auction extended by 30 minutes — new end: ${new Date(data.newEndTime).toLocaleString()}`)
        } else {
          toast.success(`Bid of ${fiatSymbol}${amount.toLocaleString()} placed successfully!`)
        }
        setBidAmount("")
        await fetchAuction()
      } else {
        toast.error(data.error ?? "Failed to place bid")
      }
    } catch {
      toast.error("Failed to place bid")
    } finally {
      setPlacing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!auction) return null

  const isActive = auction.status === "active"
  const isUpcoming = auction.status === "upcoming"
  const isEnded = auction.status === "ended"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          <Link href="/auctions" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4" />Back to Auctions
          </Link>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{auction.title}</h1>
            <Badge variant="outline" className={`text-sm shrink-0 px-3 py-1 ${STATUS_STYLES[auction.status] ?? ""}`}>
              {isActive ? "🔴 Live" : isUpcoming ? "⏳ Upcoming" : "✅ Ended"}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Sold by <span className="font-medium">{auction.business_name ?? auction.seller_name ?? "Unknown seller"}</span>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left — Image + Details */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="bg-white shadow-sm overflow-hidden">
              <div className="relative h-80 bg-[linear-gradient(135deg,#fef3c7,#ffffff)] flex items-center justify-center">
                {auction.image_url
                  ? <Image src={auction.image_url} alt={auction.title} fill className="object-contain" />
                  : <Gavel className="h-24 w-24 text-amber-300" />}
              </div>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Item Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-gray-500">Category</span>
                  <span className="font-medium capitalize">{auction.category}</span>
                  <span className="text-gray-500">Condition</span>
                  <span className="font-medium">{CONDITION_LABELS[auction.condition] ?? auction.condition}</span>
                  {auction.rarity && (
                    <>
                      <span className="text-gray-500">Rarity</span>
                      <span className="font-medium">{auction.rarity}</span>
                    </>
                  )}
                  <span className="text-gray-500">Starting Price</span>
                  <span className="font-medium">{fiatSymbol}{auction.starting_price.toLocaleString()}</span>
                  <span className="text-gray-500">Min. Increment</span>
                  <span className="font-medium">{fiatSymbol}{auction.min_bid_increment.toLocaleString()}</span>
                </div>
                {auction.description && (
                  <p className="pt-3 border-t text-gray-700 leading-relaxed">{auction.description}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right — Bid Panel + History */}
          <div className="lg:col-span-2 space-y-6">

            {/* Current Bid Card */}
            <Card className="bg-white shadow-sm border-2 border-primary/20">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Current Bid</p>
                  <p className="text-4xl font-black text-primary mt-1">
                    {fiatSymbol}{(auction.current_bid || auction.starting_price).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {bids.length} bid{bids.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 justify-center">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">{timeRemaining}</span>
                </div>

                {/* Snipe protection notice */}
                {isActive && (() => {
                  const msLeft = new Date(auction.end_time).getTime() - Date.now()
                  const inSnipeWindow = msLeft > 0 && msLeft <= 60 * 60 * 1000
                  return (inSnipeWindow || sniped) ? (
                    <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                      <Zap className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                      <span>
                        {sniped
                          ? "Auction was extended by 30 min due to a last-minute bid."
                          : "Last hour — any bid will extend this auction by 30 min."}
                      </span>
                    </div>
                  ) : null
                })()}

                {/* Seller view — no bidding on own auction */}
                {isSeller && (
                  <div className="pt-2 border-t space-y-3">
                    <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm text-primary font-medium">
                      <Gavel className="h-4 w-4 shrink-0" />
                      You are selling this item
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-500">Total bids</span>
                      <span className="font-semibold text-gray-900">{bids.length}</span>
                      <span className="text-gray-500">Leading bid</span>
                      <span className="font-semibold text-primary">
                        {bids[0] ? `${fiatSymbol}${bids[0].bid_amount.toLocaleString()}` : "No bids yet"}
                      </span>
                      {bids[0] && (
                        <>
                          <span className="text-gray-500">Leading bidder</span>
                          <span className="font-semibold text-gray-900">{bids[0].bidder_name ?? "Anonymous"}</span>
                        </>
                      )}
                    </div>
                    {isActive && (
                      <Button asChild variant="outline" className="w-full" size="sm">
                        <Link href="/dashboard">View in Dashboard</Link>
                      </Button>
                    )}
                  </div>
                )}

                {/* Bid Form — only for active auctions and non-sellers */}
                {isActive && !isSeller && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label htmlFor="bid_amount" className="text-sm font-medium">
                        Your Bid
                        <span className="text-gray-400 font-normal ml-1">
                          (min. {fiatSymbol}{minBid.toLocaleString()})
                        </span>
                      </Label>
                      <Input
                        id="bid_amount"
                        type="number"
                        min={minBid}
                        step={auction.min_bid_increment}
                        placeholder={minBid.toString()}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="text-lg font-semibold"
                        onKeyDown={(e) => { if (e.key === "Enter") handleBid() }}
                      />
                    </div>
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5 text-base"
                      onClick={handleBid}
                      disabled={placing}
                    >
                      {placing
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Placing Bid…</>
                        : <><Gavel className="h-4 w-4 mr-2" />Place Bid</>}
                    </Button>
                    {!isAuthenticated && (
                      <p className="text-xs text-center text-gray-500">
                        <Link href="/auth/signin" className="text-primary underline">Sign in</Link> to place a bid
                      </p>
                    )}
                    <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                      <AlertCircle className="h-3 w-3" />Bids are binding and cannot be retracted
                    </p>
                  </div>
                )}

                {isUpcoming && (
                  <div className="pt-2 border-t text-center space-y-2">
                    <p className="text-sm text-amber-700 font-medium">Auction starts {new Date(auction.start_time).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Come back when the auction goes live to place your bid.</p>
                  </div>
                )}

                {isEnded && (
                  <div className="pt-2 border-t text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Auction closed</span>
                    </div>
                    {bids[0] && (
                      <p className="text-sm text-gray-600 mt-1">
                        Won at <span className="font-bold text-gray-900">{fiatSymbol}{bids[0].bid_amount.toLocaleString()}</span>
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bid History */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Bid History
                  <span className="text-xs text-gray-400 font-normal ml-auto flex items-center gap-1">
                    <Users className="h-3 w-3" />{bids.length} bid{bids.length !== 1 ? "s" : ""}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bids.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No bids yet — be the first!</p>
                ) : (
                  <div className="space-y-2">
                    {bids.map((bid, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${i === 0 ? "bg-primary/5 border border-primary/20" : "bg-gray-50"}`}
                      >
                        <div>
                          <span className="font-medium text-gray-800">
                            {bid.bidder_name ?? "Anonymous"}
                          </span>
                          {i === 0 && <span className="ml-2 text-xs text-primary font-semibold">Leading</span>}
                          <p className="text-xs text-gray-400">{new Date(bid.bid_time).toLocaleString()}</p>
                        </div>
                        <span className={`font-bold ${i === 0 ? "text-primary" : "text-gray-700"}`}>
                          {fiatSymbol}{bid.bid_amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
