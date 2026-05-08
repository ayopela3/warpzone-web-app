-- Migration: order_proof_preorder
-- Adds pre_order_id to order_items so pre-order purchases flow through
-- the unified checkout. (payment_proof_url on orders already exists.)

ALTER TABLE order_items ADD COLUMN pre_order_id TEXT REFERENCES pre_orders(id) ON DELETE SET NULL;
