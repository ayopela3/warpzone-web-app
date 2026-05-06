"use client"

import { Gavel, PackageCheck, ShieldCheck, Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const SERVICES = [
  { title: "Verified singles", description: "Condition-checked cards from Pokemon, MTG, Yu-Gi-Oh!, and more.", icon: ShieldCheck },
  { title: "Live auctions", description: "Bid on grails, slabs, sealed boxes, and limited releases.", icon: Gavel },
  { title: "Pre-orders", description: "Reserve upcoming sets before launch day with secure checkout.", icon: PackageCheck },
  { title: "Local events", description: "Join weekly tournaments, casual play nights, and prereleases.", icon: Trophy },
]

export function ServicesGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((service) => (
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
  )
}
