/**
 * Typed frontend API client.
 * All fetch calls in pages/components go through here — one place to change URLs.
 */

import type { Auction, Product, Tournament } from "@/types"

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
