"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Menu, X, ShoppingCart, Search, User, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useApp } from "@/components/shared/app-provider"

const navigation = [
  { name: "Shop", href: "/shop" },
  { name: "Auctions", href: "/auctions" },
  { name: "Tournaments", href: "/tournaments" },
  { name: "Pre-orders", href: "/pre-order" },
]

export function Navbar() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const { cartCount, isAuthenticated, userRole, signOut } = useApp()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [mobileMenuOpen])

  // Show Sell with Us button only for unauthenticated users or regular users (not sellers/admins)
  const showSellButton = !isAuthenticated || userRole === "regular-user"
  // Show shopping nav/cart for everyone except admins — sellers are also buyers
  const showShoppingFeatures = userRole !== "admin"
  // Dashboard href depends on role: admin → /admin, everyone else → /dashboard
  const dashboardHref = userRole === "admin" ? "/admin" : "/dashboard"

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" prefetch={false} className="-m-1.5 p-1.5">
            <span className="sr-only">The Warpzone</span>
            <Image src="/images/warpzone.png" alt="The Warpzone" width={160} height={48} className="h-10 w-auto object-contain" priority />
          </Link>
        </div>
        
        <div className="flex lg:hidden">
          <button
            type="button"
            className="focus-ring -m-2.5 inline-flex items-center justify-center rounded-md border border-border bg-card p-2.5 text-foreground"
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
        
        <div className="hidden rounded-xl border border-border bg-card/70 p-1 lg:flex lg:gap-x-1">
          {showShoppingFeatures && navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              prefetch={false}
              className="rounded-md px-3 py-2 text-xs font-bold leading-none text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-end lg:gap-4">
          {showShoppingFeatures && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (searchQuery.trim()) {
                  router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
                } else {
                  router.push("/shop")
                }
              }}
              className="relative mr-3 hidden lg:block"
            >
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="h-9 w-44 rounded-md border-border bg-card pl-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          )}
          {showSellButton && (
            <Button variant="outline" asChild>
              <Link href="/auth/become-seller" prefetch={false}>
                <Store className="h-4 w-4" />
                Sell with us
              </Link>
            </Button>
          )}
          {showShoppingFeatures && (
            <Button size="icon" aria-label="Shopping cart" className="relative" asChild>
              <Link href="/cart" prefetch={false}>
                <ShoppingCart className="h-5 w-5" />
                {mounted && cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-background bg-foreground px-1 text-[10px] font-black text-background">
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
                <DropdownMenuItem asChild>
                  <Link href={dashboardHref} prefetch={false}>Dashboard</Link>
                </DropdownMenuItem>
                {userRole !== "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" prefetch={false}>Settings</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => signOut()}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="icon" aria-label="Sign in" asChild>
              <Link href="/auth/signin" prefetch={false}>
                <User className="h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </nav>
      
    </header>

      {/* Mobile menu — outside <header> to escape its stacking context */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-9999 flex flex-col overflow-hidden bg-background lg:hidden">
          {/* Header row */}
          <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
            <Link href="/" prefetch={false} className="-m-1.5 p-1.5" onClick={() => setMobileMenuOpen(false)}>
              <Image src="/images/warpzone.png" alt="The Warpzone" width={140} height={40} className="h-9 w-auto object-contain" />
            </Link>
            <button
              type="button"
              className="focus-ring -m-2.5 rounded-md border border-border bg-card p-2.5 text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {/* Mobile search */}
            {showShoppingFeatures && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (searchQuery.trim()) {
                    router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
                  } else {
                    router.push("/shop")
                  }
                  setMobileMenuOpen(false)
                }}
                className="mb-4"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search products..."
                    className="h-10 w-full rounded-md border-border pl-10 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>
            )}

            <div className="space-y-1">
              {showShoppingFeatures && navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={false}
                  className="block rounded-md border-b border-border px-1 py-4 text-sm font-bold text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              {showSellButton && (
                <Link
                  href="/auth/become-seller"
                  prefetch={false}
                  className="block rounded-md border-b border-border px-1 py-4 text-sm font-bold text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sell with us
                </Link>
              )}
            </div>

            <div className="mt-8 border-t border-border pt-6">
              {isAuthenticated ? (
                <div className="space-y-1">
                  <Link
                    href={dashboardHref}
                    prefetch={false}
                    className="block rounded-md px-1 py-4 text-sm font-bold text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {userRole !== "admin" && (
                    <Link
                      href="/dashboard/orders"
                      prefetch={false}
                      className="block rounded-md px-1 py-4 text-sm font-bold text-foreground"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Orders
                    </Link>
                  )}
                  {userRole !== "admin" && (
                    <Link
                      href="/dashboard/settings"
                      prefetch={false}
                      className="block rounded-md px-1 py-4 text-sm font-bold text-foreground"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Settings
                    </Link>
                  )}
                  <button
                    type="button"
                    className="block w-full rounded-md px-1 py-4 text-left text-sm font-bold text-foreground"
                    onClick={async () => {
                      await signOut()
                      setMobileMenuOpen(false)
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Link
                    href="/auth/signin"
                    prefetch={false}
                    className="block rounded-md px-1 py-4 text-sm font-bold text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    prefetch={false}
                    className="block rounded-md px-1 py-4 text-sm font-bold text-foreground"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
