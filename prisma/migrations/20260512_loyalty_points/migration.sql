-- ─────────────────────────────────────────────────────────────────────────────
-- Loyalty Points System
-- ─────────────────────────────────────────────────────────────────────────────

-- points_ledger: immutable transaction log per user
-- type: 'earn' | 'redeem' | 'adjust'  (adjust = manual admin correction)
CREATE TABLE IF NOT EXISTS points_ledger (
  id           TEXT    PRIMARY KEY,
  user_id      TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT    NOT NULL DEFAULT 'earn',   -- earn | redeem | adjust
  points       INTEGER NOT NULL DEFAULT 0,        -- positive = gain, negative = spend
  source_type  TEXT,                              -- 'order' | 'redemption' | 'manual'
  source_id    TEXT,                              -- order.id or redemption.id
  note         TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_points_ledger_user_id ON points_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_points_ledger_source  ON points_ledger(source_type, source_id);

-- reward_items: admin-curated catalogue of redeemable products
CREATE TABLE IF NOT EXISTS reward_items (
  id           TEXT    PRIMARY KEY,
  name         TEXT    NOT NULL,
  description  TEXT,
  image_url    TEXT,
  points_cost  INTEGER NOT NULL DEFAULT 0,  -- points needed to claim
  stock        INTEGER,                     -- NULL = unlimited
  is_active    INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- reward_redemptions: user claim requests
-- status: 'pending' | 'fulfilled' | 'cancelled'
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id             TEXT    PRIMARY KEY,
  user_id        TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_item_id TEXT    NOT NULL REFERENCES reward_items(id) ON DELETE CASCADE,
  points_spent   INTEGER NOT NULL DEFAULT 0,
  status         TEXT    NOT NULL DEFAULT 'pending',
  note           TEXT,                             -- admin note on fulfilment
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_id ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status  ON reward_redemptions(status);

-- Settings for earn rate (₱ per point)
-- earn_rate: spend this many ₱ to earn 1 point  (default 100)
INSERT OR IGNORE INTO settings (id, key, value) VALUES
  ('lp_earn_rate', 'points_earn_rate', '100');
