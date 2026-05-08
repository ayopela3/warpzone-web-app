"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  ShoppingCart, Truck, Store, CheckCircle2, ArrowRight, ArrowLeft,
  Loader2, QrCode, Package, AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { useApp } from "@/components/shared/app-provider"
import { ordersApi } from "@/lib/api-client"
import type { FulfillmentType } from "@/types"

type Step = "review" | "payment" | "confirmed"

type SellerQr = {
  payment_qr_url: string | null
  seller_name: string | null
  seller_business: string | null
}

export default function CheckoutPage() {
  const router = useRouter()
  const { cartItems, cartTotal, cartCount, fiatSymbol, isAuthenticated, userId, clearCart } = useApp()

  const [step, setStep] = useState<Step>("review")
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("pickup")
  const [notes, setNotes] = useState("")
  const [sellerQr, setSellerQr] = useState<SellerQr | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?next=/checkout`)
      return
    }
    if (cartItems.length === 0 && step === "review") {
      router.push("/cart")
    }
  }, [isAuthenticated, cartItems.length, step, router])

  /**
   * Derive the seller ID from the first cart item.
   * CartItem stores product id; we look up seller_id via the product detail
   * endpoint if not stored directly. For now, cart items carry seller_id
   * when added via ProductCard (handled in the seller QR public endpoint).
   */
  const cartSellerId = (cartItems[0] as unknown as { seller_id?: string }).seller_id ?? ""

  /** Fetch the seller's payment QR when moving to payment step */
  const fetchSellerQr = async () => {
    setLoadingQr(true)
    try {
      const qs = cartSellerId ? `?sellerId=${encodeURIComponent(cartSellerId)}` : ""
      const res = await fetch(`/api/seller/payment-qr-public${qs}`)
      const data = await res.json() as SellerQr & { success: boolean }
      if (data.success) setSellerQr(data)
    } catch {
      toast.error("Could not load payment details. Please try again.")
    } finally {
      setLoadingQr(false)
    }
  }

  const handleProceedToPayment = async () => {
    await fetchSellerQr()
    setStep("payment")
  }

  const handlePlaceOrder = async () => {
    if (!userId) {
      toast.error("Please sign in to continue.")
      return
    }

    setPlacingOrder(true)
    try {
      const items = cartItems.map((item) => ({
        product_id: item.id,
        listing_id: item.id,
        seller_id: (item as unknown as { seller_id?: string }).seller_id ?? "",
        quantity: item.quantity,
        price: item.price,
      }))

      const result = await ordersApi.create({
        items,
        seller_id: items[0]?.seller_id ?? "",
        total: cartTotal,
        fulfillment_type: fulfillment,
        notes: notes.trim() || undefined,
      })

      if (!result.success) {
        throw new Error(result.error ?? "Failed to place order")
      }

      setOrderId(result.orderId ?? null)
      clearCart()
      setStep("confirmed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order")
    } finally {
      setPlacingOrder(false)
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8">
          <h1 className="text-2xl font-black text-gray-900">Checkout</h1>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {(["review", "payment", "confirmed"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  step === s
                    ? "bg-primary text-white"
                    : step === "confirmed" || (step === "payment" && s === "review")
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                }`}>
                  {(step === "confirmed" && s !== "confirmed") || (step === "payment" && s === "review")
                    ? <CheckCircle2 className="h-4 w-4" />
                    : i + 1}
                </div>
                <span className={`text-sm font-medium capitalize hidden sm:block ${step === s ? "text-gray-900" : "text-gray-400"}`}>
                  {s === "review" ? "Review" : s === "payment" ? "Payment" : "Confirmed"}
                </span>
                {i < 2 && <ArrowRight className="h-3 w-3 text-gray-300" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">

        {/* ── STEP 1: REVIEW ──────────────────────────────────────── */}
        {step === "review" && (
          <div className="space-y-6">
            {/* Items */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Order Items ({cartCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-gray-100">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 py-3">
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                      <p className="text-sm text-gray-500 capitalize">{item.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">{fiatSymbol}{(item.price * item.quantity).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">x{item.quantity} @ {fiatSymbol}{item.price.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Fulfillment */}
            <Card className="bg-white shadow-sm">
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
                      className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition text-left ${
                        fulfillment === type ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        fulfillment === type ? "border-primary" : "border-gray-300"
                      }`}>
                        {fulfillment === type && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-semibold text-gray-900">
                          {type === "pickup"
                            ? <Store className="h-4 w-4 text-primary" />
                            : <Truck className="h-4 w-4 text-primary" />}
                          {type === "pickup" ? "In-store Pickup" : "Shipping"}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
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
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Order Notes <span className="font-normal text-gray-400">(optional)</span></CardTitle>
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
            <Card className="bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span>Subtotal ({cartCount} items)</span>
                  <span>{fiatSymbol}{cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between font-black text-lg border-t pt-3">
                  <span>Total</span>
                  <span className="text-primary">{fiatSymbol}{cartTotal.toLocaleString()}</span>
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
              <Button className="flex-1 bg-primary hover:bg-primary/90 text-white" onClick={handleProceedToPayment}>
                Proceed to Payment
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: PAYMENT QR ─────────────────────────────────── */}
        {step === "payment" && (
          <div className="space-y-6">
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <QrCode className="h-5 w-5 text-primary" />
                  Scan & Pay
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingQr ? (
                  <div className="flex flex-col items-center py-10 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-gray-500">Loading payment details...</p>
                  </div>
                ) : sellerQr?.payment_qr_url ? (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-gray-700 text-center">
                      Scan the QR code below to send payment via GCash, Maya, or your bank.
                    </p>
                    <div className="border-4 border-primary rounded-2xl p-3 bg-white shadow-lg">
                      <div className="relative h-56 w-56">
                        <Image
                          src={sellerQr.payment_qr_url}
                          alt="Payment QR Code"
                          fill
                          className="object-contain rounded-lg"
                        />
                      </div>
                    </div>
                    {(sellerQr.seller_business ?? sellerQr.seller_name) && (
                      <p className="text-sm text-gray-500 text-center">
                        Pay to: <span className="font-semibold text-gray-800">
                          {sellerQr.seller_business ?? sellerQr.seller_name}
                        </span>
                      </p>
                    )}
                    <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-amber-800">Amount to pay</p>
                      <p className="text-3xl font-black text-amber-700 mt-1">
                        {fiatSymbol}{cartTotal.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-10 gap-3 text-center">
                    <AlertCircle className="h-10 w-10 text-amber-500" />
                    <p className="font-semibold text-gray-800">Payment QR not available</p>
                    <p className="text-sm text-gray-500">
                      The seller has not uploaded a payment QR yet. Please contact them directly to arrange payment.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-blue-50 border-blue-200 shadow-sm">
              <CardContent className="p-5">
                <p className="font-semibold text-blue-800 mb-2">How it works</p>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Scan the QR and send the exact amount shown.</li>
                  <li>Take a screenshot of your payment confirmation.</li>
                  <li>Click <strong>I&apos;ve Paid</strong> below to notify the seller.</li>
                  <li>The seller will verify and confirm your order.</li>
                </ol>
              </CardContent>
            </Card>

            {/* Fulfillment summary */}
            <Card className="bg-white shadow-sm">
              <CardContent className="p-5 flex items-center gap-3 text-sm text-gray-600">
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
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold"
                onClick={handlePlaceOrder}
                disabled={placingOrder}
              >
                {placingOrder
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Placing Order…</>
                  : <>I&apos;ve Paid — Place Order <ArrowRight className="h-4 w-4 ml-2" /></>}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: CONFIRMED ──────────────────────────────────── */}
        {step === "confirmed" && (
          <div className="space-y-6">
            <Card className="bg-white shadow-sm text-center">
              <CardContent className="p-10 space-y-4">
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-gray-900">Order Placed!</h2>
                <p className="text-gray-600 max-w-sm mx-auto">
                  Your order is now <strong>pending payment confirmation</strong> from the seller.
                  You can track its status in your dashboard.
                </p>
                {orderId && (
                  <p className="text-xs text-gray-400 font-mono">Order ID: {orderId}</p>
                )}
              </CardContent>
            </Card>

            {/* What happens next */}
            <Card className="bg-white shadow-sm">
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
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{title}</p>
                      <p className="text-sm text-gray-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/shop">Continue Shopping</Link>
              </Button>
              <Button asChild className="flex-1 bg-primary hover:bg-primary/90 text-white">
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
