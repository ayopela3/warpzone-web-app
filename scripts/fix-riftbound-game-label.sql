-- Fix existing pre-orders whose game tags don't match category labels
-- so they appear correctly in the filter pills.
--
-- Apply:
--   npx wrangler d1 execute DB --remote --file=scripts/fix-riftbound-game-label.sql

-- Riftbound TCG → League of Legends: Rift Bound
UPDATE pre_orders
SET game = 'League of Legends: Rift Bound',
    updated_at = datetime('now')
WHERE game = 'Riftbound TCG';

-- Pokémon variants (plain ASCII "Pokemon") → canonical label
UPDATE pre_orders
SET game = 'Pokémon',
    updated_at = datetime('now')
WHERE LOWER(game) = 'pokemon';

-- Gundam variants → canonical label
UPDATE pre_orders
SET game = 'Gundam Card Game',
    updated_at = datetime('now')
WHERE LOWER(game) = 'gundam';
