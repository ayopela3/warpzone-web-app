"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, Loader2, Calendar, CheckCircle2, ArrowRight, LockKeyhole } from "lucide-react"
import { preOrdersApi } from "@/lib/api-client"
import type { PreOrderReservation } from "@/types"

type Props = { fiatSymbol: string }

export function UserPreOrdersTab({ fiatSymbol }: Props) {
  const [reservations, setReservations] = useState<PreOrderReservation[]>([])
  const [loading, setLoading]           = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await preOrdersApi.myReservations()
      if (data.success) setReservations(data.reservations)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  if (loading) {
    return (
      <Card className="bg-white shadow-md">
        <CardContent className="p-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
        </CardContent>
      </Card>
    )
  }

  if (reservations.length === 0) {
    return (
      <Card className="bg-white shadow-md">
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <Package className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mt-6 text-xl font-semibold text-gray-900">No pre-orders reserved</h3>
          <p className="mt-2 text-gray-600">Reserve upcoming card releases to see them here</p>
          <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-white">
            <Link href="/pre-order">Browse Pre-Orders</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {reservations.map((r) => {
        const isClosed = r.status === "closed"

        return (
          <Card key={r.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="relative h-14 w-14 shrink-0 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                {r.image_url
                  ? <Image src={r.image_url} alt={r.title ?? ""} fill className="object-contain" />
                  : <Package className="h-6 w-6 text-gray-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 truncate">{r.title ?? "Pre-Order"}</p>
                  {r.game && <Badge variant="outline" className="text-xs">{r.game}</Badge>}
                  {isClosed
                    ? <Badge variant="secondary" className="text-xs flex items-center gap-1"><LockKeyhole className="h-3 w-3" />Closed</Badge>
                    : <Badge className="bg-green-500 text-white text-xs flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Reserved</Badge>}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-0.5">
                  <span className="font-semibold text-primary">{fiatSymbol}{(r.price ?? 0).toLocaleString()}</span>
                  {r.release_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Releases {new Date(r.release_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  )}
                  <span>Qty: {r.quantity}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <div className="text-center pt-2">
        <Button variant="outline" asChild size="sm">
          <Link href="/pre-order">
            Browse More Pre-Orders <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
