"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, CalendarDays, Gavel, PackageCheck, ShieldCheck, ShoppingBag, Sparkles, Trophy, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useApp } from "@/components/shared/app-provider"

type FeaturedProduct = {
  id: string
  sku: string
  name: string
  category: string
  rarity: string
  description: string
  image_url: string
  approval_status: string
  created_at: string
  seller_name: string
  seller_business: string
}

const upcomingEvents: Array<{ id: number; title: string; date: string; players: string; prize: string }> = []

const services = [
  { title: "Verified singles", description: "Condition-checked cards from Pokemon, MTG, Yu-Gi-Oh!, and more.", icon: ShieldCheck },
  { title: "Live auctions", description: "Bid on grails, slabs, sealed boxes, and limited releases.", icon: Gavel },
  { title: "Pre-orders", description: "Reserve upcoming sets before launch day with secure checkout.", icon: PackageCheck },
  { title: "Local events", description: "Join weekly tournaments, casual play nights, and prereleases.", icon: Trophy },
]

export default function HomePage() {
  const { userRole, isAuthenticated } = useApp()
  const router = useRouter()
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0)
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([])
  const isSeller = userRole === "seller"

  useEffect(() => {
    if (isAuthenticated && userRole === "admin") {
      router.push("/admin")
    }
  }, [isAuthenticated, userRole, router])

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch("/api/products/featured")
        const data = await response.json()
        if (data.success) {
          setFeaturedProducts(data.products || [])
        }
      } catch (error) {
        console.error("Failed to fetch featured products:", error)
      }
    }

    fetchFeaturedProducts()
  }, [])

  const activeFeaturedProduct = featuredProducts[activeFeaturedIndex]

  if (featuredProducts.length === 0) {
    return (
      <div className="bg-white text-black">
        <section className="relative overflow-hidden border-b border-black bg-primary text-black">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.42),transparent_45%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 lg:px-8 lg:py-28">
            <div className="flex flex-col items-center justify-center text-center">
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
                {!isSeller && (
                  <Button size="lg" className="bg-black text-white hover:bg-neutral-800" asChild>
                    <Link href="/shop">
                      Browse products
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {!isSeller && (
                  <Button size="lg" className="border border-black bg-white text-black hover:bg-white/90" asChild>
                    <Link href="/tournaments">
                      Join tournaments
                      <Trophy className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {isSeller && (
                  <Button size="lg" className="bg-black text-white hover:bg-neutral-800" asChild>
                    <Link href="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
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

        <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-neutral-300" />
            <h2 className="mt-4 text-xl font-semibold">No featured products yet</h2>
            <p className="mt-2 text-sm text-neutral-600">Check back later for new listings</p>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-2 lg:px-8">
          {!isSeller && (
            <Card className="border-neutral-200 bg-white shadow-sm">
              <CardHeader>
                <Badge className="w-fit">Live now</Badge>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Gavel className="h-6 w-6 text-primary" />
                  Auction block
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-neutral-600">Bid on graded slabs, sealed boxes, and hard-to-find singles.</p>
                <Button asChild>
                  <Link href="/auctions">Browse auctions</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {!isSeller && (
            <Card className="border-neutral-200 bg-white shadow-sm">
              <CardHeader>
                <Badge className="w-fit">Events</Badge>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <CalendarDays className="h-6 w-6 text-primary" />
                  Upcoming tournaments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-neutral-600">No upcoming events scheduled yet.</p>
                <Button variant="outline" asChild>
                  <Link href="/tournaments">See event calendar</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="bg-white text-black">
      <section className="relative overflow-hidden border-b border-black bg-primary text-black">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.42),transparent_45%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
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
              {!isSeller && (
                <Button size="lg" className="bg-black text-white hover:bg-neutral-800" asChild>
                  <Link href="/shop">
                    Browse products
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              {!isSeller && (
                <Button size="lg" className="border border-black bg-white text-black hover:bg-white/90" asChild>
                  <Link href="/tournaments">
                    Join tournaments
                    <Trophy className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              {isSeller && (
                <Button size="lg" className="bg-black text-white hover:bg-neutral-800" asChild>
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {!isSeller && (
            <div className="relative flex flex-col">
              {/* Main product display */}
              <div className="relative">
                <div className="flex aspect-[4/5] items-center justify-center">
                  {activeFeaturedProduct?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeFeaturedProduct.image_url}
                      alt={activeFeaturedProduct.name}
                      className="h-full w-full object-contain drop-shadow-2xl"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ShoppingBag className="h-24 w-24 text-primary" />
                    </div>
                  )}
                </div>

                {/* Floating info card */}
                <div className="absolute -bottom-4 left-4 right-4 rounded-2xl border border-white/30 bg-white/60 p-4 shadow-2xl backdrop-blur-md">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-600">{activeFeaturedProduct?.category || 'TCG'} · Featured</p>
                  <h3 className="mt-1 text-xl font-black text-black line-clamp-2">
                    {activeFeaturedProduct?.name || 'Featured Product'}
                  </h3>
                  <Button className="mt-3 w-full bg-black text-white hover:bg-neutral-800" asChild>
                    <Link href={`/shop/${activeFeaturedProduct?.id}`}>
                      View product
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Navigation arrows */}
              {/* <div className="absolute -left-4 top-1/2 -translate-y-1/2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-2 border-black bg-white shadow-lg hover:bg-neutral-100"
                  onClick={() => setActiveFeaturedIndex((current) =>
                    current === 0 ? featuredProducts.length - 1 : current - 1
                  )}
                  aria-label="Previous featured product"
                >
                  <span className="text-lg">‹</span>
                </Button>
              </div>
              <div className="absolute -right-4 top-1/2 -translate-y-1/2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-2 border-black bg-white shadow-lg hover:bg-neutral-100"
                  onClick={() => setActiveFeaturedIndex((current) =>
                    current === featuredProducts.length - 1 ? 0 : current + 1
                  )}
                  aria-label="Next featured product"
                >
                  <span className="text-lg">›</span>
                </Button>
              </div> */}

              {/* Stepper dots */}
              <div className="mt-5 flex justify-center gap-2">
                {featuredProducts.length !== 1 && featuredProducts.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    aria-label={`Show featured product ${index + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      activeFeaturedIndex === index ? "w-6 bg-black" : "w-2 bg-black"
                    }`}
                    onClick={() => setActiveFeaturedIndex(index)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
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

      {!isSeller && (
        <section className="border-y bg-neutral-50 py-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <Badge variant="secondary">Featured products</Badge>
                <h2 className="mt-3 text-3xl font-black text-black">Great additions to your collection</h2>
              </div>
              <Button variant="outline" asChild>
                <Link href="/shop">View shop</Link>
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featuredProducts.map((product) => (
                <Link key={product.id} href={`/shop/${product.id}`} className="group">
                  <Card className="overflow-hidden border-neutral-200 bg-white shadow-md transition-all duration-300 hover:-translate-y-2 hover:border-black hover:shadow-2xl">
                    <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-amber-50 via-white to-amber-100 p-6">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full max-h-56 object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-primary bg-white shadow-md">
                          <ShoppingBag className="h-20 w-20 text-primary" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{product.category}</Badge>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">Featured</Badge>
                      </div>
                      <h3 className="mt-3 text-lg font-black leading-tight text-black line-clamp-2">{product.name}</h3>
                      {product.rarity && (
                        <p className="mt-2 text-sm font-medium text-neutral-500">{product.rarity}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 lg:grid-cols-2 lg:px-8">
        {!isSeller && (
          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader>
              <Badge className="w-fit">Live now</Badge>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Gavel className="h-6 w-6 text-primary" />
                Auction block
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-neutral-600">Bid on graded slabs, sealed boxes, and hard-to-find singles.</p>
              <Button asChild>
                <Link href="/auctions">Browse auctions</Link>
              </Button>
            </CardContent>
          </Card>
        )}
        {!isSeller && (
          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader>
              <Badge className="w-fit">Events</Badge>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CalendarDays className="h-6 w-6 text-primary" />
                Upcoming tournaments
              </CardTitle>
              <p className="mb-6 text-neutral-600">Join our community events and tournaments.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold">{event.title}</h3>
                      <p className="mt-1 text-sm text-neutral-600">{event.date} · {event.prize}</p>
                    </div>
                    <Badge variant="secondary">
                      <Users className="mr-1 h-3 w-3" />
                      {event.players}
                    </Badge>
                  </div>
                </div>
              ))}
              <Button variant="outline" asChild>
                <Link href="/tournaments">See event calendar</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
