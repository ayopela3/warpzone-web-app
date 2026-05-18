/**
 * Typed frontend API client.
 * All fetch calls in pages/components go through here — one place to change URLs.
 */

import type { AdminUser, Auction, Order, OrderStatus, PreOrder, PreOrderReservation, PreOrderReservationDetail, Product, Tournament, UserReport } from "@/types"

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)
  const data = await res.json() as T
  return data
}

/** apiFetch variant that attaches the stored session token as a Bearer header. */
function authFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const sessionId = typeof window !== "undefined"
    ? (localStorage.getItem("warpzone-session-id") ?? "")
    : ""
  return apiFetch<T>(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${sessionId}`,
      ...(init?.headers ?? {}),
    },
  })
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

  listUsers: () =>
    apiFetch<{ success: boolean; users: AdminUser[] }>("/api/admin/users"),

  banUser: (userId: string, reason?: string) =>
    apiFetch<{ success: boolean; error?: string }>(`/api/admin/users/${userId}/ban`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: true, reason }),
    }),

  unbanUser: (userId: string) =>
    apiFetch<{ success: boolean; error?: string }>(`/api/admin/users/${userId}/ban`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: false }),
    }),

  listReports: (status: "pending" | "dismissed" | "banned" = "pending") =>
    apiFetch<{ success: boolean; reports: UserReport[] }>(`/api/admin/reports?status=${status}`),

  resolveReport: (reportId: string, action: "dismiss" | "ban", adminNote?: string, banReason?: string) =>
    apiFetch<{ success: boolean; error?: string }>(`/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, admin_note: adminNote, ban_reason: banReason }),
    }),
}

// ---------------------------------------------------------------------------
// Reports — seller submits a report against a buyer
// ---------------------------------------------------------------------------

export const reportsApi = {
  submit: (body: {
    reported_user_id: string
    reason: string
    details?: string
    reference_type?: string
    reference_id?: string
  }) =>
    apiFetch<{ success: boolean; reportId?: string; error?: string }>("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
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
  list: (userId?: string) =>
    apiFetch<{ success: boolean; tournaments: Tournament[] }>(
      userId ? `/api/tournaments?userId=${encodeURIComponent(userId)}` : "/api/tournaments"
    ),

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

  /** Buyer: list tournaments the authenticated user has registered for */
  myTournaments: () =>
    apiFetch<{ success: boolean; tournaments: (Tournament & { registered_at: string })[] }>("/api/user/tournaments"),

  /** Buyer: get detail for a single tournament registration */
  myTournamentDetail: (id: string) =>
    apiFetch<{
      success: boolean
      tournament: Tournament
      registration: { id: string; registered_at: string }
    }>(`/api/user/tournaments/${id}`),

  /** Buyer: cancel registration for an upcoming tournament */
  cancelRegistration: (id: string) =>
    apiFetch<{ success: boolean; error?: string }>(`/api/tournaments/${id}/register`, {
      method: "DELETE",
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
    full_price: number
    downpayment_pct?: number | null
    cutoff_date?: string | null
    release_date: string
    max_slots?: number
  }) =>
    authFetch<{ success: boolean; preOrderId?: string; error?: string }>("/api/pre-orders", {
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

  /** Seller: list only their own pre-orders */
  listBySeller: (sellerId: string) =>
    apiFetch<{ success: boolean; preOrders: PreOrder[] }>(`/api/pre-orders?sellerId=${encodeURIComponent(sellerId)}`),

  /** Seller/Admin: get pre-order detail + reservations */
  getDetail: (id: string) =>
    authFetch<{ success: boolean; preOrder: PreOrder; reservations: PreOrderReservationDetail[] }>(`/api/pre-orders/${id}`),

  /** Seller/Admin: mark a reservation as paid or unpaid */
  markPaid: (preOrderId: string, reservationId: string, paid: boolean) =>
    authFetch<{ success: boolean; error?: string }>(`/api/pre-orders/${preOrderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId, paid }),
    }),

  /** Seller/Admin: set allocation status for a reservation */
  setAllocation: (preOrderId: string, reservationId: string, allocation_status: 'pending' | 'allocated' | 'shortlisted' | 'refunded') =>
    authFetch<{ success: boolean; error?: string }>(`/api/pre-orders/${preOrderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId, allocation_status }),
    }),

  /** Buyer: list their own reservations */
  myReservations: () =>
    apiFetch<{ success: boolean; reservations: PreOrderReservation[] }>("/api/user/pre-orders"),

  /** Buyer: get detail for a single pre-order reservation */
  myReservationDetail: (preOrderId: string) =>
    apiFetch<{ success: boolean; preOrder: PreOrder; reservation: PreOrderReservation }>(`/api/user/pre-orders/${preOrderId}`),
}

// ---------------------------------------------------------------------------
// Orders — buyer
// ---------------------------------------------------------------------------

export const ordersApi = {
  /** Create a new order from the current cart */
  create: (body: {
    items: { product_id: string; listing_id: string | null; seller_id: string; quantity: number; price: number; pre_order_id?: string }[]
    seller_id: string
    total: number
    fulfillment_type: "pickup" | "shipping"
    notes?: string
    payment_proof_url?: string
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

  /** Buyer: attach proof-of-payment screenshot URL to the order */
  uploadProof: (orderId: string, payment_proof_url: string) =>
    apiFetch<{ success: boolean; error?: string }>(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_proof_url }),
    }),

  /** Seller / Admin: confirm payment received and mark order confirmed */
  markPaid: (orderId: string) =>
    apiFetch<{ success: boolean; error?: string }>(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_paid" }),
    }),
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
// Wallet — buyer
// ---------------------------------------------------------------------------

export const walletApi = {
  /** Get buyer's credit balance + transaction history */
  getWallet: () =>
    authFetch<{ success: boolean; balance: number; transactions: Record<string, unknown>[] }>("/api/user/wallet"),

  /** Request a cash refund for a shortlisted reservation */
  requestRefund: (reservation_id: string) =>
    authFetch<{ success: boolean; error?: string }>("/api/user/wallet/refund-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservation_id }),
    }),
}

// ---------------------------------------------------------------------------
// Seller Refunds
// ---------------------------------------------------------------------------

export const sellerRefundsApi = {
  /** List pending (or all) refund requests for the seller */
  list: (showSettled = false) =>
    authFetch<{ success: boolean; refunds: Record<string, unknown>[] }>(
      `/api/seller/refunds${showSettled ? "?settled=true" : ""}`
    ),

  /** Mark a refund request as settled (paid out to buyer) */
  settle: (txId: string) =>
    authFetch<{ success: boolean; error?: string }>(`/api/seller/refunds/${txId}`, {
      method: "PATCH",
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
