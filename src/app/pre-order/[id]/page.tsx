import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { ArrowLeft, Calendar, Users, Clock, Package, ShieldCheck, CalendarClock } from "lucide-react"
import ReserveButton from "./reserve-button"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = "edge"

/**
 * Shape returned from the DB query — keeps the component free of `any`.
 */
interface PreOrderRow {
  id: string
  title: string
  description: string | null
  game: string
  image_url: string | null
  price: number
  full_price: number
  downpayment_amount: number | null
  downpayment_pct: number | null
  cutoff_date: string | null
  release_date: string
  status: "active" | "closed"
  approval_status: string
  seller_id: string | null
  max_slots: number | null
  created_at: string
  seller_name: string | null
  seller_business: string | null
  reservation_count: number
}

/**
 * Pre-order detail page — mirrors the product detail page layout
 * (`/shop/[id]`) with pre-order-specific info (release date, slots, etc.).
 */
export default async function PreOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let db: CloudflareEnv["DB"] | null = null
  try {
    const { getRequestContext } = await import("@cloudflare/next-on-pages")
    const { env } = getRequestContext()
    db = (env as CloudflareEnv).DB
  } catch {
    return notFound()
  }

  if (!db) return notFound()

  // Fetch the pre-order with seller info and reservation count
  const row = await db
    .prepare(
      `
      SELECT
        po.*,
        pr.full_name     AS seller_name,
        pr.business_name AS seller_business,
        COUNT(por.id)    AS reservation_count
      FROM pre_orders po
      LEFT JOIN profiles pr  ON po.seller_id = pr.id
      LEFT JOIN pre_order_reservations por ON po.id = por.pre_order_id
      WHERE po.id = ?
        AND po.approval_status = 'approved'
      GROUP BY po.id
      LIMIT 1
      `,
    )
    .bind(id)
    .first<PreOrderRow>()

  if (!row) return notFound()

  // Fetch fiat symbol — gracefully degrade if settings table is missing
  let fiatSymbol = "PHP"
  try {
    const fiatResult = await db
      .prepare("SELECT value FROM settings WHERE key = 'fiat_symbol'")
      .first<{ value: string }>()
    if (fiatResult?.value) fiatSymbol = fiatResult.value
  } catch {
    // Settings table may not exist yet; fall back to default
  }

  const isClosed = row.status === "closed"
  const isFull =
    row.max_slots !== null && row.reservation_count >= row.max_slots
  const slotsLeft =
    row.max_slots !== null ? row.max_slots - row.reservation_count : null
  const sellerDisplay = row.seller_business ?? row.seller_name ?? "The Warpzone"
  const hasDownpayment =
    row.downpayment_amount !== null && row.downpayment_amount > 0

  const releaseFormatted = new Date(row.release_date).toLocaleDateString(
    "en-PH",
    { month: "long", day: "numeric", year: "numeric" },
  )

  const cutoffFormatted = row.cutoff_date
    ? new Date(row.cutoff_date).toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-12 lg:px-8">
        {/* ── Back link ── */}
        <Link
          href="/pre-order"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pre-orders
        </Link>

        {/* ── Main grid ── */}
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14 items-start">
          {/* Image panel */}
          <div
            className="rounded-2xl overflow-hidden bg-[#fdf6e3] border border-border flex items-center justify-center"
            style={{ minHeight: "420px" }}
          >
            {row.image_url ? (
              <Image
                src={row.image_url}
                alt={row.title}
                width={600}
                height={600}
                className="max-h-[500px] w-full object-contain p-8"
              />
            ) : (
              <div className="flex h-[500px] w-full items-center justify-center">
                <Package className="h-20 w-20 text-primary/30" />
              </div>
            )}
          </div>

          {/* Pre-order info */}
          <div className="flex flex-col">
            {/* Pill tags */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="inline-flex items-center rounded-full bg-primary/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
                {row.game}
              </span>
              <span className="inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                Pre-order
              </span>
              {isClosed ? (
                <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Closed
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-green-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  Active
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground leading-tight lg:text-5xl">
              {row.title}
            </h1>

            {/* Seller */}
            <p className="mt-2 text-sm text-muted-foreground">
              by {sellerDisplay}
            </p>

            {/* Description */}
            {row.description && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {row.description}
              </p>
            )}

            {/* Price + CTA card */}
            <div className="mt-8 rounded-2xl border border-border bg-muted/40 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    {hasDownpayment ? "Down Payment" : "Price"}
                  </p>
                  <p className="font-display text-3xl font-extrabold text-foreground leading-none">
                    {fiatSymbol}
                    {row.price.toLocaleString()}
                  </p>
                  {hasDownpayment && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Full price: {fiatSymbol}
                      {row.full_price.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                    isClosed || isFull
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/90 text-primary-foreground"
                  }`}
                >
                  {isClosed
                    ? "Closed"
                    : isFull
                      ? "Fully Reserved"
                      : slotsLeft !== null
                        ? `${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} left`
                        : "Open"}
                </span>
              </div>

              <ReserveButton
                preOrderId={row.id}
                title={row.title}
                price={row.price}
                game={row.game}
                sellerId={row.seller_id}
                maxSlots={row.max_slots}
                reservationCount={row.reservation_count}
                isClosed={isClosed}
              />
            </div>

            {/* Info cards */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              {/* Release date card */}
              <div className="rounded-2xl border border-border bg-white p-6">
                <Calendar className="h-6 w-6 text-primary mb-4" />
                <h2 className="font-display font-extrabold text-lg text-foreground leading-snug">
                  Release Date
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {releaseFormatted}
                </p>
              </div>

              {/* Reservations card */}
              <div className="rounded-2xl border border-border bg-white p-6">
                <Users className="h-6 w-6 text-primary mb-4" />
                <h2 className="font-display font-extrabold text-lg text-foreground leading-snug">
                  Reservations
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {row.reservation_count} reserved
                  {row.max_slots !== null && ` of ${row.max_slots} slots`}
                </p>
              </div>

              {/* Cutoff date card — only if set */}
              {cutoffFormatted && (
                <div className="rounded-2xl border border-border bg-white p-6">
                  <CalendarClock className="h-6 w-6 text-primary mb-4" />
                  <h2 className="font-display font-extrabold text-lg text-foreground leading-snug">
                    Cutoff Date
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {cutoffFormatted}
                  </p>
                </div>
              )}

              {/* Verified condition card */}
              <div className="rounded-2xl border border-border bg-white p-6">
                <ShieldCheck className="h-6 w-6 text-primary mb-4" />
                <h2 className="font-display font-extrabold text-lg text-foreground leading-snug">
                  Verified listing
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Every pre-order is reviewed and approved before publishing.
                </p>
              </div>

              {/* Slots remaining card — only if limited */}
              {slotsLeft !== null && !isClosed && (
                <div className="rounded-2xl border border-border bg-white p-6">
                  <Clock className="h-6 w-6 text-primary mb-4" />
                  <h2 className="font-display font-extrabold text-lg text-foreground leading-snug">
                    {slotsLeft <= 0 ? "No Slots Left" : "Limited Slots"}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {slotsLeft <= 0
                      ? "This pre-order is fully reserved."
                      : slotsLeft <= 5
                        ? `Only ${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} remaining — reserve now!`
                        : `${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} still available.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
