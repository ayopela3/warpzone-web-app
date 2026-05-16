-- =============================================================================
-- Migration: Convert R2 direct URLs to proxied URLs
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

-- =============================================================================
-- products table
-- =============================================================================
UPDATE products 
SET image_url = REPLACE(image_url, 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/', 'https://warpzone.shop/api/images/')
WHERE image_url LIKE 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/%';

-- =============================================================================
-- auctions table
-- =============================================================================
UPDATE auctions 
SET image_url = REPLACE(image_url, 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/', 'https://warpzone.shop/api/images/')
WHERE image_url LIKE 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/%';

-- =============================================================================
-- pre_orders table
-- =============================================================================
UPDATE pre_orders 
SET image_url = REPLACE(image_url, 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/', 'https://warpzone.shop/api/images/')
WHERE image_url LIKE 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/%';

-- =============================================================================
-- reward_items table
-- =============================================================================
UPDATE reward_items 
SET image_url = REPLACE(image_url, 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/', 'https://warpzone.shop/api/images/')
WHERE image_url LIKE 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/%';

-- =============================================================================
-- categories table
-- =============================================================================
UPDATE categories 
SET image_url = REPLACE(image_url, 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/', 'https://warpzone.shop/api/images/')
WHERE image_url LIKE 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/%';

-- =============================================================================
-- profiles table (payment_qr_url and profile_picture)
-- =============================================================================
UPDATE profiles 
SET payment_qr_url = REPLACE(payment_qr_url, 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/', 'https://warpzone.shop/api/images/')
WHERE payment_qr_url LIKE 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/%';

UPDATE profiles 
SET profile_picture = REPLACE(profile_picture, 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/', 'https://warpzone.shop/api/images/')
WHERE profile_picture LIKE 'https://pub-2e76a476c5744c96a96ed1522c349421.r2.dev/%';

-- =============================================================================
-- Verification query - shows counts after migration
-- =============================================================================
SELECT 'products' as table_name, 
       COUNT(CASE WHEN image_url LIKE '%r2.dev/%' THEN 1 END) as r2_urls,
       COUNT(CASE WHEN image_url LIKE '%/api/images/%' THEN 1 END) as proxied_urls,
       COUNT(*) as total
FROM products
UNION ALL
SELECT 'auctions', 
       COUNT(CASE WHEN image_url LIKE '%r2.dev/%' THEN 1 END),
       COUNT(CASE WHEN image_url LIKE '%/api/images/%' THEN 1 END),
       COUNT(*)
FROM auctions
UNION ALL
SELECT 'pre_orders', 
       COUNT(CASE WHEN image_url LIKE '%r2.dev/%' THEN 1 END),
       COUNT(CASE WHEN image_url LIKE '%/api/images/%' THEN 1 END),
       COUNT(*)
FROM pre_orders
UNION ALL
SELECT 'reward_items', 
       COUNT(CASE WHEN image_url LIKE '%r2.dev/%' THEN 1 END),
       COUNT(CASE WHEN image_url LIKE '%/api/images/%' THEN 1 END),
       COUNT(*)
FROM reward_items
UNION ALL
SELECT 'categories', 
       COUNT(CASE WHEN image_url LIKE '%r2.dev/%' THEN 1 END),
       COUNT(CASE WHEN image_url LIKE '%/api/images/%' THEN 1 END),
       COUNT(*)
FROM categories
UNION ALL
SELECT 'profiles (payment_qr)', 
       COUNT(CASE WHEN payment_qr_url LIKE '%r2.dev/%' THEN 1 END),
       COUNT(CASE WHEN payment_qr_url LIKE '%/api/images/%' THEN 1 END),
       COUNT(*)
FROM profiles
UNION ALL
SELECT 'profiles (profile_pic)', 
       COUNT(CASE WHEN profile_picture LIKE '%r2.dev/%' THEN 1 END),
       COUNT(CASE WHEN profile_picture LIKE '%/api/images/%' THEN 1 END),
       COUNT(*)
FROM profiles;
