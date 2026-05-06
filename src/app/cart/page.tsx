"use client"

import Link from "next/link"
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/components/shared/app-provider"

export default function CartPage() {
  const { cartItems, cartCount, removeFromCart, updateCartQuantity, cartTotal, fiatSymbol, requireAuth, clearCart } = useApp()

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <h1 className="text-3xl font-black">Cart</h1>
          <p className="mt-1 text-neutral-600">Review products and pre-orders before checkout.</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1fr_380px] lg:px-8">
        {cartItems.length === 0 ? (
          <Card className="border-neutral-200 bg-white shadow-sm lg:col-span-2">
            <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <ShoppingCart className="h-12 w-12 text-neutral-300" />
              <h2 className="mt-4 text-xl font-black">Your cart is empty</h2>
              <p className="mt-2 max-w-md text-sm text-neutral-600">
                Add products from the shop or reserve pre-orders to start building your cart.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/shop">Shop products</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id} className="border-neutral-200 bg-white shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Badge variant="outline">{item.category}</Badge>
                        <h2 className="mt-2 font-black text-black">{item.name}</h2>
                        <p className="mt-1 text-sm text-neutral-600">{fiatSymbol}{item.price.toLocaleString()} each</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center rounded-full border border-neutral-200 bg-neutral-50">
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
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
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

            <Card className="h-fit border-neutral-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Order summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">Items</span>
                  <span className="font-black">{cartCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-black">${cartTotal.toLocaleString()}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-black">Total</span>
                    <span className="text-2xl font-black">${cartTotal.toLocaleString()}</span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!requireAuth()) {
                      return
                    }

                    window.alert("Checkout flow opened.")
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
