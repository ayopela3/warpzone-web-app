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
      className="relative"
      style={{ background: "linear-gradient(135deg, #1a1200 0%, #111 40%, #1c1400 100%)", color: "#fff" }}
    >
      {/* Yellow glow — top right */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 60% at 80% 10%, rgba(250,204,21,0.30), transparent 70%)" }} />
      {/* Warm tint — bottom left */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 40% at 10% 90%, rgba(250,160,21,0.12), transparent 60%)" }} />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className={`grid items-center gap-10 py-16 ${!isSeller && total > 0 ? "lg:grid-cols-[1fr_400px] lg:py-14" : ""}`}>

          {/* ── Left: copy ── */}
          <div className="flex flex-col justify-center">
            <span
              className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-6"
              style={{ background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.35)", color: "#facc15" }}
            >
              Your local TCG hobby shop — online
            </span>

            <h1
              className="text-5xl font-black tracking-tight leading-[1.05] lg:text-6xl"
              style={{ color: "#ffffff" }}
            >
              {isSeller ? (
                <>Manage your<br /><span style={{ color: "#facc15" }}>store</span> with ease.</>
              ) : (
                <>Cards, sealed,<br />auctions &amp;<br /><span style={{ color: "#facc15" }}>more.</span></>
              )}
            </h1>

            <p className="mt-6 text-base leading-relaxed max-w-lg" style={{ color: "rgba(255,255,255,0.75)" }}>
              {isSeller
                ? "Upload listings, manage pre-orders, and track your sales — all in one place."
                : "Browse verified singles, bid on grails, reserve upcoming releases, and join local tournaments at The Warpzone."}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {isSeller ? (
                <Button size="lg" className="bg-primary text-black font-bold hover:bg-primary/90" asChild>
                  <Link href="/dashboard">Go to Dashboard <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" className="bg-primary text-black font-bold hover:bg-primary/90" asChild>
                    <Link href="/shop">Shop now <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                  <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white" asChild>
                    <Link href="/auctions">Live auctions <Gavel className="h-4 w-4" /></Link>
                  </Button>
                  <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white" asChild>
                    <Link href="/tournaments">Tournaments <Trophy className="h-4 w-4" /></Link>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* ── Right: draggable featured product carousel ── */}
          {!isSeller && total > 0 && (
            <div className="relative flex flex-col select-none">

              {/* Card */}
              <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#fff" }}>

                {/* Image area */}
                <div
                  className="relative flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
                  style={{ height: "280px", background: "#fdf6e3" }}
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
                      className="h-full w-full object-contain pointer-events-none"
                    />
                  ) : (
                    <ShoppingBag className="h-20 w-20" style={{ color: "#ccc" }} />
                  )}

                  {/* Category badge */}
                  <span
                    className="absolute top-3 left-3 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
                    style={{ background: "#facc15", color: "#000" }}
                  >
                    {active?.category}
                  </span>
                </div>

                {/* Product info — white bg, dark text, always readable */}
                <div className="px-5 py-4" style={{ background: "#fff", borderTop: "1px solid #f0f0f0" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#999" }}>Featured</p>
                  <h3 className="text-base font-black leading-snug line-clamp-2" style={{ color: "#111" }}>{active?.name}</h3>
                  <p className="mt-1 text-2xl font-black" style={{ color: "#facc15", textShadow: "0 0 0 #000", WebkitTextStroke: "0.5px #d4a400" }}>
                    {fiatSymbol}{(active?.price ?? 0).toLocaleString()}
                  </p>
                  <Link
                    href={`/shop/${active?.id ?? ""}`}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                    style={{ background: "#facc15", color: "#000" }}
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
                        background: activeFeaturedIndex === i ? "#facc15" : "rgba(255,255,255,0.35)",
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
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-2 lg:px-8">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Live now</span>
        <h2 className="mt-3 flex items-center gap-2 text-2xl font-black">
          <Gavel className="h-6 w-6 text-primary" />
          Auction block
        </h2>
        <p className="mb-6 mt-2 text-neutral-600">Bid on graded slabs, sealed boxes, and hard-to-find singles.</p>
        <Button asChild><Link href="/auctions">Browse auctions</Link></Button>
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Events</span>
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
