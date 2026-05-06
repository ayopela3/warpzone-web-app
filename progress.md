# Refactor Progress

## Goal
Modularise the warpzone app for maintainability. Feature-based architecture, shared DB helper, typed API client, <500 lines per file.

---

## Status

### ✅ DONE

| Item | File(s) |
|---|---|
| Shared domain types | `src/types/index.ts` |
| Shared DB helper `getDb()` | `src/lib/db.ts` |
| Typed frontend API client | `src/lib/api-client.ts` |
| AppProvider uses `CartItem` from types + `settingsApi` | `src/components/shared/app-provider.tsx` |
| All API routes use `getDb()` | `src/app/api/**` (all routes) |
| Admin sub-components created | `src/features/admin/components/` |
| `admin/page.tsx` — thin orchestrator (157 lines) | `src/app/admin/page.tsx` |
| `Product` type verified | `src/types/index.ts` |
| `shop/page.tsx` → thin orchestrator (112 lines) | `src/features/shop/components/{ProductCard,ProductFilters}.tsx` |
| `auctions/page.tsx` → thin orchestrator (133 lines) | `src/features/auctions/components/AuctionCard.tsx` |
| `tournaments/page.tsx` → thin orchestrator (140 lines) | `src/features/tournaments/components/TournamentCard.tsx` |
| `dashboard/page.tsx` → thin orchestrator (26 lines) | `src/features/dashboard/components/{SellerDashboard,UserDashboard,SellerProductEditDialog}.tsx` |

| `home/page.tsx` → thin orchestrator (42 lines) | `src/features/home/components/{HeroSection,ServicesGrid,FeaturedProductsSection}.tsx` |
| All `alert()` / `window.alert()` replaced with `sonner` toasts | `app-provider.tsx`, `cart/page.tsx`, `seller/auctions/new/page.tsx` |
| Crash guard (try/catch) on fiat symbol query | `src/app/shop/[id]/page.tsx` |
| `auctionsApi.create` added to typed API client | `src/lib/api-client.ts` |
| `<Toaster>` wired globally | `src/app/layout.tsx` |

---

### 🔜 NEXT — Roadmap

| Priority | Task | Notes |
|---|---|---|
| 1 | **Real-time auction bidding** | WebSocket or SSE; live bid feed, countdown timer, outbid notifications via toast |
| 2 | **Checkout flow** | Auth gate → address/pickup → order confirm → order record in DB; `features/checkout/` |
| 3 | **Refactor `cart/page.tsx`** | Extract `CartItemRow`, `OrderSummary` → `features/cart/` |
| 4 | **Guest → auth cart persistence** | Merge localStorage cart into user session on login |
| 5 | **Mobile nav / responsive audit** | Hamburger menu, bottom nav for mobile, touch-friendly auction bid UX |
| 6 | **Order history page** | `/dashboard` orders tab — list past orders with status |
| 7 | **Seller product create flow** | `/seller/products/new` form → `productsApi.create` |
| 8 | **Fix Tailwind v4 class warnings** | `bg-gradient-to-br` → `bg-linear-to-br`, `flex-shrink-0` → `shrink-0` in admin components |

---

## Architecture Reference

```
src/
  app/api/          ← all use getDb() ✅
  features/
    admin/
      components/
        AdminStats.tsx        ✅
        ApprovalsTab.tsx      ✅
        ProductsTab.tsx       ✅
        TournamentsTab.tsx    ✅
        SettingsTab.tsx       ✅
    shop/           ← TODO
    auctions/       ← TODO
    tournaments/    ← TODO
  lib/
    db.ts           ✅  (getDb helper)
    api-client.ts   ✅  (typed frontend client)
  types/
    index.ts        ✅  (shared domain types)
  components/shared/
    app-provider.tsx  ✅  (uses CartItem type + settingsApi)
```

---

## User Role Spec Sheet

### 👤 Guest (unauthenticated)
| Capability | Notes |
|---|---|
| Browse shop, search & filter products | Full read access |
| View product detail page | Full read access |
| Add items to cart | Cart stored in `localStorage` via `AppProvider` |
| View cart | Can see cart contents and totals |
| **Cannot** checkout | Redirected to sign in on checkout attempt (toast shown) |
| Browse auctions (view only) | Can see auction listings, current bids, time left |
| **Cannot** place bids | Must sign in |
| Browse & view tournaments | Can see event details |
| **Cannot** register for tournaments | Must sign in |
| Sign up / Sign in | `/auth/signup`, `/auth/signin` |

---

