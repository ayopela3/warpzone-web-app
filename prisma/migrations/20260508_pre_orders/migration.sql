-- Migration: pre_orders
-- Adds pre_orders and pre_order_reservations tables.

-- Pre-orders table
-- seller_id NULL  → admin-created store-wide campaign
-- seller_id SET   → seller-submitted, pending approval
CREATE TABLE IF NOT EXISTS pre_orders (
  id               TEXT    PRIMARY KEY,
  title            TEXT    NOT NULL,
  description      TEXT,
  game             TEXT    NOT NULL DEFAULT 'Other',   -- Pokemon | MTG | Yu-Gi-Oh! | etc.
  image_url        TEXT,
  price            REAL    NOT NULL DEFAULT 0,
  release_date     TEXT    NOT NULL,                   -- ISO 8601 date string
  status           TEXT    NOT NULL DEFAULT 'active',  -- active | closed
  approval_status  TEXT    NOT NULL DEFAULT 'approved',-- pending | approved | rejected
  seller_id        TEXT    REFERENCES profiles(id) ON DELETE CASCADE,
  max_slots        INTEGER,                            -- NULL = unlimited
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Pre-order reservations table (one row per buyer per pre-order)
CREATE TABLE IF NOT EXISTS pre_order_reservations (
  id              TEXT    PRIMARY KEY,
  pre_order_id    TEXT    NOT NULL REFERENCES pre_orders(id) ON DELETE CASCADE,
  user_id         TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity        INTEGER NOT NULL DEFAULT 1,
  reserved_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(pre_order_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pre_orders_status          ON pre_orders(status);
CREATE INDEX IF NOT EXISTS idx_pre_orders_approval_status ON pre_orders(approval_status);
CREATE INDEX IF NOT EXISTS idx_pre_orders_seller_id       ON pre_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_pre_order_reservations_pre_order_id ON pre_order_reservations(pre_order_id);
CREATE INDEX IF NOT EXISTS idx_pre_order_reservations_user_id      ON pre_order_reservations(user_id);
