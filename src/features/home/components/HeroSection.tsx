"use client"

import Link from "next/link"
import { ArrowRight, Gavel, ShoppingBag, Sparkles, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Product } from "@/types"

type Props = {
  isSeller: boolean
  featuredProducts: Product[]
  activeFeaturedIndex: number
  onDotClick: (index: number) => void
}

export function HeroSection({ isSeller, featuredProducts, activeFeaturedIndex, onDotClick }: Props) {
  const active = featuredProducts[activeFeaturedIndex]

  return (
    <section className="relative overflow-hidden border-b border-black bg-primary text-black">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.42),transparent_45%)]" />
      <div className={`relative mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28 ${!isSeller && featuredProducts.length > 0 ? "lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-12" : ""}`}>
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
            {isSeller ? (
              <Button size="lg" className="bg-black text-white hover:bg-neutral-800" asChild>
                <Link href="/dashboard">
                  Go to Dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" className="bg-black text-white hover:bg-neutral-800" asChild>
                  <Link href="/shop">
                    Browse products <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" className="border border-black bg-white text-black hover:bg-white/90" asChild>
                  <Link href="/tournaments">
                    Join tournaments <Trophy className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {!isSeller && featuredProducts.length > 0 && (
          <div className="relative flex flex-col">
            <div className="relative">
              <div className="flex aspect-[4/5] items-center justify-center">
                {active?.image_url ? (
                  <img
                    src={active.image_url}
                    alt={active.name}
                    className="h-full w-full object-contain drop-shadow-2xl"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ShoppingBag className="h-24 w-24 text-primary" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-4 left-4 right-4 rounded-2xl border border-white/30 bg-white/60 p-4 shadow-2xl backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-600">{active?.category ?? "TCG"} · Featured</p>
                <h3 className="mt-1 line-clamp-2 text-xl font-black text-black">{active?.name ?? "Featured Product"}</h3>
                <Button className="mt-3 w-full bg-black text-white hover:bg-neutral-800" asChild>
                  <Link href={`/shop/${active?.id}`}>
                    View product <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            {featuredProducts.length > 1 && (
              <div className="mt-5 flex justify-center gap-2">
                {featuredProducts.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    aria-label={`Show featured product ${index + 1}`}
                    className={`h-2 rounded-full transition-all ${activeFeaturedIndex === index ? "w-6 bg-black" : "w-2 bg-black"}`}
                    onClick={() => onDotClick(index)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

type CtaSectionProps = { isSeller: boolean }

export function CtaSection({ isSeller }: CtaSectionProps) {
  if (isSeller) return null
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-2 lg:px-8">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <Badge className="w-fit">Live now</Badge>
        <h2 className="mt-3 flex items-center gap-2 text-2xl font-black">
          <Gavel className="h-6 w-6 text-primary" />
          Auction block
        </h2>
        <p className="mb-6 mt-2 text-neutral-600">Bid on graded slabs, sealed boxes, and hard-to-find singles.</p>
        <Button asChild><Link href="/auctions">Browse auctions</Link></Button>
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <Badge className="w-fit">Events</Badge>
        <h2 className="mt-3 flex items-center gap-2 text-2xl font-black">
          <Trophy className="h-6 w-6 text-primary" />
          Upcoming tournaments
        </h2>
        <p className="mb-6 mt-2 text-neutral-600">Join our community events and tournaments.</p>
        <Button variant="outline" asChild><Link href="/tournaments">See event calendar</Link></Button>
      </div>
    </section>
  )
}
