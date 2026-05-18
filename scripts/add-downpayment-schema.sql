-- Add downpayment support to pre-orders
-- 1. Add downpayment_amount to pre_orders
-- 2. Add downpayment tracking to pre_order_reservations

-- Add columns to pre_orders
ALTER TABLE pre_orders ADD COLUMN downpayment_amount REAL;
ALTER TABLE pre_orders ADD COLUMN full_price REAL NOT NULL DEFAULT 0;

-- Update existing pre_orders to set full_price = price
UPDATE pre_orders SET full_price = price WHERE full_price = 0;

-- Add columns to pre_order_reservations for tracking payment state
ALTER TABLE pre_order_reservations ADD COLUMN downpayment_paid INTEGER DEFAULT 0;  -- 0 or 1
ALTER TABLE pre_order_reservations ADD COLUMN downpayment_amount REAL DEFAULT 0;
ALTER TABLE pre_order_reservations ADD COLUMN total_paid REAL DEFAULT 0;
ALTER TABLE pre_order_reservations ADD COLUMN remaining_balance REAL DEFAULT 0;
ALTER TABLE pre_order_reservations ADD COLUMN allocation_status TEXT DEFAULT 'pending'; -- 'pending', 'allocated', 'shortlisted', 'refunded'

-- Verify
SELECT id, title, price, full_price, downpayment_amount FROM pre_orders LIMIT 3;
