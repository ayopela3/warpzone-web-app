"use client"

import { useState } from "react"
import Link from "next/link"
import { Package, Wallet, AlertTriangle, Ban, ChevronLeft, Info, ChevronDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function HowPreOrdersWorkPage() {
  const [openSection, setOpenSection] = useState<string | null>("down-payment")

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }

  return (
    <div className="min-h-screen">
      {/* Full-width Header Background */}
      <div className="bg-surface-container-low border-b border-border">
        <div className="mx-auto max-w-3xl px-4 lg:px-8 py-8 md:py-12">
          {/* Back Link */}
          <Link href="/pre-order">
            <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Pre-Orders
            </Button>
          </Link>

          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground mb-3">
              How <span className="text-primary">Pre-Orders</span> Work
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to know before placing a pre-order at The Warpzone — payments,
              allocation, cancellations, shipping, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 lg:px-8 py-6 md:py-8">
        <div className="space-y-3">
          {/* Down Payment Section */}
          <Card className="border-border overflow-hidden">
            <button
              onClick={() => toggleSection("down-payment")}
              className="w-full p-4 flex items-center gap-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <h2 className="font-bold text-foreground text-base">Down Payment</h2>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${openSection === "down-payment" ? "rotate-180" : ""}`} />
            </button>
            {openSection === "down-payment" && (
              <div className="p-4 space-y-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Pay <span className="font-semibold text-primary">10-100%</span> upfront · Balance collected on arrival or 1 week before release ·{" "}
                  <span className="font-semibold text-primary">Bank Transfer recommended</span> for lowest fees
                </p>

                <div className="pt-2">
                  <p className="text-sm text-foreground leading-relaxed">
                    Most pre-orders require a <strong>Down Payment (DP)</strong> to secure your allocation. 
                    The DP percentage varies per product and is stated on each listing. The remaining 
                    balance is collected either when stock arrives or up to 1 week before the release 
                    date — whichever applies will be specified per product. Down payments are non-refundable 
                    once your order is locked in.
                  </p>
                </div>

                {/* Example Box */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Example — 50% DP on 2 Boxes
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Product Price</span>
                      <span className="font-medium">₱3,500 / box</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity</span>
                      <span className="font-medium">2 boxes</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-2">
                      <span className="text-muted-foreground">Order Total</span>
                      <span className="font-bold">₱7,000</span>
                    </div>
                    <div className="flex justify-between text-primary font-semibold">
                      <span>Down Payment (50%)</span>
                      <span>₱3,500</span>
                    </div>
                    <div className="flex justify-between text-destructive font-semibold">
                      <span>Remaining Balance</span>
                      <span>₱3,500</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    <strong>Bank Transfer is recommended</strong> for DP orders — it carries no processing 
                    fees and is the easiest way to pay the remaining balance when it&apos;s due.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Allocation Policy Section */}
          <Card className="border-border overflow-hidden">
            <button
              onClick={() => toggleSection("allocation")}
              className="w-full p-4 flex items-center gap-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 text-left">
                <h2 className="font-bold text-foreground text-base">Allocation Policy</h2>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${openSection === "allocation" ? "rotate-180" : ""}`} />
            </button>
            {openSection === "allocation" && (
              <div className="p-4 space-y-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Not all pre-orders are subject to allocation · Unfulfilled quantities are{" "}
                  <span className="font-semibold text-green-600">fully refunded</span> ·{" "}
                  <span className="font-semibold text-destructive">PayPal/CC 5% fee is non-refundable</span>
                </p>

                <div className="space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">
                    Allocation cuts happen when a supplier reduces the quantity we receive versus 
                    what we originally ordered. <strong>Not all pre-orders are subject to allocation</strong> — 
                    each listing will state whether allocation applies.
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    <strong>How it works:</strong> If allocation is applied, your final quantity is 
                    adjusted proportionally. Any extra stock beyond the cut is distributed at The Warpzone&apos;s 
                    discretion.
                  </p>
                </div>

                {/* Example Box */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Example — 60% Allocation on 5 Boxes
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ordered</span>
                      <span className="font-medium">5 boxes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allocation</span>
                      <span className="font-medium">60%</span>
                    </div>
                    <div className="flex justify-between text-destructive font-semibold">
                      <span>Quantity Cut</span>
                      <span>-2 boxes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">You Receive</span>
                      <span className="font-medium">3 boxes</span>
                    </div>
                    <div className="flex justify-between text-green-600 font-semibold pt-1 border-t border-border">
                      <span>Refund Issued</span>
                      <span>₱7,000 (2 boxes)</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Refunds for allocation cuts are processed within <strong>3-7 business days</strong>. 
                  Bank Transfer refunds typically arrive in 1-3 days; PayPal/CC refunds may take 5-10 business days.
                </p>

                <div className="flex gap-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    <strong>PayPal and Credit Card payments:</strong> The 5% processing fee is charged 
                    by the payment provider and is <span className="text-destructive font-semibold">non-refundable</span> on 
                    allocation cuts or cancellations — even if the order is partially unfulfilled.
                  </p>
                </div>

                <div className="flex gap-3 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                  <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    <strong>PayPal Buyer Protection:</strong> PayPal covers disputes for 180 days. 
                    For pre-orders exceeding 180 days, allocation cut refunds will be processed 
                    manually via PayPal. The 5% fee remains non-refundable.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* No Cancellations Section */}
          <Card className="border-border overflow-hidden">
            <button
              onClick={() => toggleSection("cancellations")}
              className="w-full p-4 flex items-center gap-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Ban className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1 text-left">
                <h2 className="font-bold text-foreground text-base">No Cancellations</h2>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${openSection === "cancellations" ? "rotate-180" : ""}`} />
            </button>
            {openSection === "cancellations" && (
              <div className="p-4 space-y-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Orders <span className="font-semibold text-destructive">cannot be cancelled</span> once 
                  the down payment is confirmed · Your DP serves as the cancellation fee
                </p>

                <div className="flex gap-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                  <Ban className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground leading-relaxed">
                    <strong>No Cancellations.</strong> Once your down payment is confirmed, your order 
                    is locked in. Cancellations are not accepted under any circumstances — your down 
                    payment amount serves as the cancellation fee if the balance is not paid when due. 
                    No refund will be issued for the deposit.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">
                    This policy exists because we place orders with suppliers based on confirmed 
                    customer commitments. Cancellations after the fact create losses that we cannot absorb.
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Please make sure you are committed before placing a pre-order. If you have 
                    questions about a product before purchasing, message us on our{" "}
                    <a 
                      href="https://facebook.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary font-semibold hover:underline"
                    >
                      Facebook Page
                    </a>.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Footer CTA */}
        <div className="mt-10 text-center">
          <Link href="/pre-order">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
              <Package className="h-5 w-5 mr-2" />
              Browse Pre-Orders
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
