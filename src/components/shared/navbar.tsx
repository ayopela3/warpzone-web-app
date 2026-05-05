"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Menu, X, ShoppingCart, Search, User, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useApp } from "@/components/shared/app-provider"

const navigation = [
  { name: "Shop", href: "/shop" },
  { name: "Auctions", href: "/auctions" },
  { name: "Tournaments", href: "/tournaments" },
  { name: "Pre-orders", href: "/pre-order" },
]

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { cartCount, isAuthenticated, userRole, signOut } = useApp()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Show Sell with Us button only for unauthenticated users or regular users
  const showSellButton = !isAuthenticated || userRole === "regular-user"
  // Show Admin Dashboard only for admin users
  const showAdminDashboard = userRole === "admin"
  // Show cart button and shopping features only for non-seller users
  const showShoppingFeatures = !isAuthenticated || userRole === "regular-user"

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
            <span className="sr-only">The Warpzone</span>
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">WZ</span>
            </div>
            <span className="text-xl font-black text-primary">
              The Warpzone
            </span>
          </Link>
        </div>
        
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">{mobileMenuOpen ? "Close menu" : "Open menu"}</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
        
        <div className="hidden lg:flex lg:gap-x-8">
          {showShoppingFeatures && navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="rounded-full px-3 py-2 text-sm font-bold leading-6 text-black transition-colors hover:bg-primary/15"
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-end lg:gap-4">
          {showShoppingFeatures && (
            <Button variant="ghost" size="icon" aria-label="Search inventory">
              <Search className="h-5 w-5" />
            </Button>
          )}
          {showSellButton && (
            <Button variant="outline" asChild>
              <Link href="/auth/become-seller">
                <Store className="h-4 w-4" />
                Sell with us
              </Link>
            </Button>
          )}
          {showShoppingFeatures && (
            <Button size="icon" aria-label="Shopping cart" className="relative" asChild>
              <Link href="/cart">
                <ShoppingCart className="h-5 w-5" />
                {mounted && cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-xs font-black text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            </Button>
          )}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {showAdminDashboard && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Admin Dashboard</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon" aria-label="Sign in" asChild>
              <Link href="/auth/signin">
                <User className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </nav>
      
      {/* Mobile menu */}
      <div className={cn("lg:hidden", mobileMenuOpen ? "block" : "hidden")}>
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex items-center justify-between p-4">
            <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">WZ</span>
              </div>
              <span className="text-xl font-bold">The Warpzone</span>
            </Link>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-6 flow-root px-4">
            <div className="space-y-2 py-6">
              {showShoppingFeatures && navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-foreground hover:bg-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              {showSellButton && (
                <Link
                  href="/auth/become-seller"
                  className="block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-foreground hover:bg-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sell with us
                </Link>
              )}
            </div>
            <div className="border-t py-6 space-y-2">
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    className="block w-full rounded-lg px-3 py-2 text-left text-base font-semibold leading-7 text-foreground hover:bg-accent"
                    onClick={async () => {
                      await signOut()
                      setMobileMenuOpen(false)
                    }}
                  >
                    Sign out
                  </button>
                  <Link
                    href="/dashboard"
                    className="block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-foreground hover:bg-accent"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/orders"
                    className="block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-foreground hover:bg-accent"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Orders
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-foreground hover:bg-accent"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-foreground hover:bg-accent"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
