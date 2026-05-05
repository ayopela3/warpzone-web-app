-- Add approval_status and created_by columns to products table
ALTER TABLE products ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE products ADD COLUMN created_by TEXT;
