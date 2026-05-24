-- Add missing columns to pre_order_reservations table
ALTER TABLE pre_order_reservations ADD COLUMN unit_price REAL NOT NULL DEFAULT 0;
ALTER TABLE pre_order_reservations ADD COLUMN unit_full_price REAL NOT NULL DEFAULT 0;

-- Update existing reservations to have reasonable defaults
UPDATE pre_order_reservations SET unit_price = total_paid / quantity WHERE total_paid > 0 AND unit_price = 0;
UPDATE pre_order_reservations SET unit_full_price = unit_price WHERE unit_full_price = 0;

-- Verify the changes
SELECT COUNT(*) as total_reservations FROM pre_order_reservations;
SELECT COUNT(*) as with_unit_price FROM pre_order_reservations WHERE unit_price > 0;