### 🔐 Authenticated User (role: `user`)
Everything a guest can do, plus:

| Capability | Notes |
|---|---|
| Checkout | Auth gate passes → pickup/address → order confirmed → order saved to DB |
| Cart persistence | On login, `localStorage` cart merges into session |
| Place bids on auctions | Real-time bid updates; outbid toast notification |
| Register for tournaments | POST `/api/tournaments/:id/register` |
| View order history | `/dashboard` → Orders tab |
| View auction history | `/dashboard` → Auctions tab |
| View tournament registrations | `/dashboard` → Tournaments tab |
| Update profile | `/dashboard` → Profile tab (future) |

---

### 🏪 Seller (role: `seller`)
Everything an authenticated user can do, plus:

| Capability | Notes |
|---|---|
| Create product listings | `/seller/products/new` → pending approval |
| Edit own product listings | Via `SellerDashboard` edit dialog |
| Delete own product listings | Soft-delete / deactivate |
| Create auctions for own listings | `/seller/auctions/new` → links to a listing ID |
| View own auction performance | Bids, current price, time remaining |
| View own sales / orders | `/dashboard` → Orders tab (seller view) |
| **Cannot** approve own listings | Must wait for admin approval |
| **Cannot** access admin panel | 403 redirect |
| Home page shows seller dashboard CTA | Hero redirects to `/dashboard` |

---

### 🛡️ Admin (role: `admin`)
Full system access:

| Capability | Notes |
|---|---|
| Approve / reject product listings | `ApprovalsTab` — sets `approval_status` |
| Toggle product featured status | `ProductsTab` — sets `featured = 1/0` |
| Toggle product active status | `ProductsTab` — sets `is_active = 1/0` |
| Create tournaments | `TournamentsTab` → POST `/api/tournaments` |
| View platform analytics | `AdminStats` — user count, auction count |
| Manage fiat currency symbol | `SettingsTab` → PUT `/api/settings/fiat` |
| Full product list visibility | All products regardless of approval/active status |
| **Cannot** use shop/cart/auctions as buyer | Admin is operations-only; auto-redirected to `/admin` on home visit |

---

## User Flow: Anonymous Cart → Auth → Checkout

```
[Guest]
  │
  ├─ Browse /shop
  │    └─ Add to cart (localStorage)
  │
  ├─ View /cart
  │    └─ Click "Continue to checkout"
  │         └─ requireAuth() → toast.error("Please sign in") → no redirect yet
  │              └─ User manually navigates to /auth/signin  ← TODO: auto-redirect
  │
  ├─ /auth/signin → sets isAuthenticated + userId + userRole in AppProvider
  │    └─ On success: merge localStorage cart into session (TODO)
  │         └─ redirect back to /cart
  │
  └─ /cart (authenticated)
       └─ Click "Continue to checkout"
            └─ requireAuth() passes
                 └─ /checkout (TODO: build this)
                      ├─ Step 1: Review order
                      ├─ Step 2: Pickup confirmation (in-store pickup)
                      ├─ Step 3: Order confirmed → POST /api/orders
                      └─ Redirect to /dashboard (order history)
```

---

## Real-Time Auction Architecture Plan

```
Cloudflare Workers + Durable Objects (or SSE fallback)
  │
  ├─ Client connects to /api/auctions/:id/stream (SSE)
  │    └─ Receives: { event: "bid", data: { amount, bidder, remaining_seconds } }
  │
  ├─ Client places bid → POST /api/auctions/:id/bid
  │    └─ Validates: amount > current_bid + min_increment
  │    └─ Validates: auction not ended
  │    └─ Writes to DB → broadcasts SSE to all connected clients
  │    └─ Returns: { success, newAmount, outbidUserId? }
  │
  ├─ AuctionCard component:
  │    ├─ useAuctionStream(id) hook → manages SSE EventSource
  │    ├─ Countdown timer (client-side, synced to end_time)
  │    ├─ Live bid list (last N bids)
  │    └─ Bid input + submit button (disabled if not auth or auction ended)
  │
  └─ Outbid notification:
       └─ SSE event "outbid" → toast.warning("You've been outbid! Current: $X")
```

---

## Key Rules
- Max 500 lines per file
- No `window.alert()` — use toast
- No `any` types in TypeScript
- All DB access via `getDb()` only
- All frontend API calls via `api-client.ts` only
- Code must be DRY — no duplicated logic; extract shared utilities/hooks/components
- Code must be encapsulated — components own their state/logic; no leaking internals
- Follow best practices — meaningful naming, single responsibility, separation of concerns, proper error handling
