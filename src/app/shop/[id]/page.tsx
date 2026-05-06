import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, PackageCheck, ShieldCheck, Truck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import AddToCartButton from "./add-to-cart-button"
import ProductImageCarousel from "./product-image-carousel"
import type { CloudflareEnv } from "@/types/cloudflare"

export const runtime = 'edge'

type Product = {
  id: string
  name: string
  category: string
  rarity: string
  description: string
  image_url: string
  sku: string
  quantity: number
  price: number
  approval_status: string
  created_at: string
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let db: CloudflareEnv["DB"] | null = null
  try {
    const { getRequestContext } = await import("@cloudflare/next-on-pages")
    const { env } = getRequestContext()
    db = (env as CloudflareEnv).DB
  } catch {
    return notFound()
  }

  if (!db) {
    return notFound()
  }

  const productResult = await db
    .prepare(`
      SELECT 
        id,
        sku,
        name,
        category,
        rarity,
        description,
        image_url,
        quantity,
        price,
        approval_status,
        created_at
      FROM products
      WHERE id = ? AND approval_status = 'approved' AND is_active = 1
    `)
    .bind(id)
    .first()

  if (!productResult) {
    notFound()
  }

  const product = productResult as Product

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <Link href="/shop">
            <Button variant="ghost" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to shop
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <Card className="border-neutral-200 bg-white py-0 shadow-sm">
          <CardContent className="p-0">
            <ProductImageCarousel imageUrl={product.image_url} productName={product.name} />
          </CardContent>
        </Card>

        <div className="flex flex-col justify-center">
          <div className="flex flex-wrap gap-2">
            <Badge>{product.category}</Badge>
            <Badge variant="outline">SKU: {product.sku}</Badge>
            {product.rarity && <Badge variant="secondary">{product.rarity}</Badge>}
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-black lg:text-5xl">{product.name}</h1>
          <p className="mt-6 max-w-2xl leading-7 text-neutral-700 whitespace-pre-line">{product.description}</p>

          <div className="mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-neutral-500">Price</p>
                <p className="text-4xl font-black text-black">${product.price.toLocaleString()}</p>
              </div>
              <Badge variant={product.quantity > 0 ? "default" : "secondary"}>
                {product.quantity > 0 ? `In stock (${product.quantity})` : "Out of stock"}
              </Badge>
            </div>

            <AddToCartButton
              productId={product.id}
              name={product.name}
              price={product.price}
              category={product.category}
              inStock={product.quantity > 0}
              quantity={product.quantity}
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
                <h2 className="mt-3 font-black">Pickup on our shop</h2>
                <p className="mt-1 text-sm text-neutral-600">You&apos;ll be able to conviniently pick up your items at our shop.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
