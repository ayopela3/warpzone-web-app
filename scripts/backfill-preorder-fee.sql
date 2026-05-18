-- Backfill service fee for the confirmed pre-order payment (order #0E5A80EB)
INSERT OR IGNORE INTO service_fees
  (id, seller_id, source_type, source_id, description, gross_amount, fee_rate, fee_amount, status, created_at, updated_at)
VALUES (
  'fee-backfill-0e5a80eb-preorder-001',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'pre_order',
  'd7d1d5d8-9cbe-4a68-ae53-d32f59530608',
  'Pre-order payment — order #0E5A80EB qty 1',
  4500,
  0.05,
  225,
  'unpaid',
  datetime('now'),
  datetime('now')
);

-- Mark the reservation as paid
UPDATE pre_order_reservations
SET paid = 1, is_paid = 1, fee_recorded = 1, total_paid = 4500
WHERE id = '48e8d70a-b814-4ebd-978d-43a3d0e64f05';
