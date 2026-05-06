-- Add featured column to products table for homepage featured product showcase
ALTER TABLE products ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
