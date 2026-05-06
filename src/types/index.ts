/** All shared domain types for The Warpzone */

export type UserRole = "regular-user" | "seller" | "admin"

export type ApprovalStatus = "pending" | "approved" | "rejected"

export type AuctionStatus = "upcoming" | "active" | "ended"

export type TournamentStatus = "upcoming" | "open" | "past"

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled"

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
  starting_price: number
  current_bid: number
  min_bid_increment: number
  start_time: string
  end_time: string
  status: AuctionStatus
  /** Joined */
  product_name: string
  image_url: string | null
  seller_name: string
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
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type AppSettings = {
  fiatSymbol: string
}
