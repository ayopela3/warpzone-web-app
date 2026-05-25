-- Add missing columns to orders table
-- Only add columns that don't already exist

-- Add updated_at column if it doesn't exist
ALTER TABLE orders 
ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));

-- Add payment approval tracking columns if they don't exist
ALTER TABLE orders 
ADD COLUMN payment_approved_at TEXT;

ALTER TABLE orders 
ADD COLUMN payment_approved_by TEXT;

ALTER TABLE orders 
ADD COLUMN payment_rejected_at TEXT;

ALTER TABLE orders 
ADD COLUMN payment_rejected_by TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_approved_by ON orders(payment_approved_by);
