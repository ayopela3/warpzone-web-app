"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, ShoppingBag, Trophy, Gavel } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Product } from "@/types"

type Props = {
  isSeller: boolean
  featuredProducts: Product[]
  activeFeaturedIndex: number
  fiatSymbol: string
  onDotClick: (index: number) => void
}

const DRAG_THRESHOLD = 40

export function HeroSection({ isSeller, featuredProducts, activeFeaturedIndex, fiatSymbol, onDotClick }: Props) {
  const active = featuredProducts[activeFeaturedIndex]
  const total  = featuredProducts.length

  const dragStartX = useRef<number | null>(null)
  const [dragDelta, setDragDelta] = useState(0)
  const [dragging, setDragging]   = useState(false)

  const goTo = (index: number) => { if (total === 0) return; onDotClick((index + total) % total) }

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX
    setDragging(true)
    setDragDelta(0)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || dragStartX.current === null) return
    setDragDelta(e.clientX - dragStartX.current)
  }

  const handlePointerUp = () => {
    if (dragStartX.current !== null) {
      if (dragDelta < -DRAG_THRESHOLD)     goTo(activeFeaturedIndex + 1)
      else if (dragDelta > DRAG_THRESHOLD) goTo(activeFeaturedIndex - 1)
    }
    dragStartX.current = null
    setDragging(false)
    setDragDelta(0)
  }

  return (
    <section
      className="relative border-b border-border bg-background text-foreground"
    >
      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className={`grid items-center gap-10 py-14 ${!isSeller && total > 0 ? "lg:grid-cols-[1.35fr_400px] lg:py-16" : ""}`}>

          {/* ── Left: copy ── */}
          <div className="flex flex-col justify-center">
            <span className="label-meta mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Your local TCG hobby shop — online
            </span>

            <h1 className="max-w-3xl text-5xl font-black leading-none text-foreground lg:text-6xl">
              {isSeller ? (
                <>Manage your<br /><span className="bg-primary px-2 text-primary-foreground">store</span> with ease.</>
              ) : (
                <>Cards, sealed,<br />auctions &amp;<br /><span className="bg-primary px-2 text-primary-foreground">more.</span></>
              )}
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              {isSeller
                ? "Upload listings, manage pre-orders, and track your sales — all in one place."
                : "Browse verified singles, bid on grails, reserve upcoming releases, and join local tournaments at The Warpzone."}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {isSeller ? (
                <Button size="lg" asChild>
                  <Link href="/dashboard" prefetch={false}>Go to Dashboard <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild>
                    <Link href="/shop" prefetch={false}>Shop now <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/auctions" prefetch={false}>Live auctions <Gavel className="h-4 w-4" /></Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/tournaments" prefetch={false}>Tournaments <Trophy className="h-4 w-4" /></Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* ── Right: draggable featured product carousel ── */}
          {!isSeller && total > 0 && (
            <div className="relative flex flex-col select-none">

              {/* Card */}
              <div className="overflow-hidden rounded-md border border-border bg-card">

                {/* Image area */}
                <div
                  style={{ height: "280px" }}
                  className="relative flex cursor-grab items-center justify-center overflow-hidden bg-muted active:cursor-grabbing"
                  onPointerDown={total > 1 ? handlePointerDown : undefined}
                  onPointerMove={total > 1 ? handlePointerMove : undefined}
                  onPointerUp={total > 1 ? handlePointerUp : undefined}
                  onPointerCancel={total > 1 ? handlePointerUp : undefined}
                >
                  {active?.image_url ? (
                    <img
                      src={active.image_url}
                      alt={active.name}
                      draggable={false}
                      style={{
                        transform: `scale(0.9) translateX(${dragging ? dragDelta * 0.15 : 0}px)`,
                        transition: dragging ? "none" : "transform 0.35s cubic-bezier(.4,0,.2,1)",
                      }}
                      className="pointer-events-none h-full w-full object-contain"
                    />
                  ) : (
                    <ShoppingBag className="h-20 w-20 text-muted-foreground/45" />
                  )}

                  {/* Category badge */}
                  <span
                    className="label-meta absolute left-3 top-3 rounded-full border border-primary bg-primary px-3 py-1 text-primary-foreground"
                  >
                    {active?.category}
                  </span>
                </div>

                {/* Product info — white bg, dark text, always readable */}
                <div className="border-t border-border bg-card px-5 py-4">
                  <p className="label-meta mb-1 text-muted-foreground">Featured</p>
                  <h3 className="line-clamp-2 text-base font-black leading-tight text-foreground">{active?.name}</h3>
                  <p className="price mt-2 text-2xl text-foreground">
                    {fiatSymbol}{(active?.price ?? 0).toLocaleString()}
                  </p>
                  <Link
                    href={`/shop/${active?.id ?? ""}`}
                    prefetch={false}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-primary bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
                  >
                    View product <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* Dot indicators */}
              {total > 1 && (
                <div className="mt-3 flex justify-center gap-1.5">
                  {featuredProducts.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-label={`Product ${i + 1}`}
                      onClick={() => onDotClick(i)}
                      style={{
                        height: "6px",
                        borderRadius: "9999px",
                        transition: "all 0.3s",
                        width: activeFeaturedIndex === i ? "24px" : "6px",
                        background: activeFeaturedIndex === i ? "var(--primary)" : "var(--border)",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </section>
  )
}

type CtaSectionProps = { isSeller: boolean }

export function CtaSection({ isSeller }: CtaSectionProps) {
  if (isSeller) return null
  return (
    <section className="mx-auto grid max-w-7xl gap-4 px-4 py-16 lg:grid-cols-2 lg:px-8">
      <div className="surface-panel p-6">
        <span className="label-meta inline-flex w-fit rounded-full border border-primary bg-primary px-3 py-1 text-primary-foreground">Live now</span>
        <h2 className="mt-4 flex items-center gap-2 text-2xl font-black">
          <Gavel className="h-6 w-6 text-primary" />
          Auction block
        </h2>
        <p className="mb-6 mt-2 text-muted-foreground">Bid on graded slabs, sealed boxes, and hard-to-find singles.</p>
        <Button asChild><Link href="/auctions" prefetch={false}>Browse auctions</Link></Button>
      </div>
      <div className="surface-panel p-6">
        <span className="label-meta inline-flex w-fit rounded-full border border-primary bg-primary px-3 py-1 text-primary-foreground">Events</span>
        <h2 className="mt-4 flex items-center gap-2 text-2xl font-black">
          <Trophy className="h-6 w-6 text-primary" />
          Upcoming tournaments
        </h2>
        <p className="mb-6 mt-2 text-muted-foreground">Join our community events and tournaments.</p>
        <Button variant="outline" asChild><Link href="/tournaments" prefetch={false}>See event calendar</Link></Button>
      </div>
    </section>
  )
}
