-- User reports: sellers flag buyers for joy bidding / non-payment
-- status: pending → reviewed by admin → dismissed | banned
CREATE TABLE IF NOT EXISTS user_reports (
  id              TEXT    PRIMARY KEY,
  reporter_id     TEXT    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id TEXT   NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  reason          TEXT    NOT NULL,  -- e.g. "joy_bidding" | "non_payment" | "other"
  details         TEXT,              -- free-text from seller
  reference_type  TEXT,              -- "order" | "pre_order" | "auction"
  reference_id    TEXT,              -- id of the offending order/auction
  status          TEXT    NOT NULL DEFAULT 'pending',  -- pending | dismissed | banned
  admin_note      TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  resolved_at     TEXT
);
