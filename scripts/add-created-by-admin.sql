-- Add missing created_by_admin column to pre_orders table
ALTER TABLE pre_orders ADD COLUMN created_by_admin INTEGER NOT NULL DEFAULT 0;

-- Update existing records to mark admin-created pre-orders (where seller_id is NULL)
UPDATE pre_orders SET created_by_admin = 1 WHERE seller_id IS NULL;

-- Verify the changes
SELECT COUNT(*) as total_pre_orders FROM pre_orders;
SELECT COUNT(*) as admin_created FROM pre_orders WHERE created_by_admin = 1;
SELECT COUNT(*) as seller_created FROM pre_orders WHERE created_by_admin = 0 AND seller_id IS NOT NULL;
