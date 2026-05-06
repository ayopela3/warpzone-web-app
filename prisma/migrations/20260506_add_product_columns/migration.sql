-- Add missing columns to products table to match API expectations
ALTER TABLE products ADD COLUMN price REAL NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN condition TEXT NOT NULL DEFAULT 'NEW';
