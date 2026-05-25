-- Add admin payment management columns to orders table
-- This enables comprehensive admin payment approval and tracking

-- Payment status tracking (more detailed than basic order status)
ALTER TABLE orders 
ADD COLUMN payment_status TEXT DEFAULT 'pending';

-- Admin approval tracking
ALTER TABLE orders 
ADD COLUMN payment_approved_at TEXT;

ALTER TABLE orders 
ADD COLUMN payment_approved_by TEXT;

ALTER TABLE orders 
ADD COLUMN payment_rejected_at TEXT;

ALTER TABLE orders 
ADD COLUMN payment_rejected_by TEXT;

-- Admin notes and rejection reason
ALTER TABLE orders 
ADD COLUMN admin_notes TEXT;

ALTER TABLE orders 
ADD COLUMN rejection_reason TEXT;

-- Payment method tracking
ALTER TABLE orders 
ADD COLUMN payment_method TEXT DEFAULT 'bank_transfer';

-- Audit trail for payment status changes
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'approved', 'rejected', 'status_changed'
  old_status TEXT,
  new_status TEXT,
  admin_user_id TEXT NOT NULL,
  admin_notes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_approved_by ON orders(payment_approved_by);
CREATE INDEX IF NOT EXISTS idx_payment_audit_order_id ON payment_audit_log(order_id);
