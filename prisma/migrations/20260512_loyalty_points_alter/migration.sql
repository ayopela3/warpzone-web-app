-- Add points_awarded column to orders for idempotent point awarding.
-- Run this ONCE per environment. Skip if the column already exists.
ALTER TABLE orders ADD COLUMN points_awarded INTEGER NOT NULL DEFAULT 0;
