-- Fix order_items table to support pre-orders
-- 1. Make listing_id nullable (for pre-orders that don't have product_listings)
-- 2. Add pre_order_id column

-- Add pre_order_id column
ALTER TABLE order_items ADD COLUMN pre_order_id TEXT;

-- Make listing_id nullable by recreating the table (SQLite/D1 doesn't support DROP CONSTRAINT)
-- Create new table with nullable listing_id
CREATE TABLE order_items_new (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT,
  listing_id TEXT,
  seller_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  pre_order_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES product_listings(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (pre_order_id) REFERENCES pre_orders(id) ON DELETE CASCADE
);

-- Copy existing data
INSERT INTO order_items_new (id, order_id, product_id, listing_id, seller_id, quantity, price, created_at)
SELECT id, order_id, product_id, listing_id, seller_id, quantity, price, created_at FROM order_items;

-- Drop old table and rename new one
DROP TABLE order_items;
ALTER TABLE order_items_new RENAME TO order_items;

-- Verify
SELECT COUNT(*) as order_items_count FROM order_items;
