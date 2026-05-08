"use client"

export const runtime = "edge"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!auction) return null

  const isActive = auction.status === "active"
  const isUpcoming = auction.status === "upcoming"
  const isEnded = auction.status === "ended"
  const sellerLabel = auction.business_name ?? auction.seller_name ?? "Unknown seller"

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 pt-6 pb-12 lg:px-8">

        {/* ── Back link ── */}
        <Link
          href="/auctions"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Auctions
        </Link>

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground leading-tight">
            {auction.title}
          </h1>
          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1 text-sm font-semibold border ${
            isActive
              ? "bg-white border-red-200 text-red-600"
              : isUpcoming
              ? "bg-white border-amber-200 text-amber-600"
              : "bg-white border-gray-200 text-gray-500"
          }`}>
            {isActive && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
            {isActive ? "Live" : isUpcoming ? "Upcoming" : "Ended"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          Sold by <span className="font-semibold text-foreground">{sellerLabel}</span>
        </p>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ─── Left col: image + item details ─────────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Image panel */}
            <div className="rounded-2xl overflow-hidden bg-[#fdf6e3] border border-border flex items-center justify-center" style={{ minHeight: "340px" }}>
              {auction.image_url ? (
                <div className="relative w-full" style={{ height: "340px" }}>
                  <Image
                    src={auction.image_url}
                    alt={auction.title}
                    fill
                    className="object-contain p-6"
                  />
                </div>
              ) : (
                <Gavel className="h-24 w-24 text-amber-300 my-16" />
              )}
            </div>

            {/* Item details card */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="font-display text-base font-bold text-foreground mb-4">Item Details</h2>
              <div className="divide-y divide-border">
                {[
                  ["Category", <span key="cat" className="capitalize">{auction.category}</span>],
                  ["Condition", CONDITION_LABELS[auction.condition] ?? auction.condition],
                  ...(auction.rarity ? [["Rarity", auction.rarity]] : []),
                  ["Starting Price", `${fiatSymbol}${auction.starting_price.toLocaleString()}`],
                  ["Min. Increment", `${fiatSymbol}${auction.min_bid_increment.toLocaleString()}`],
                ].map(([label, value], i) => (
                  <div key={i} className="flex items-center justify-between py-3 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground text-right">{value}</span>
                  </div>
                ))}
              </div>
              {auction.description && (
                <p className="mt-4 pt-4 border-t border-border text-sm text-foreground/80 leading-relaxed">
                  {auction.description}
                </p>
              )}
            </div>
          </div>

          {/* ─── Right col: bid panel + history ──────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Bid panel */}
            <div className="bg-white rounded-2xl border border-border p-6 space-y-5">

              {/* Current bid display */}
              <div className="text-center space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Current Bid</p>
                <p className="font-display text-4xl font-extrabold text-primary leading-none">
                  {fiatSymbol}{(auction.current_bid || auction.starting_price).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {bids.length} bid{bids.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Countdown */}
              <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {timeRemaining}
              </div>

              {/* Snipe protection notice */}
              {isActive && (() => {
                const msLeft = new Date(auction.end_time).getTime() - Date.now()
                const inSnipeWindow = msLeft > 0 && msLeft <= 60 * 60 * 1000
                return (inSnipeWindow || sniped) ? (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
                    <Zap className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                    <span>
                      {sniped
                        ? "Auction extended +30 min due to a last-minute bid."
                        : "Last hour — any bid will extend this auction by 30 min."}
                    </span>
                  </div>
                ) : null
              })()}

              {/* ── Seller view ── */}
              {isSeller && (
                <div className="space-y-3 pt-1 border-t border-border">
                  <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-primary font-semibold">
                    <Gavel className="h-4 w-4 shrink-0" />
                    You are selling this item
                  </div>
                  <div className="divide-y divide-border text-sm">
                    {[
                      ["Total bids", String(bids.length)],
                      ["Leading bid", bids[0] ? `${fiatSymbol}${bids[0].bid_amount.toLocaleString()}` : "No bids yet"],
                      ...(bids[0] ? [["Leading bidder", bids[0].bidder_name ?? "Anonymous"]] : []),
                    ].map(([l, v], i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <span className="text-muted-foreground">{l}</span>
                        <span className="font-semibold text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                  {isActive && (
                    <Button asChild variant="outline" className="w-full" size="sm">
                      <Link href="/dashboard">View in Dashboard</Link>
                    </Button>
                  )}
                </div>
              )}

              {/* ── Bid form ── */}
              {isActive && !isSeller && (
                <div className="space-y-3 pt-1 border-t border-border">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="bid_amount"
                      className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
                    >
                      Your Bid <span className="font-normal normal-case tracking-normal">(min. {fiatSymbol}{minBid.toLocaleString()})</span>
                    </Label>
                    <Input
                      id="bid_amount"
                      type="number"
                      min={minBid}
                      step={auction.min_bid_increment}
                      placeholder={minBid.toString()}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleBid() }}
                      className="h-12 text-lg font-semibold rounded-xl border-border"
                    />
                  </div>
                  <Button
                    className="w-full h-12 rounded-xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleBid}
                    disabled={placing}
                  >
                    {placing
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Placing Bid…</>
                      : <><Zap className="h-4 w-4 mr-2" />Place Bid</>}
                  </Button>
                  {!isAuthenticated && (
                    <p className="text-xs text-center text-muted-foreground">
                      <Link href="/auth/signin" className="text-primary font-semibold hover:underline">Sign in</Link>
                      {" "}to place a bid
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Bids are binding and cannot be retracted
                  </p>
                </div>
              )}

              {/* ── Upcoming state ── */}
              {isUpcoming && (
                <div className="pt-1 border-t border-border text-center space-y-1">
                  <p className="text-sm font-semibold text-amber-700">
                    Starts {new Date(auction.start_time).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Come back when the auction goes live.</p>
                </div>
              )}

              {/* ── Ended state ── */}
              {isEnded && (
                <div className="pt-1 border-t border-border text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium text-sm">Auction closed</span>
                  </div>
                  {bids[0] && (
                    <p className="text-sm text-muted-foreground">
                      Won at{" "}
                      <span className="font-bold text-foreground">
                        {fiatSymbol}{bids[0].bid_amount.toLocaleString()}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Bid history */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Bid History
                </h2>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {bids.length} bid{bids.length !== 1 ? "s" : ""}
                </span>
              </div>

              {bids.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No bids yet — be the first!</p>
              ) : (
                <div className="space-y-2">
                  {bids.map((bid, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
                        i === 0
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted/50"
                      }`}
                    >
                      <div className="space-y-0.5">
                        {i === 0 && (
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Leading</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(bid.bid_time).toLocaleString()}
                        </p>
                      </div>
                      <span className={`font-display font-bold text-base ${i === 0 ? "text-primary" : "text-foreground"}`}>
                        {fiatSymbol}{bid.bid_amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
