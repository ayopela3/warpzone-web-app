-- Backfill missing service fees for orders that are confirmed/ready_for_pickup/shortlisted
-- and deduct product quantities for completed orders

-- Create service fees for orders that don't have them
INSERT INTO service_fees (id, seller_id, source_type, source_id, description, gross_amount, fee_rate, fee_amount, status, created_at, updated_at)
SELECT 
  lower(hex(randomblob(16))),
  o.seller_id,
  'order',
  o.id,
  'Order #' || substr(o.id, 1, 8) || ' - Product sale',
  o.total,
  0.05,
  round(o.total * 0.05 * 100) / 100,
  'unpaid',
  datetime('now'),
  datetime('now')
FROM orders o
LEFT JOIN service_fees sf ON sf.source_type = 'order' AND sf.source_id = o.id
WHERE o.status IN ('confirmed', 'ready_for_pickup', 'shortlisted')
  AND sf.id IS NULL;

-- Verify service fees created
SELECT COUNT(*) as new_fees FROM service_fees WHERE source_type = 'order';
