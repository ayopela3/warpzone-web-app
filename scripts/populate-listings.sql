-- Populate product_listings for products that don't have listings yet
-- Uses valid seller IDs from profiles table

-- First, get a valid seller ID to use as default (or use specific one)
-- Using the first seller found (Warpzone)

-- Insert listings for all products that don't have one
-- Using the product's created_by as seller_id if valid, otherwise skip
INSERT INTO product_listings (id, product_id, seller_id, condition, price, quantity, in_stock, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))),
  p.id,
  COALESCE(
    -- Try to use created_by if it's a valid profile
    (SELECT id FROM profiles WHERE id = p.created_by),
    -- Otherwise use the first available seller
    (SELECT id FROM profiles WHERE role = 'seller' LIMIT 1)
  ),
  p.condition,
  p.price,
  p.quantity,
  1,
  datetime('now'),
  datetime('now')
FROM products p
LEFT JOIN product_listings pl ON pl.product_id = p.id
WHERE pl.id IS NULL;

-- Verify count
SELECT COUNT(*) as total_listings FROM product_listings;
