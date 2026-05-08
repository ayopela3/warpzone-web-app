/** All shared domain types for The Warpzone */

export type UserRole = "regular-user" | "seller" | "admin"

export type ApprovalStatus = "pending" | "approved" | "rejected"

export type AuctionStatus = "upcoming" | "active" | "ended"

export type TournamentStatus = "upcoming" | "open" | "past"

/**
 * Full order status lifecycle:
 *  pending_payment      → buyer placed order, awaiting payment via QR
 *  confirming_payment   → seller is verifying the payment
 *  confirmed            → payment accepted; item reserved for buyer
 *  ready_for_pickup     → item prepared; buyer can collect in-store
 *  shortlisted          → stock may be limited; seller reviewing allocation
 *  out_of_stock         → item unavailable; refund required
 *  cancelled            → order cancelled by either party
 */
export type OrderStatus =
  | "pending_payment"
  | "payment_submitted"
  | "confirming_payment"
  | "confirmed"
  | "ready_for_pickup"
  | "shortlisted"
  | "out_of_stock"
  | "cancelled"

export type FulfillmentType = "pickup" | "shipping"

export type ProductCondition = "NEW" | "LIKE NEW" | "GOOD" | "FAIR" | "POOR" | "DAMAGED"

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export type Product = {
  id: string
  sku: string
  name: string
  category: string
  rarity: string | null
  description: string | null
  image_url: string | null
  condition: ProductCondition
  approval_status: ApprovalStatus
  created_by: string | null
  price: number
  quantity: number
  featured: number
  is_active: number
  created_at: string
  updated_at: string
  /** Joined from profiles */
  seller_name?: string | null
  seller_business?: string | null
}

export type ProductListItem = Pick<
  Product,
  "id" | "sku" | "name" | "category" | "rarity" | "image_url" | "approval_status" | "created_at" | "price" | "quantity" | "featured" | "is_active" | "seller_name"
>

// ---------------------------------------------------------------------------
// Auction
// ---------------------------------------------------------------------------

export type Auction = {
  id: string
  title: string
  description: string | null
  category: string
  condition: string
  rarity: string | null
  image_url: string | null
  starting_price: number
  current_bid: number
  min_bid_increment: number
  start_time: string
  end_time: string
  status: AuctionStatus
  /** Joined from profiles */
  seller_name: string | null
  business_name: string | null
}

// ---------------------------------------------------------------------------
// Tournament
// ---------------------------------------------------------------------------

export type Tournament = {
  id: string
  name: string
  tournament_date: string
  location: string | null
  format: string | null
  prize_pool: string | null
  registered_players: number
  player_size: number
  status: TournamentStatus
  preregistration_fee: number
  description: string
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export type CartItem = {
  id: string
  name: string
  price: number
  category: string
  quantity: number
  /** "product" (default) or "pre_order" */
  itemType?: "product" | "pre_order"
  /** Set when itemType === "pre_order" */
  preOrderId?: string
  /** Seller profile id — needed to look up payment QR */
  seller_id?: string
}

// ---------------------------------------------------------------------------
// Pre-Orders
// ---------------------------------------------------------------------------

export type PreOrderStatus = "active" | "closed"

export type PreOrder = {
  id: string
  title: string
  description: string | null
  game: string
  image_url: string | null
  price: number
  release_date: string
  status: PreOrderStatus
  approval_status: ApprovalStatus
  seller_id: string | null
  max_slots: number | null
  created_at: string
  updated_at: string
  /** Joined — seller's display name */
  seller_name?: string | null
  seller_business?: string | null
  /** Joined — total reservations so far */
  reservation_count?: number
  /** Whether the current user has already reserved */
  user_reserved?: boolean
  user_quantity?: number
}

export type PreOrderReservation = {
  id: string
  pre_order_id: string
  user_id: string
  quantity: number
  reserved_at: string
  /** Joined from pre_orders */
  title?: string
  game?: string
  image_url?: string | null
  price?: number
  release_date?: string
  status?: PreOrderStatus
}

/** Extended reservation returned by GET /api/pre-orders/[id] (seller/admin view) */
export type PreOrderReservationDetail = {
  id: string
  pre_order_id: string
  user_id: string
  quantity: number
  reserved_at: string
  paid: number /** SQLite boolean: 0 | 1 */
  buyer_name: string | null
  buyer_email: string | null
  user_email: string | null
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export type OrderItem = {
  id: string
  order_id: string
  product_id: string
  listing_id: string
  seller_id: string
  quantity: number
  price: number
  /** Joined from products */
  product_name?: string
  product_image_url?: string | null
  product_category?: string
}

export type Order = {
  id: string
  user_id: string
  seller_id: string
  status: OrderStatus
  total: number
  fulfillment_type: FulfillmentType
  notes: string | null
  payment_proof_url: string | null
  created_at: string
  updated_at: string
  /** Joined from profiles (buyer) */
  buyer_name?: string | null
  buyer_email?: string | null
  buyer_phone?: string | null
  /** Joined from profiles (seller) */
  seller_name?: string | null
  seller_business?: string | null
  seller_payment_qr_url?: string | null
  /** Items in this order */
  items?: OrderItem[]
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type AppSettings = {
  fiatSymbol: string
}
