-- Safe migration to add missing columns to pre_orders table
-- Only adds columns that don't already exist

-- Try to add each column individually - if it exists, the command will fail but we'll continue
ALTER TABLE pre_orders ADD COLUMN full_price REAL NOT NULL DEFAULT 0;
ALTER TABLE pre_orders ADD COLUMN downpayment_amount REAL DEFAULT NULL;
ALTER TABLE pre_orders ADD COLUMN downpayment_pct REAL DEFAULT NULL;
ALTER TABLE pre_orders ADD COLUMN cutoff_date TEXT DEFAULT NULL;
ALTER TABLE pre_orders ADD COLUMN created_by_admin INTEGER NOT NULL DEFAULT 0;

-- Update existing records to have reasonable defaults
-- For existing records, set full_price = price and mark as admin-created if seller_id is NULL
UPDATE pre_orders SET full_price = price WHERE full_price = 0;
UPDATE pre_orders SET created_by_admin = 1 WHERE seller_id IS NULL;

-- Verify the changes
SELECT COUNT(*) as total_pre_orders FROM pre_orders;
SELECT COUNT(*) as admin_created FROM pre_orders WHERE created_by_admin = 1;
SELECT COUNT(*) as with_full_price FROM pre_orders WHERE full_price > 0;
