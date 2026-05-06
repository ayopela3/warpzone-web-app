-- Make auctions standalone: drop FK dependency on product_listings and products.
-- SQLite does not support DROP COLUMN or DROP CONSTRAINT on existing tables,
-- so we recreate the table with the new schema.

-- Step 1: Create new auctions table with standalone fields
CREATE TABLE IF NOT EXISTS auctions_new (
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

-- Step 2: Copy existing auction rows (best-effort; product_name/image pulled from joined product where available)
INSERT INTO auctions_new (
  id, seller_id, title, description,
  category, condition, rarity, image_url,
  starting_price, current_bid, min_bid_increment,
  start_time, end_time, status, created_at, updated_at
)
SELECT
  a.id,
  a.seller_id,
  a.title,
  a.description,
  COALESCE(p.category, ''),
  'NEW',
  p.rarity,
  p.image_url,
  a.starting_price,
  a.current_bid,
  a.min_bid_increment,
  a.start_time,
  a.end_time,
  a.status,
  a.created_at,
  a.updated_at
FROM auctions a
LEFT JOIN products p ON a.product_id = p.id;

-- Step 3: Drop old auction_bids FK dependency then old table
DROP TABLE IF EXISTS auction_bids;
DROP TABLE IF EXISTS auctions;

-- Step 4: Rename new table
ALTER TABLE auctions_new RENAME TO auctions;

-- Step 5: Recreate auction_bids
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

-- Step 6: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_auctions_seller_id ON auctions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_id ON auction_bids(auction_id);
