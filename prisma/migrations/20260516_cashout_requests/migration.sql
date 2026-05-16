-- Cashout requests: sellers request a payout; admin settles and marks as paid.
-- amount = seller's net earnings (gross_amount - fee_amount) from unsettled service_fees.
-- status: 'pending' | 'settled'
CREATE TABLE IF NOT EXISTS cashout_requests (
  id              TEXT    PRIMARY KEY,
  seller_id       TEXT    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount          REAL    NOT NULL DEFAULT 0,   -- net amount owed to the seller
  notes           TEXT,                          -- optional seller note (e.g. GCash number)
  status          TEXT    NOT NULL DEFAULT 'pending',
  settled_at      TEXT,
  settled_by      TEXT    REFERENCES profiles(id),
  admin_note      TEXT,                          -- optional admin note on settlement
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cashout_seller_id ON cashout_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_cashout_status    ON cashout_requests(status);
