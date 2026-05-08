import { NextRequest, NextResponse } from "next/server"

/**
 * Role-based route protection middleware.
 *
 * Cookie used: `wz_role`  (set by /api/auth/signin, cleared by /api/auth/signout)
 * Values: "admin" | "seller" | "regular-user" | undefined (guest)
 *
 * Access matrix:
 * ┌─────────────────────┬───────┬──────┬────────┬───────┐
 * │ Route               │ Guest │ User │ Seller │ Admin │
 * ├─────────────────────┼───────┼──────┼────────┼───────┤
 * │ /shop*              │  ✅   │  ✅  │  ✅    │  ❌   │
 * │ /auctions*          │  ✅   │  ✅  │  ✅    │  ❌   │
 * │ /tournaments*       │  ✅   │  ✅  │  ✅    │  ❌   │
 * │ /cart               │  ✅   │  ✅  │  ✅    │  ❌   │
 * │ /pre-order*         │  ✅   │  ✅  │  ✅    │  ❌   │
 * │ /checkout*          │  ❌   │  ✅  │  ✅    │  ❌   │
 * │ /dashboard*         │  ❌   │  ✅  │  ✅    │  ❌   │
 * │ /seller*            │  ❌   │  ❌  │  ✅    │  ✅   │
 * │ /admin*             │  ❌   │  ❌  │  ❌    │  ✅   │
 * └─────────────────────┴───────┴──────┴────────┴───────┘
 */

type Role = "admin" | "seller" | "regular-user"

const BUYER_ONLY_PATHS = ["/shop", "/auctions", "/tournaments", "/cart", "/pre-order"]
const AUTH_REQUIRED_PATHS = ["/checkout", "/dashboard"]
const SELLER_PATHS = ["/seller"]
const ADMIN_PATHS = ["/admin"]

function startsWith(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

function redirectTo(url: string, request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL(url, request.url))
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const role = (request.cookies.get("wz_role")?.value ?? null) as Role | null
  const isGuest = role === null
  const isAdmin = role === "admin"
  const isSeller = role === "seller"

  // ── Admin routes ─────────────────────────────────────────────────────────
  if (startsWith(pathname, ADMIN_PATHS)) {
    if (isGuest) return redirectTo("/auth/signin", request)
    if (!isAdmin) return redirectTo("/", request)
    return NextResponse.next()
  }

  // ── Seller-only routes ────────────────────────────────────────────────────
  if (startsWith(pathname, SELLER_PATHS)) {
    if (isGuest) return redirectTo("/auth/signin", request)
    if (!isAdmin && !isSeller) return redirectTo("/", request)
    return NextResponse.next()
  }

  // ── Dashboard (user + seller only) ────────────────────────────────────────
  if (startsWith(pathname, AUTH_REQUIRED_PATHS)) {
    if (isGuest) return redirectTo(`/auth/signin?next=${encodeURIComponent(pathname)}`, request)
    if (isAdmin) return redirectTo("/admin", request)
    return NextResponse.next()
  }

  // ── Buyer-only routes (shop, auctions, cart, etc.) ────────────────────────
  // Sellers are also buyers — they can browse the shop, cart, auctions, and
  // tournaments in addition to their seller capabilities.
  if (startsWith(pathname, BUYER_ONLY_PATHS)) {
    if (isAdmin) return redirectTo("/admin", request)
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/shop/:path*",
    "/auctions/:path*",
    "/tournaments/:path*",
    "/cart",
    "/pre-order/:path*",
    "/checkout/:path*",
    "/dashboard/:path*",
    "/seller/:path*",
    "/admin/:path*",
  ],
}
