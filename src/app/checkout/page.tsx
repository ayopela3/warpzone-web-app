"use client"

export const runtime = "edge"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  ShoppingCart, Truck, Store, CheckCircle2, ArrowRight, ArrowLeft,
  Loader2, QrCode, Package, AlertCircle, Upload, ImageIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useApp } from "@/components/shared/app-provider"
import { ordersApi } from "@/lib/api-client"
import type { FulfillmentType, CartItem } from "@/types"

type Step = "review" | "payment" | "confirmed"

type PlatformQr = {
  payment_qr_url: string | null
  seller_name?: string
}

type SellerGroup = {
  sellerId: string
  items: CartItem[]
}

export default function CheckoutPage() {
  const router = useRouter()
  const { cartItems, fiatSymbol, isAuthenticated, userId, removeFromCart } = useApp()

  const [step, setStep] = useState<Step>("review")
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("pickup")
  const [notes, setNotes] = useState("")

  /** Which seller group the user is currently paying (0-indexed) */
  const [currentGroupIdx, setCurrentGroupIdx] = useState(0)

  const [platformQr, setPlatformQr] = useState<PlatformQr | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [placedOrderIds, setPlacedOrderIds] = useState<string[]>([])
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)

  /** IDs of items the user has selected for this checkout */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(cartItems.map((i) => i.id)))

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?next=/checkout`)
      return
    }
    if (cartItems.length === 0 && step === "review") {
      router.push("/cart")
    }
  }, [isAuthenticated, cartItems.length, step, router])

  /** Items selected for this checkout */
  const selectedItems = cartItems.filter((i) => selectedIds.has(i.id))

  /** Selected items grouped by seller — stable across renders */
  const sellerGroups: SellerGroup[] = Object.values(
    selectedItems.reduce<Record<string, SellerGroup>>((acc, item) => {
      const key = item.seller_id ?? "__unknown__"
      if (!acc[key]) acc[key] = { sellerId: key, items: [] }
      acc[key].items.push(item)
      return acc
    }, {})
  )

  const selectedTotal = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const selectedCount = selectedItems.reduce((s, i) => s + i.quantity, 0)

  /** The group currently being paid */
  const activeGroup = sellerGroups[currentGroupIdx]
  const activeGroupTotal = activeGroup?.items.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0

  const toggleItem = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })

  const toggleAll = () =>
    setSelectedIds(
      selectedIds.size === cartItems.length
        ? new Set()
        : new Set(cartItems.map((i) => i.id))
    )

  /** Resolve seller ID for a group — handles admin pre-orders and falls back to product API for legacy cart items */
  const resolveGroupSellerId = async (group: SellerGroup): Promise<string | null> => {
    let sellerId = group.sellerId
    if (!sellerId || sellerId === "__unknown__") {
      const firstItem = group.items[0]
      if (firstItem) {
        // For admin-created pre-orders, use the admin profile as seller
        if (firstItem.itemType === "pre_order" && !firstItem.seller_id) {
          // Use the admin profile as the seller for admin-created pre-orders
          const res = await fetch(`/api/admin/profile`)
          const data = await res.json() as { success: boolean; profile?: { id: string } }
          if (data.success && data.profile?.id) {
            sellerId = data.profile.id
          }
        } else {
          // Try to get seller info from products API for regular products
          const res = await fetch(`/api/products/${firstItem.id}`)
          const data = await res.json() as { success: boolean; product?: { created_by?: string } }
          if (data.success && data.product?.created_by) sellerId = data.product.created_by
        }
      }
    }
    return sellerId && sellerId !== "__unknown__" ? sellerId : null
  }

  /** Fetch the seller's payment QR for the active group */
  const fetchQrForGroup = async () => {
    setPlatformQr(null)
    setLoadingQr(true)
    try {
      // Get seller ID from active group
      const sellerId = await resolveGroupSellerId(activeGroup)
      if (!sellerId) {
        toast.error("Could not identify seller for this order.")
        return
      }
      
      let qrUrl: string | null = null
      let sellerName: string = "Seller"
      
      // Check if this is the admin seller - if so, use platform QR
      if (sellerId === "a1b2c3d4-e5f6-7890-abcd-ef1234567890") {
        // Fetch platform QR code for admin
        const platformRes = await fetch("/api/settings/payment-qr")
        const platformData = await platformRes.json() as { success: boolean; payment_qr_url?: string | null }
        if (platformData.success && platformData.payment_qr_url) {
          qrUrl = platformData.payment_qr_url
          sellerName = "Warpzone"
        }
      } else {
        // Fetch regular seller's public QR
        const res = await fetch(`/api/seller/payment-qr-public?sellerId=${encodeURIComponent(sellerId)}`)
        const data = await res.json() as { success: boolean; payment_qr_url?: string; seller_name?: string; seller_business?: string; error?: string }
        
        if (data.success && data.payment_qr_url) {
          qrUrl = data.payment_qr_url
          sellerName = data.seller_business || data.seller_name || "Seller"
        } else {
          toast.error(data.error || "Seller has not set up payment QR yet.")
          return
        }
      }
      
      if (qrUrl) {
        setPlatformQr({
          payment_qr_url: qrUrl,
          seller_name: sellerName
        })
      } else {
        toast.error("Payment QR code not available. Please contact support.")
      }
    } catch {
      toast.error("Could not load payment details. Please try again.")
    } finally {
      setLoadingQr(false)
    }
  }

  const handleProceedToPayment = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to checkout.")
      return
    }
    setCurrentGroupIdx(0)
    await fetchQrForGroup()
    setStep("payment")
  }

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingProof(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json() as { success: boolean; url?: string; error?: string }
      if (!data.success || !data.url) throw new Error(data.error ?? "Upload failed")
      setProofUrl(data.url)
      toast.success("Payment proof uploaded")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploadingProof(false)
      e.target.value = ""
    }
  }

  /** Place order for the current seller group, then advance to next group or finish */
  const handlePlaceOrder = async () => {
    if (!userId) { toast.error("Please sign in to continue."); return }
    if (!proofUrl) { toast.error("Please upload your payment screenshot first."); return }
    if (!activeGroup) return

    setPlacingOrder(true)
    try {
      const sellerId = await resolveGroupSellerId(activeGroup) ?? ""

      // Regular products carry their concrete product_listing id from the cart.
      const itemsWithListingIds = activeGroup.items.map((item) => {
        // Pre-orders don't have product_listings entries
        if (item.itemType === "pre_order") {
          return {
            product_id: item.id,
            listing_id: null, // Pre-orders don't use product_listings
            seller_id: sellerId,
            quantity: item.quantity,
            price: item.price,
            pre_order_id: item.preOrderId,
          }
        }

        return {
          product_id: item.id,
          listing_id: item.listing_id ?? null,
          seller_id: sellerId,
          quantity: item.quantity,
          price: item.price,
          pre_order_id: undefined,
        }
      })

      // Payment proof is MANDATORY - must be provided with order
      if (!proofUrl) {
        throw new Error("Payment proof is required. Please upload your payment screenshot.")
      }

      const result = await ordersApi.create({
        items: itemsWithListingIds,
        seller_id: sellerId,
        total: activeGroupTotal,
        fulfillment_type: fulfillment,
        notes: notes.trim() || undefined,
        payment_proof_url: proofUrl, // Include proof in creation
      })

      if (!result.success) throw new Error(result.error ?? "Failed to place order")

      /** Remove this group's items from the cart */
      activeGroup.items.forEach((item) => removeFromCart(item.id))
      setPlacedOrderIds((prev) => [...prev, result.orderId ?? ""])

      const nextIdx = currentGroupIdx + 1
      if (nextIdx < sellerGroups.length) {
        /** More seller groups remain — advance to the next one */
        setCurrentGroupIdx(nextIdx)
        setProofUrl(null)
        await fetchQrForGroup()
        toast.success(`Order placed! Now pay the next seller.`)
      } else {
        /** All groups paid — done */
        setStep("confirmed")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order")
    } finally {
      setPlacingOrder(false)
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8">
          <p className="label-meta mb-2 text-foreground">Secure order flow</p>
          <h1 className="text-2xl font-black text-foreground">Checkout</h1>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {(["review", "payment", "confirmed"] as Step[]).map((s, i) => {
              const isPast =
                (s === "review" && (step === "payment" || step === "confirmed")) ||
                (s === "payment" && step === "confirmed")
              const isActive = step === s
              return (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  isPast
                    ? "bg-green-600 text-white"
                    : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}>
                  {isPast ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`hidden text-sm font-medium sm:block ${isActive ? "font-semibold text-foreground" : isPast ? "text-green-700" : "text-muted-foreground"}`}>
                  {s === "review" ? "Review" : s === "payment" ? "Payment" : "Confirmed"}
                </span>
                {i < 2 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
              </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">

        {/* ── STEP 1: REVIEW ──────────────────────────────────────── */}
        {step === "review" && (
          <div className="space-y-6">
            {/* Items — grouped by seller with checkboxes */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    Select Items to Checkout
                  </CardTitle>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs font-bold text-foreground underline"
                  >
                    {selectedIds.size === cartItems.length ? "Deselect all" : "Select all"}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Group by seller */}
                {Object.values(
                  cartItems.reduce<Record<string, { sellerId: string; sellerName?: string; items: typeof cartItems }>>((acc, item) => {
                    const key = item.seller_id ?? "__unknown__"
                    if (!acc[key]) acc[key] = { sellerId: key, items: [] }
                    acc[key].items.push(item)
                    return acc
                  }, {})
                ).map((group) => (
                  <div key={group.sellerId}>
                    {/* Seller header */}
                    <div className="mb-2 flex items-center gap-2 border-b border-border pb-1.5">
                      <Store className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="label-meta text-muted-foreground">
                        {group.sellerId === "__unknown__" ? "Warpzone Shop" : `Seller · ${group.sellerId.slice(0, 8)}…`}
                      </span>
                    </div>
                    {group.items.map((item) => (
                      <label
                        key={item.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-3 transition ${
                          selectedIds.has(item.id) ? "bg-muted" : "hover:bg-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="h-4 w-4 accent-primary shrink-0"
                        />
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs capitalize text-muted-foreground">{item.category}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">{fiatSymbol}{(item.price * item.quantity).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">×{item.quantity} @ {fiatSymbol}{item.price.toLocaleString()}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Fulfillment */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">How would you like to receive your order?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(["pickup", "shipping"] as FulfillmentType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFulfillment(type)}
                      className={`flex w-full cursor-pointer items-start gap-4 rounded-md border p-4 text-left transition ${
                        fulfillment === type ? "border-foreground bg-muted" : "border-border hover:border-foreground"
                      }`}
                    >
                      <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        fulfillment === type ? "border-primary" : "border-border"
                      }`}>
                        {fulfillment === type && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-semibold text-foreground">
                          {type === "pickup"
                            ? <Store className="h-4 w-4 text-primary" />
                            : <Truck className="h-4 w-4 text-primary" />}
                          {type === "pickup" ? "In-store Pickup" : "Shipping"}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {type === "pickup"
                            ? "Collect your order at the shop once the seller marks it ready."
                            : "Contact the seller after payment is confirmed to arrange delivery."}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Order Notes <span className="font-normal text-muted-foreground">(optional)</span></CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Any special requests or notes for the seller..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Order total */}
            <Card>
              <CardContent className="p-6">
                <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Selected ({selectedCount} item{selectedCount !== 1 ? "s" : ""})</span>
                  <span>{fiatSymbol}{selectedTotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-lg font-black">
                  <span>Total</span>
                  <span className="text-foreground">{fiatSymbol}{selectedTotal.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/cart">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Cart
                </Link>
              </Button>
              <Button className="flex-1" onClick={handleProceedToPayment}>
                Proceed to Payment
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: PAYMENT QR ─────────────────────────────────── */}
        {step === "payment" && (
          <div className="space-y-6">

            {/* Multi-seller progress bar */}
            {sellerGroups.length > 1 && (
              <div className="rounded-md border border-border bg-card p-4">
                <p className="label-meta mb-3 text-muted-foreground">
                  Payment progress — {currentGroupIdx + 1} of {sellerGroups.length} sellers
                </p>
                <div className="flex gap-2">
                  {sellerGroups.map((g, idx) => (
                    <div key={g.sellerId} className="flex-1 flex flex-col gap-1">
                      <div className={`h-2 rounded-full ${
                        idx < currentGroupIdx ? "bg-green-600" :
                        idx === currentGroupIdx ? "bg-primary" : "bg-border"
                      }`} />
                      <span className="truncate text-xs text-muted-foreground">
                        {idx < currentGroupIdx ? "✓ Paid" :
                         idx === currentGroupIdx ? "Paying now" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active group items summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" />
                  <span className="label-meta text-muted-foreground">
                    {sellerGroups.length > 1
                      ? `Seller ${currentGroupIdx + 1} of ${sellerGroups.length}`
                      : "Your Order"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="divide-y divide-border pt-0">
                {activeGroup?.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-foreground">
                      {fiatSymbol}{(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <QrCode className="h-5 w-5 text-primary" />
                  Scan &amp; Pay
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingQr ? (
                  <div className="flex flex-col items-center py-10 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading payment details...</p>
                  </div>
                ) : platformQr?.payment_qr_url ? (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-center text-muted-foreground">
                      Scan the QR code below to send payment directly to the seller via GCash, Maya, or your bank.
                    </p>
                    <div className="rounded-md border border-primary bg-card p-3">
                      <div className="relative h-56 w-56">
                        <Image
                          src={platformQr.payment_qr_url}
                          alt="Payment QR Code"
                          fill
                          className="object-contain rounded-lg"
                        />
                      </div>
                    </div>
                    <p className="text-center text-sm text-muted-foreground">
                      Pay to: <span className="font-semibold text-foreground">{platformQr.seller_name}</span>
                    </p>
                    <div className="w-full rounded-md border border-border bg-muted p-4">
                      <p className="label-meta text-muted-foreground">Amount to pay</p>
                      <p className="price mt-2 text-3xl text-foreground">
                        {fiatSymbol}{activeGroupTotal.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-10 gap-3 text-center">
                    <AlertCircle className="h-10 w-10 text-amber-500" />
                    <p className="font-semibold text-foreground">Payment QR not available</p>
                    <p className="text-sm text-muted-foreground">
                      The seller has not uploaded a payment QR yet. Please contact them directly to arrange payment.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="border-preorder/25 bg-muted">
              <CardContent className="p-5">
                <p className="mb-2 font-semibold text-foreground">How it works</p>
                <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                  <li>Scan the QR and send the exact amount shown.</li>
                  <li>Take a screenshot of your payment confirmation.</li>
                  <li>Upload the screenshot below.</li>
                  <li>Click <strong>Place Order</strong> — the seller will verify and confirm.</li>
                </ol>
              </CardContent>
            </Card>

            {/* Proof of payment upload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Upload className="h-4 w-4 text-primary" />
                  Upload Payment Screenshot <span className="text-red-500">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {proofUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative h-40 w-full overflow-hidden rounded-md border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={proofUrl} alt="Payment proof" className="h-full w-full object-contain bg-muted" />
                    </div>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                      onClick={() => setProofUrl(null)}
                    >
                      Remove & re-upload
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border py-8 transition hover:border-foreground hover:bg-muted">
                    {uploadingProof
                      ? <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">
                      {uploadingProof ? "Uploading…" : "Click to upload your payment screenshot"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadProof}
                      disabled={uploadingProof}
                    />
                  </label>
                )}
              </CardContent>
            </Card>

            {/* Fulfillment summary */}
            <Card>
              <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
                {fulfillment === "pickup"
                  ? <Store className="h-5 w-5 text-primary shrink-0" />
                  : <Truck className="h-5 w-5 text-primary shrink-0" />}
                <span>
                  {fulfillment === "pickup"
                    ? "You selected in-store pickup. The seller will mark your order ready when it's available."
                    : "You selected shipping. Contact the seller to arrange delivery after payment is confirmed."}
                </span>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("review")}
                disabled={placingOrder}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                className="flex-1 font-bold"
                onClick={handlePlaceOrder}
                disabled={placingOrder || !proofUrl}
              >
                {placingOrder
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Placing Order…</>
                  : currentGroupIdx < sellerGroups.length - 1
                    ? <>Place Order &amp; Pay Next Seller <ArrowRight className="h-4 w-4 ml-2" /></>
                    : <>Place Order <ArrowRight className="h-4 w-4 ml-2" /></>}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: CONFIRMED ──────────────────────────────────── */}
        {step === "confirmed" && (
          <div className="space-y-6">
            <Card className="text-center">
              <CardContent className="p-10 space-y-4">
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-green-700" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-foreground">
                  {placedOrderIds.length > 1 ? "All Orders Placed!" : "Order Placed!"}
                </h2>
                <p className="mx-auto max-w-sm text-muted-foreground">
                  {placedOrderIds.length > 1
                    ? `${placedOrderIds.length} orders are now pending payment confirmation from each seller.`
                    : "Your order is now pending payment confirmation from the seller."}
                  {" "}You can track their status in your dashboard.
                </p>
                {placedOrderIds.length > 0 && (
                  <div className="space-y-1">
                    {placedOrderIds.map((id, i) => id && (
                      <p key={id} className="font-mono text-xs text-muted-foreground">
                        {placedOrderIds.length > 1 ? `Order ${i + 1}: ` : "Order ID: "}{id}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* What happens next */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">What happens next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: Loader2, title: "Seller verifies payment", desc: "The seller will review your payment and confirm the transaction." },
                  { icon: CheckCircle2, title: "Order confirmed", desc: "Once verified, your order status updates to Confirmed and the item is reserved for you." },
                  { icon: Store, title: "Ready for pickup / shipping", desc: fulfillment === "pickup"
                    ? "The seller will mark it Ready for Pickup — head to the shop to collect your items."
                    : "Contact the seller to arrange shipping after the order is confirmed." },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/shop">Continue Shopping</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/dashboard">
                  View My Orders
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
