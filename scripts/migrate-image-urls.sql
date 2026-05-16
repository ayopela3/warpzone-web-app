-- =============================================================================
-- Migration: Convert R2 direct URLs to proxied URLs (Simplified for D1)
-- Purpose: Fix image loading on warpzone.shop by routing through /api/images
-- =============================================================================
-- 
-- R2 Public URL: https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev
-- App Domain: https://warpzone.shop
--
-- Usage:
--   npx wrangler d1 execute warpzone --remote --file=./scripts/migrate-image-urls.sql
--
-- =============================================================================

-- Update all tables in one go using simpler patterns
-- D1 has limitations on complex LIKE patterns, so we use simpler conditions

-- products
UPDATE products 
SET image_url = REPLACE(image_url, 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/', 'https://warpzone.shop/api/images/')
WHERE image_url IS NOT NULL AND instr(image_url, 'r2.dev') > 0;

-- auctions
UPDATE auctions 
SET image_url = REPLACE(image_url, 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/', 'https://warpzone.shop/api/images/')
WHERE image_url IS NOT NULL AND instr(image_url, 'r2.dev') > 0;

-- pre_orders
UPDATE pre_orders 
SET image_url = REPLACE(image_url, 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/', 'https://warpzone.shop/api/images/')
WHERE image_url IS NOT NULL AND instr(image_url, 'r2.dev') > 0;

-- reward_items
UPDATE reward_items 
SET image_url = REPLACE(image_url, 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/', 'https://warpzone.shop/api/images/')
WHERE image_url IS NOT NULL AND instr(image_url, 'r2.dev') > 0;

-- categories
UPDATE categories 
SET image_url = REPLACE(image_url, 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/', 'https://warpzone.shop/api/images/')
WHERE image_url IS NOT NULL AND instr(image_url, 'r2.dev') > 0;

-- profiles (payment_qr_url)
UPDATE profiles 
SET payment_qr_url = REPLACE(payment_qr_url, 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/', 'https://warpzone.shop/api/images/')
WHERE payment_qr_url IS NOT NULL AND instr(payment_qr_url, 'r2.dev') > 0;

-- profiles (profile_picture)
UPDATE profiles 
SET profile_picture = REPLACE(profile_picture, 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/', 'https://warpzone.shop/api/images/')
WHERE profile_picture IS NOT NULL AND instr(profile_picture, 'r2.dev') > 0;

-- Verification queries (run separately to avoid D1 limits)
-- Check each table individually after migration

-- Verify products: should return 0
SELECT COUNT(*) as products_remaining_r2 FROM products WHERE image_url IS NOT NULL AND instr(image_url, 'r2.dev') > 0;

-- Verify auctions: should return 0  
SELECT COUNT(*) as auctions_remaining_r2 FROM auctions WHERE image_url IS NOT NULL AND instr(image_url, 'r2.dev') > 0;

-- Verify pre_orders: should return 0
SELECT COUNT(*) as preorders_remaining_r2 FROM pre_orders WHERE image_url IS NOT NULL AND instr(image_url, 'r2.dev') > 0;

-- Verify reward_items: should return 0
SELECT COUNT(*) as rewards_remaining_r2 FROM reward_items WHERE image_url IS NOT NULL AND instr(image_url, 'r2.dev') > 0;

-- Verify categories: should return 0
SELECT COUNT(*) as categories_remaining_r2 FROM categories WHERE image_url IS NOT NULL AND instr(image_url, 'r2.dev') > 0;

-- Verify profiles payment_qr: should return 0
SELECT COUNT(*) as profiles_qr_remaining_r2 FROM profiles WHERE payment_qr_url IS NOT NULL AND instr(payment_qr_url, 'r2.dev') > 0;

-- Verify profiles pictures: should return 0
SELECT COUNT(*) as profiles_pic_remaining_r2 FROM profiles WHERE profile_picture IS NOT NULL AND instr(profile_picture, 'r2.dev') > 0;
