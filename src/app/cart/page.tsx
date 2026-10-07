"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/components/shared/app-provider"
import { toast } from "sonner"

export default function CartPage() {
  const router = useRouter()
  const { cartItems, cartCount, removeFromCart, updateCartQuantity, cartTotal, fiatSymbol, requireAuth, clearCart } = useApp()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <p className="label-meta mb-2 text-foreground">Checkout staging</p>
          <h1 className="text-3xl font-black">Cart</h1>
          <p className="mt-2 text-muted-foreground">Review products and pre-orders before checkout.</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1fr_380px] lg:px-8">
        {cartItems.length === 0 ? (
          <Card className="lg:col-span-2">
            <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/45" />
              <h2 className="mt-4 text-xl font-black">Your cart is empty</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Add products from the shop or reserve pre-orders to start building your cart.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/shop" prefetch={false}>Shop products</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Badge variant="outline">{item.category}</Badge>
                        <h2 className="mt-2 font-black text-foreground">{item.name}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{fiatSymbol}{item.price.toLocaleString()} each</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center rounded-md border border-border bg-card">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Decrease quantity for ${item.name}`}
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-10 text-center text-sm font-black">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Increase quantity for ${item.name}`}
                              disabled={item.maxQuantity !== undefined && item.quantity >= item.maxQuantity}
                              onClick={() => {
                                if (item.maxQuantity !== undefined && item.quantity >= item.maxQuantity) {
                                  toast.error(`Only ${item.maxQuantity} available in stock`)
                                  return
                                }
                                updateCartQuantity(item.id, item.quantity + 1)
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {item.maxQuantity !== undefined && (
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {item.maxQuantity - item.quantity > 0
                                ? `${item.maxQuantity - item.quantity} left`
                                : 'Max reached'}
                            </span>
                          )}
                        </div>
                        <p className="w-24 text-right font-black">{fiatSymbol}{(item.price * item.quantity).toLocaleString()}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Order summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Items</span>
                  <span className="font-black">{cartCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-black">{fiatSymbol}{cartTotal.toLocaleString()}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-black">Total</span>
                    <span className="text-2xl font-black">{fiatSymbol}{cartTotal.toLocaleString()}</span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!requireAuth()) return
                    router.push("/checkout")
                  }}
                >
                  Continue to checkout
                </Button>
                <Button variant="outline" className="w-full" onClick={clearCart}>
                  Clear cart
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
