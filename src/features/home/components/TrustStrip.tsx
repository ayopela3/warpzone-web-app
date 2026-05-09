"use client"

import { ShieldCheck, MapPin, Gavel, RefreshCw } from "lucide-react"

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "100% Authentic",
    body: "Every card and product is condition-checked before listing.",
  },
  {
    icon: MapPin,
    title: "In-Store Pickup",
    body: "Pick up your order at our physical shop — no shipping wait.",
  },
  {
    icon: Gavel,
    title: "Live Auctions",
    body: "Bid on grails, slabs, and sealed boxes every week.",
  },
  {
    icon: RefreshCw,
    title: "Weekly Restocks",
    body: "New singles and sealed products added every week.",
  },
]

export function TrustStrip() {
  return (
    <section className="border-t border-border bg-neutral-50 py-12">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <div key={item.title} className="flex flex-col items-center text-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <item.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
