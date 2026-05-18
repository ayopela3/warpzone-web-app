-- Add downpayment_pct and cutoff_date to pre_orders
ALTER TABLE pre_orders ADD COLUMN downpayment_pct REAL DEFAULT NULL;
ALTER TABLE pre_orders ADD COLUMN cutoff_date TEXT DEFAULT NULL;

-- Wallet credits: running balance per buyer
CREATE TABLE IF NOT EXISTS wallet_credits (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  amount     REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_credits_user ON wallet_credits(user_id);

-- Wallet transactions: audit log of all credit movements
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL CHECK(type IN ('credit','debit','refund_request','refunded')),
  amount      REAL NOT NULL,
  source_type TEXT,   -- 'pre_order_refund' | 'checkout_use'
  source_id   TEXT,   -- reservation_id or order_id
  seller_id   TEXT,   -- seller who owes the refund (for refund_request rows)
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user   ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_seller ON wallet_transactions(seller_id);
