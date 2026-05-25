-- Add payment_proof_url column to pre_order_reservations table
-- This allows users to upload payment proofs and admins to review them

ALTER TABLE pre_order_reservations 
ADD COLUMN payment_proof_url TEXT;

-- Add payment_status column for better tracking
ALTER TABLE pre_order_reservations 
ADD COLUMN payment_status TEXT DEFAULT 'pending';

-- Add admin_notes column for admin to add notes about payments
ALTER TABLE pre_order_reservations 
ADD COLUMN admin_notes TEXT;

-- Add payment_approved_at timestamp
ALTER TABLE pre_order_reservations 
ADD COLUMN payment_approved_at TEXT;

-- Add payment_approved_by (admin user ID)
ALTER TABLE pre_order_reservations 
ADD COLUMN payment_approved_by TEXT;
