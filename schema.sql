-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  country TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL DEFAULT 'regular-user',
  profile_picture TEXT,
  business_name TEXT,
  payment_qr_url TEXT,                                 -- GCash / Maya / bank QR for payment
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Products table (master product catalog with SKU)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  rarity TEXT,
  description TEXT,
  image_url TEXT,
  condition TEXT NOT NULL DEFAULT 'NEW',
  approval_status TEXT NOT NULL DEFAULT 'pending',
  created_by TEXT,
  price REAL NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

-- Product inventory/listings table (connects sellers to products)
CREATE TABLE IF NOT EXISTS product_listings (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  condition TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  in_stock BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Orders table
-- status lifecycle: pending_payment → confirming_payment → confirmed → shortlisted → out_of_stock → cancelled → ready_for_pickup
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  total REAL NOT NULL,
  fulfillment_type TEXT NOT NULL DEFAULT 'pickup',   -- 'pickup' | 'shipping'
  notes TEXT,
  payment_proof_url TEXT,                            -- buyer can optionally attach proof
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES product_listings(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Auctions table (standalone — not linked to product listings)
CREATE TABLE IF NOT EXISTS auctions (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT '',
  condition TEXT NOT NULL DEFAULT 'NEW',
  rarity TEXT,
  image_url TEXT,
  starting_price REAL NOT NULL,
  current_bid REAL NOT NULL DEFAULT 0,
  min_bid_increment REAL NOT NULL DEFAULT 1,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Auction bids table
CREATE TABLE IF NOT EXISTS auction_bids (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  bid_amount REAL NOT NULL,
  bid_time TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Auction participants table (tracks users who have joined an auction)
CREATE TABLE IF NOT EXISTS auction_participants (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(auction_id, user_id)
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  player_size INTEGER NOT NULL,
  description TEXT NOT NULL,
  preregistration_fee REAL NOT NULL DEFAULT 0,
  tournament_date TEXT NOT NULL,
  location TEXT,
  format TEXT,
  prize_pool TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  registered_players INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tournament registrations table
CREATE TABLE IF NOT EXISTS tournament_registrations (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(tournament_id, user_id)
);

-- Settings table (for app-wide configuration)
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pre-orders table
-- seller_id NULL = admin-created; SET = seller-submitted (needs approval)
CREATE TABLE IF NOT EXISTS pre_orders (
  id               TEXT    PRIMARY KEY,
  title            TEXT    NOT NULL,
  description      TEXT,
  game             TEXT    NOT NULL DEFAULT 'Other',
  image_url        TEXT,
  price            REAL    NOT NULL DEFAULT 0,
  release_date     TEXT    NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'active',   -- active | closed
  approval_status  TEXT    NOT NULL DEFAULT 'approved', -- pending | approved | rejected
  seller_id        TEXT    REFERENCES profiles(id) ON DELETE CASCADE,
  max_slots        INTEGER,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Pre-order reservations table
CREATE TABLE IF NOT EXISTS pre_order_reservations (
  id              TEXT    PRIMARY KEY,
  pre_order_id    TEXT    NOT NULL REFERENCES pre_orders(id) ON DELETE CASCADE,
  user_id         TEXT    NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  quantity        INTEGER NOT NULL DEFAULT 1,
  reserved_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(pre_order_id, user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_id ON sessions(id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_product_listings_product_id ON product_listings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_listings_seller_id ON product_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_product_id ON auctions(product_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_id ON auction_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_user_id ON auction_bids(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_participants_auction_id ON auction_participants(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_participants_user_id ON auction_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_date ON tournaments(tournament_date);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament_id ON tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_user_id ON tournament_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_pre_orders_status          ON pre_orders(status);
CREATE INDEX IF NOT EXISTS idx_pre_orders_approval_status ON pre_orders(approval_status);
CREATE INDEX IF NOT EXISTS idx_pre_orders_seller_id       ON pre_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_pre_order_reservations_pre_order_id ON pre_order_reservations(pre_order_id);
CREATE INDEX IF NOT EXISTS idx_pre_order_reservations_user_id      ON pre_order_reservations(user_id);

-- Service fees table (tracks 5% pre-order / 10% auction fees owed by sellers to admin)
CREATE TABLE IF NOT EXISTS service_fees (
  id            TEXT    PRIMARY KEY,
  seller_id     TEXT    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type   TEXT    NOT NULL,
  source_id     TEXT    NOT NULL,
  description   TEXT    NOT NULL DEFAULT '',
  gross_amount  REAL    NOT NULL DEFAULT 0,
  fee_rate      REAL    NOT NULL DEFAULT 0,
  fee_amount    REAL    NOT NULL DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'unpaid',
  paid_at       TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_service_fees_seller_id ON service_fees(seller_id);
CREATE INDEX IF NOT EXISTS idx_service_fees_status    ON service_fees(status);
CREATE INDEX IF NOT EXISTS idx_service_fees_source    ON service_fees(source_type, source_id);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  emoji       TEXT,
  image_url   TEXT,
  color       TEXT NOT NULL DEFAULT 'bg-gray-50 border-gray-200 hover:border-gray-400 hover:bg-gray-100',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
