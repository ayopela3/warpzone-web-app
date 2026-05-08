-- Migration: checkout_payment
-- Adds payment QR support to profiles, expands orders table with
-- seller_id, fulfillment_type, payment status lifecycle, and new indexes.

-- 1. Add payment_qr_url to profiles
ALTER TABLE profiles ADD COLUMN payment_qr_url TEXT;

-- 2. Add seller_id + fulfillment + payment columns to orders
ALTER TABLE orders ADD COLUMN seller_id TEXT REFERENCES profiles(id);
ALTER TABLE orders ADD COLUMN fulfillment_type TEXT NOT NULL DEFAULT 'pickup';
ALTER TABLE orders ADD COLUMN notes TEXT;
ALTER TABLE orders ADD COLUMN payment_proof_url TEXT;

-- 3. Rename status default to pending_payment (new orders start here)
--    SQLite does not support ALTER COLUMN; existing rows keep their old status values.
--    New rows will use DEFAULT 'pending_payment' set via application logic.

-- 4. New indexes
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders(status);
