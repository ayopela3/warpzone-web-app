-- Migration: reservation_price_snapshot
-- Snapshots the unit price and full price at reservation time so that
-- subsequent price edits on the pre-order do NOT affect existing reservations.

ALTER TABLE pre_order_reservations ADD COLUMN unit_price      REAL NOT NULL DEFAULT 0;
ALTER TABLE pre_order_reservations ADD COLUMN unit_full_price REAL NOT NULL DEFAULT 0;
