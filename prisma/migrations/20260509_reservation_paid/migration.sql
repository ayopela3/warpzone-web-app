-- Migration: reservation_paid
-- Adds a paid flag to pre_order_reservations so sellers can mark buyers as paid.

ALTER TABLE pre_order_reservations ADD COLUMN paid INTEGER NOT NULL DEFAULT 0;
