"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, Gavel, PackageCheck, ShieldCheck, ShoppingBag, Sparkles, Trophy, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const featuredCards: Array<{ id: number; name: string; game: string; price: number; condition: string }> = []

const upcomingEvents: Array<{ id: number; title: string; date: string; players: string; prize: string }> = []

const services = [
  { title: "Verified singles", description: "Condition-checked cards from Pokemon, MTG, Yu-Gi-Oh!, and more.", icon: ShieldCheck },
  { title: "Live auctions", description: "Bid on grails, slabs, sealed boxes, and limited releases.", icon: Gavel },
  { title: "Pre-orders", description: "Reserve upcoming sets before launch day with secure checkout.", icon: PackageCheck },
  { title: "Local events", description: "Join weekly tournaments, casual play nights, and prereleases.", icon: Trophy },
]

export default function HomePage() {
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0)
  const activeFeaturedCard = featuredCards[activeFeaturedIndex]

  const showPreviousFeaturedCard = () => {
    setActiveFeaturedIndex((currentIndex) =>
      currentIndex === 0 ? featuredCards.length - 1 : currentIndex - 1
    )
  }

  const showNextFeaturedCard = () => {
    setActiveFeaturedIndex((currentIndex) =>
      currentIndex === featuredCards.length - 1 ? 0 : currentIndex + 1
    )
  }

  if (featuredCards.length === 0) {
    return (
      <div className="bg-white text-black">
        <section className="relative overflow-hidden border-b border-black bg-primary text-black">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.42),transparent_45%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
            <div className="flex flex-col items-center justify-center text-center">
              <Badge className="mb-6 w-fit border-black bg-white text-black hover:bg-white">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Your local TCG hobby shop online
              </Badge>
              <h1 className="max-w-3xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
                Buy cards, reserve releases, bid on grails, and join events.
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-black/80">
                The Warpzone brings your favorite hobby shop experience online with curated singles,
                sealed products, live auctions, pre-orders, and tournament registration.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="bg-black text-white hover:bg-neutral-800" asChild>
                  <Link href="/shop">
                    Shop cards
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" className="border border-black bg-white text-black hover:bg-white/90" asChild>
                  <Link href="/tournaments">
                    Join tournaments
                    <Trophy className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <Card key={service.title} className="border-neutral-200 bg-white transition hover:-translate-y-1 hover:border-black hover:shadow-lg">
                <CardContent className="p-6">
                  <service.icon className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="font-black text-black">{service.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-neutral-300" />
            <h2 className="mt-4 text-xl font-semibold">No featured products yet</h2>
            <p className="mt-2 text-sm text-neutral-600">Check back later for new listings</p>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-2 lg:px-8">
          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader>
              <Badge className="w-fit">Live now</Badge>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Gavel className="h-6 w-6 text-primary" />
                Auction block
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-neutral-600">Bid on graded slabs, sealed boxes, and hard-to-find singles.</p>
              <Button asChild>
                <Link href="/auctions">Browse auctions</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader>
              <Badge className="w-fit">Events</Badge>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CalendarDays className="h-6 w-6 text-primary" />
                Upcoming tournaments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-neutral-600">No upcoming events scheduled yet.</p>
              <Button variant="outline" asChild>
                <Link href="/tournaments">See event calendar</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    )
  }

  return (
    <div className="bg-white text-black">
      <section className="relative overflow-hidden border-b border-black bg-primary text-black">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.42),transparent_45%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
          <div className="flex flex-col justify-center">
            <Badge className="mb-6 w-fit border-black bg-white text-black hover:bg-white">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Your local TCG hobby shop online
            </Badge>
            <h1 className="max-w-3xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
              Buy cards, reserve releases, bid on grails, and join events.
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-black/80">
              The Warpzone brings your favorite hobby shop experience online with curated singles,
              sealed products, live auctions, pre-orders, and tournament registration.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="bg-black text-white hover:bg-neutral-800" asChild>
                <Link href="/shop">
                  Shop cards
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" className="border border-black bg-white text-black hover:bg-white/90" asChild>
                <Link href="/tournaments">
                  Join tournaments
                  <Trophy className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <Card className="border-2 border-black bg-white py-0 shadow-[10px_10px_0_#0a0a0a]">
            <CardContent className="p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <Badge className="border-black bg-primary text-black">Featured products</Badge>
                  <h2 className="mt-2 text-2xl font-black text-black">This week at The Warpzone</h2>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" aria-label="Previous featured product" onClick={showPreviousFeaturedCard}>‹</Button>
                  <Button variant="outline" size="icon" aria-label="Next featured product" onClick={showNextFeaturedCard}>›</Button>
                </div>
              </div>

              <div className="grid min-h-[290px] gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border bg-[linear-gradient(135deg,#fff3b0,#ffffff)] p-5">
                  <div className="flex h-56 items-center justify-center rounded-xl bg-white/60">
                    <div className="flex h-40 w-28 items-center justify-center rounded-2xl border-2 border-primary bg-white shadow-md">
                      <ShoppingBag className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                </div>

                <div className="flex min-h-[290px] flex-col justify-between">
                  <div className="min-h-[170px]">
                    <p className="text-sm font-bold text-neutral-500">{activeFeaturedCard.game} · {activeFeaturedCard.condition}</p>
                    <h3 className="mt-2 line-clamp-3 min-h-[108px] text-3xl font-black leading-9 text-black">
                      {activeFeaturedCard.name}
                    </h3>
                    <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-neutral-600">
                      Verified condition, ready for binder pickup or secure shipping.
                    </p>
                  </div>
                  <div className="mt-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm font-bold text-neutral-500">Starting at</span>
                      <span className="text-3xl font-black text-black">${activeFeaturedCard.price}</span>
                    </div>
                    <Button className="w-full bg-black text-white hover:bg-neutral-800" asChild>
                      <Link href="/shop">
                        View product
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {featuredCards.map((card, index) => (
                  <button
                    type="button"
                    key={card.id}
                    className={`rounded-xl border p-3 text-left transition hover:border-black ${
                      activeFeaturedIndex === index
                        ? "border-black bg-primary/15"
                        : "border-neutral-200 bg-neutral-50"
                    }`}
                    onClick={() => setActiveFeaturedIndex(index)}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-neutral-500">0{index + 1}</span>
                      <span className="text-xs font-bold text-neutral-500">{card.game}</span>
                    </div>
                    <p className="line-clamp-2 h-10 text-sm font-black leading-5 text-black">{card.name}</p>
                    <p className="mt-2 text-sm font-black text-primary">${card.price}</p>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex justify-center gap-2">
                {featuredCards.map((card, index) => (
                  <button
                    key={card.id}
                    type="button"
                    aria-label={`Show featured product ${index + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      activeFeaturedIndex === index ? "w-6 bg-black" : "w-2 bg-neutral-300"
                    }`}
                    onClick={() => setActiveFeaturedIndex(index)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <Card key={service.title} className="border-neutral-200 bg-white transition hover:-translate-y-1 hover:border-black hover:shadow-lg">
              <CardContent className="p-6">
                <service.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="font-black text-black">{service.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-neutral-50 py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <Badge variant="secondary">Featured singles</Badge>
              <h2 className="mt-3 text-3xl font-black text-black">Cards ready for your binder</h2>
            </div>
            <Button variant="outline" asChild>
              <Link href="/shop">View shop</Link>
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featuredCards.map((card) => (
              <Card key={card.id} className="overflow-hidden border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-black hover:shadow-xl">
                <div className="flex aspect-4/3 items-center justify-center bg-[linear-gradient(135deg,#fff7cc,#ffffff)]">
                  <div className="rounded-2xl border-2 border-primary bg-white p-5 shadow-sm">
                    <ShoppingBag className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <CardContent className="p-5">
                  <Badge variant="outline">{card.game}</Badge>
                  <h3 className="mt-3 min-h-12 font-black leading-6 text-black">{card.name}</h3>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-black text-primary">${card.price}</span>
                    <span className="text-sm font-semibold text-neutral-600">{card.condition}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-2 lg:px-8">
        <Card className="border-neutral-200 bg-white shadow-sm">
          <CardHeader>
            <Badge className="w-fit">Live now</Badge>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Gavel className="h-6 w-6 text-primary" />
              Auction block
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-neutral-600">Bid on graded slabs, sealed boxes, and hard-to-find singles.</p>
            <Button asChild>
              <Link href="/auctions">Browse auctions</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-neutral-200 bg-white shadow-sm">
          <CardHeader>
            <Badge className="w-fit">Events</Badge>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CalendarDays className="h-6 w-6 text-primary" />
              Upcoming tournaments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold">{event.title}</h3>
                    <p className="mt-1 text-sm text-neutral-600">{event.date} · {event.prize}</p>
                  </div>
                  <Badge variant="secondary">
                    <Users className="mr-1 h-3 w-3" />
                    {event.players}
                  </Badge>
                </div>
              </div>
            ))}
            <Button variant="outline" asChild>
              <Link href="/tournaments">See event calendar</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
