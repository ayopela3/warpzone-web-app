-- Migration: fix_order_items_preorder
-- Makes product_id and listing_id nullable so pre-order items can be inserted
-- without FK violations (pre-orders are not in the products or product_listings tables).
-- SQLite/D1 does not support DROP CONSTRAINT or ALTER COLUMN, so we recreate the table.

-- Step 1: Create the corrected table
CREATE TABLE IF NOT EXISTS order_items_v2 (
  id           TEXT    PRIMARY KEY,
  order_id     TEXT    NOT NULL,
  product_id   TEXT,                   -- NULL for pre-order items
  listing_id   TEXT,                   -- NULL for pre-order items
  seller_id    TEXT    NOT NULL,
  quantity     INTEGER NOT NULL,
  price        REAL    NOT NULL,
  pre_order_id TEXT,                   -- Set for pre-order items
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id)     REFERENCES orders(id)            ON DELETE CASCADE,
  FOREIGN KEY (product_id)   REFERENCES products(id)          ON DELETE CASCADE,
  FOREIGN KEY (listing_id)   REFERENCES product_listings(id)  ON DELETE CASCADE,
  FOREIGN KEY (seller_id)    REFERENCES profiles(id)          ON DELETE CASCADE,
  FOREIGN KEY (pre_order_id) REFERENCES pre_orders(id)        ON DELETE SET NULL
);

-- Step 2: Copy existing data
INSERT INTO order_items_v2 (id, order_id, product_id, listing_id, seller_id, quantity, price, pre_order_id, created_at)
SELECT id, order_id, product_id, listing_id, seller_id, quantity, price, pre_order_id, created_at
FROM order_items;

-- Step 3: Swap tables
DROP TABLE order_items;
ALTER TABLE order_items_v2 RENAME TO order_items;

-- Step 4: Restore indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id    ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id  ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_pre_order_id ON order_items(pre_order_id);
