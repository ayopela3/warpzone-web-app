import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, PackageCheck, ShieldCheck, ShoppingBag, Truck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import AddToCartButton from "./add-to-cart-button"

export const runtime = 'edge'

type Product = {
  id: number
  name: string
  price: number
  category: string
  condition: string
  categoryId: string
  inStock: boolean
  rarity: string
  setName: string
  description: string
}

const products: Product[] = [
  {
    id: 1,
    name: "Charizard ex Special Illustration Rare",
    price: 189.99,
    category: "Pokemon",
    condition: "Near Mint",
    categoryId: "pokemon",
    inStock: true,
    rarity: "Special Illustration Rare",
    setName: "Obsidian Flames",
    description: "A centerpiece Pokemon single with verified condition and clean display appeal for collectors.",
  },
  {
    id: 2,
    name: "The One Ring Borderless Foil",
    price: 129.99,
    category: "Magic: The Gathering",
    condition: "Mint",
    categoryId: "mtg",
    inStock: true,
    rarity: "Mythic Rare",
    setName: "The Lord of the Rings",
    description: "A premium borderless foil mythic for players and collectors looking for a standout binder piece.",
  },
  {
    id: 3,
    name: "Blue-Eyes White Dragon Quarter Century",
    price: 74.99,
    category: "Yu-Gi-Oh!",
    condition: "Near Mint",
    categoryId: "yugioh",
    inStock: true,
    rarity: "Quarter Century Secret Rare",
    setName: "25th Anniversary Tin",
    description: "A nostalgic Yu-Gi-Oh! favorite with modern Quarter Century foil treatment.",
  },
  {
    id: 4,
    name: "Pokemon Temporal Forces Booster Box",
    price: 124.99,
    category: "Sealed Product",
    condition: "Mint",
    categoryId: "sealed",
    inStock: true,
    rarity: "Sealed Booster Box",
    setName: "Temporal Forces",
    description: "Factory-sealed booster box ready for ripping, drafting, or long-term sealed collection storage.",
  },
  {
    id: 5,
    name: "MTG Modern Horizons 3 Bundle",
    price: 69.99,
    category: "Sealed Product",
    condition: "Mint",
    categoryId: "sealed",
    inStock: true,
    rarity: "Sealed Bundle",
    setName: "Modern Horizons 3",
    description: "A sealed Magic bundle with packs and accessories for players building into Modern Horizons 3.",
  },
  {
    id: 6,
    name: "Pikachu Van Gogh Promo",
    price: 139.99,
    category: "Pokemon",
    condition: "Lightly Played",
    categoryId: "pokemon",
    inStock: false,
    rarity: "Promo",
    setName: "Pokemon Center Promo",
    description: "A sought-after Pikachu promo with collector demand and clear condition disclosure.",
  },
]

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = products.find((item) => item.id === Number(id))

  if (!product) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <button className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-black">
            <Link href="/shop">
              <ArrowLeft className="h-4 w-4" />
              Back to shop
            </Link>
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <Card className="border-neutral-200 bg-white py-0 shadow-sm">
          <CardContent className="p-0">
            <div className="flex min-h-[560px] items-center justify-center bg-[linear-gradient(135deg,#fff7cc,#ffffff)] p-10">
              <div className="flex h-80 w-56 items-center justify-center rounded-3xl border-2 border-primary bg-white shadow-xl">
                <ShoppingBag className="h-20 w-20 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col justify-center">
          <div className="flex flex-wrap gap-2">
            <Badge>{product.category}</Badge>
            <Badge variant="outline">{product.condition}</Badge>
            <Badge variant="secondary">{product.rarity}</Badge>
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-black lg:text-5xl">{product.name}</h1>
          <p className="mt-3 text-lg font-medium text-neutral-600">{product.setName}</p>
          <p className="mt-6 max-w-2xl leading-7 text-neutral-700">{product.description}</p>

          <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-neutral-500">Price</p>
                <p className="text-4xl font-black text-black">${product.price.toLocaleString()}</p>
              </div>
              <Badge variant={product.inStock ? "default" : "secondary"}>
                {product.inStock ? "In stock" : "Out of stock"}
              </Badge>
            </div>

            <AddToCartButton
              productId={String(product.id)}
              name={product.name}
              price={product.price}
              category={product.category}
              inStock={product.inStock}
            />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Card className="border-neutral-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <h2 className="mt-3 font-black">Verified condition</h2>
                <p className="mt-1 text-sm text-neutral-600">Every listing is reviewed before publishing.</p>
              </CardContent>
            </Card>
            <Card className="border-neutral-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <Truck className="h-6 w-6 text-primary" />
                <h2 className="mt-3 font-black">Pickup or ship</h2>
                <p className="mt-1 text-sm text-neutral-600">Choose local pickup or secure delivery.</p>
              </CardContent>
            </Card>
            <Card className="border-neutral-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <PackageCheck className="h-6 w-6 text-primary" />
                <h2 className="mt-3 font-black">Protected packaging</h2>
                <p className="mt-1 text-sm text-neutral-600">Cards are packed safely for collectors.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
