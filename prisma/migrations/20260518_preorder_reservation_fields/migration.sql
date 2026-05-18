-- Migration: preorder_reservation_fields
-- Adds downpayment tracking and allocation status columns to pre_order_reservations.
-- These columns are required by the seller detail view and the buyer reservation detail page.
--
-- NOTE: If applying to the remote D1 database which already has the `paid` column
-- from 20260509_reservation_paid, skip that statement. Apply all others.

ALTER TABLE pre_order_reservations ADD COLUMN downpayment_paid     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pre_order_reservations ADD COLUMN downpayment_amount   REAL    NOT NULL DEFAULT 0;
ALTER TABLE pre_order_reservations ADD COLUMN total_paid           REAL    NOT NULL DEFAULT 0;
ALTER TABLE pre_order_reservations ADD COLUMN remaining_balance    REAL    NOT NULL DEFAULT 0;
ALTER TABLE pre_order_reservations ADD COLUMN allocation_status    TEXT    NOT NULL DEFAULT 'pending';
