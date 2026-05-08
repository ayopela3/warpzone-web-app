/**
 * Typed frontend API client.
 * All fetch calls in pages/components go through here — one place to change URLs.
 */

import type { Auction, Order, OrderStatus, PreOrder, PreOrderReservation, Product, Tournament } from "@/types"

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const data = await res.json() as T
  return data
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const productsApi = {
  list: (params?: { sellerId?: string; approvalStatus?: string; showAll?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.sellerId) qs.set("sellerId", params.sellerId)
    if (params?.approvalStatus) qs.set("approvalStatus", params.approvalStatus)
    if (params?.showAll) qs.set("showAll", "true")
    return apiFetch<{ success: boolean; products: Product[] }>(`/api/products?${qs}`)
  },

  featured: () =>
    apiFetch<{ success: boolean; products: Product[] }>("/api/products/featured"),

  update: (id: string, body: Partial<Product> & { userRole?: string; sellerId?: string }) =>
    apiFetch<{ success: boolean; error?: string }>(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  remove: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/products/${id}?userRole=admin`, {
      method: "DELETE",
    }),
}

// ---------------------------------------------------------------------------
// Admin — Products
// ---------------------------------------------------------------------------

export const adminApi = {
  pendingProducts: () =>
    apiFetch<{ success: boolean; products: Product[] }>("/api/admin/products/pending"),

  approve: (id: string, approvalStatus: "approved" | "rejected") =>
    apiFetch<{ success: boolean }>(`/api/admin/products/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalStatus }),
    }),

  toggleFeatured: (id: string, featured: 0 | 1) =>
    apiFetch<{ success: boolean }>(`/api/admin/products/${id}/toggle-featured`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured }),
    }),

  toggleActive: (id: string, is_active: 0 | 1) =>
    apiFetch<{ success: boolean }>(`/api/admin/products/${id}/toggle-active`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active }),
    }),

  analyticsUsers: () =>
    apiFetch<{ success: boolean; count: number }>("/api/admin/analytics/users"),

  analyticsAuctions: () =>
    apiFetch<{ success: boolean; count: number }>("/api/admin/analytics/auctions"),
}

// ---------------------------------------------------------------------------
// Auctions
// ---------------------------------------------------------------------------

export const auctionsApi = {
  list: () =>
    apiFetch<{ success: boolean; auctions: Auction[] }>("/api/auctions"),

  join: (id: string) =>
    apiFetch<{ success: boolean; error?: string }>(`/api/auctions/${id}/join`, {
      method: "POST",
    }),

  create: (body: {
    title: string
    description: string
    category: string
    condition: string
    rarity?: string | null
    image_url?: string | null
    starting_price: number
    min_bid_increment: number
    start_time: string
    end_time: string
  }) =>
    apiFetch<{ success: boolean; error?: string }>("/api/auctions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
}

// ---------------------------------------------------------------------------
// Tournaments
// ---------------------------------------------------------------------------

export const tournamentsApi = {
  list: () =>
    apiFetch<{ success: boolean; tournaments: Tournament[] }>("/api/tournaments"),

  register: (id: string, userId: string) =>
    apiFetch<{ success: boolean; error?: string }>(`/api/tournaments/${id}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }),

  create: (body: {
    name: string
    playerSize: number
    description: string
    preregistrationFee: number
    tournamentDate: string
    location: string
    format: string
    prizePool: string
  }) =>
    apiFetch<{ success: boolean; error?: string }>("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
}

// ---------------------------------------------------------------------------
// Pre-Orders
// ---------------------------------------------------------------------------

export const preOrdersApi = {
  /** List all approved+active pre-orders (public) */
  list: (params?: { game?: string; status?: string }) => {
    const qs = new URLSearchParams()
    if (params?.game) qs.set("game", params.game)
    if (params?.status) qs.set("status", params.status)
    const query = qs.toString() ? `?${qs.toString()}` : ""
    return apiFetch<{ success: boolean; preOrders: PreOrder[] }>(`/api/pre-orders${query}`)
  },

  /** Create a new pre-order (seller or admin) */
  create: (body: {
    title: string
    description?: string
    game: string
    image_url?: string
    price: number
    release_date: string
    max_slots?: number
  }) =>
    apiFetch<{ success: boolean; preOrderId?: string; error?: string }>("/api/pre-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  /** Admin: approve, reject, or close a pre-order */
  update: (id: string, body: { approval_status?: string; status?: string }) =>
    apiFetch<{ success: boolean; error?: string }>(`/api/pre-orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  /** Buyer: reserve a pre-order slot */
  reserve: (id: string, quantity: number) =>
    apiFetch<{ success: boolean; reservationId?: string; error?: string }>(`/api/pre-orders/${id}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    }),

  /** Admin: list all pre-orders (any status/approval) */
  listAll: () =>
    apiFetch<{ success: boolean; preOrders: PreOrder[] }>("/api/pre-orders?showAll=true"),

  /** Buyer: list their own reservations */
  myReservations: () =>
    apiFetch<{ success: boolean; reservations: PreOrderReservation[] }>("/api/user/pre-orders"),
}

// ---------------------------------------------------------------------------
// Orders — buyer
// ---------------------------------------------------------------------------

export const ordersApi = {
  /** Create a new order from the current cart */
  create: (body: {
    items: { product_id: string; listing_id: string; seller_id: string; quantity: number; price: number }[]
    seller_id: string
    total: number
    fulfillment_type: "pickup" | "shipping"
    notes?: string
  }) =>
    apiFetch<{ success: boolean; orderId?: string; error?: string }>("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  /** List all orders for the authenticated buyer */
  list: () =>
    apiFetch<{ success: boolean; orders: Order[] }>("/api/orders"),

  /** Get a single order with items */
  get: (id: string) =>
    apiFetch<{ success: boolean; order: Order }>(`/api/orders/${id}`),
}

// ---------------------------------------------------------------------------
// Orders — seller
// ---------------------------------------------------------------------------

export const sellerOrdersApi = {
  /** List all incoming orders for the authenticated seller */
  list: () =>
    apiFetch<{ success: boolean; orders: Order[] }>("/api/seller/orders"),

  /** Update the status of an order */
  updateStatus: (id: string, status: OrderStatus) =>
    apiFetch<{ success: boolean; error?: string }>(`/api/seller/orders/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),

  /** Get seller's payment QR URL */
  getPaymentQr: () =>
    apiFetch<{ success: boolean; payment_qr_url: string | null }>("/api/seller/payment-qr"),

  /** Save / update seller's payment QR URL after uploading via /api/upload */
  savePaymentQr: (payment_qr_url: string) =>
    apiFetch<{ success: boolean; error?: string }>("/api/seller/payment-qr", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_qr_url }),
    }),
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const settingsApi = {
  getFiat: () =>
    apiFetch<{ success: boolean; fiatSymbol: string }>("/api/settings/fiat"),

  setFiat: (fiatSymbol: string) =>
    apiFetch<{ success: boolean; fiatSymbol: string }>("/api/settings/fiat", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fiatSymbol }),
    }),
}
