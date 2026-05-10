-- Service fees table
-- One row per transaction (pre-order reservation paid OR auction ended).
-- source_type: 'pre_order' | 'auction'
-- status: 'unpaid' | 'paid'
CREATE TABLE IF NOT EXISTS service_fees (
  id            TEXT    PRIMARY KEY,
  seller_id     TEXT    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type   TEXT    NOT NULL,            -- 'pre_order' | 'auction'
  source_id     TEXT    NOT NULL,            -- pre_order.id or auction.id
  description   TEXT    NOT NULL DEFAULT '',
  gross_amount  REAL    NOT NULL DEFAULT 0,  -- total buyer paid (price * qty)
  fee_rate      REAL    NOT NULL DEFAULT 0,  -- e.g. 0.05 = 5 %
  fee_amount    REAL    NOT NULL DEFAULT 0,  -- gross_amount * fee_rate
  status        TEXT    NOT NULL DEFAULT 'unpaid',
  paid_at       TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_service_fees_seller_id ON service_fees(seller_id);
CREATE INDEX IF NOT EXISTS idx_service_fees_status    ON service_fees(status);
CREATE INDEX IF NOT EXISTS idx_service_fees_source    ON service_fees(source_type, source_id);

-- Seed default fee-rate settings (won't overwrite if already set)
INSERT OR IGNORE INTO settings (id, key, value) VALUES
  ('sf_pre_order_fee', 'pre_order_service_fee_rate', '0.05'),  -- 5 %
  ('sf_auction_fee',   'auction_service_fee_rate',   '0.10');  -- 10 %

-- Add is_paid column to pre_order_reservations so we can trigger fee creation
ALTER TABLE pre_order_reservations ADD COLUMN is_paid INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pre_order_reservations ADD COLUMN fee_recorded INTEGER NOT NULL DEFAULT 0;

-- Add fee_recorded column to auctions so we only create fee once
ALTER TABLE auctions ADD COLUMN fee_recorded INTEGER NOT NULL DEFAULT 0;
