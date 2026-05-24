#!/usr/bin/env node
/**
 * Fix existing Riftbound pre-orders to use the correct category label
 * Run: node scripts/fix-riftbound-game-label.mjs
 */

import { getDb } from '../src/lib/db.js';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }

  console.log('Fixing Riftbound pre-orders game label...');

  // Find affected records
  const existing = await db
    .prepare("SELECT id, title, game FROM pre_orders WHERE game = ?")
    .bind('Riftbound TCG')
    .all();

  const count = existing.results?.length || 0;
  console.log(`Found ${count} pre-order(s) with game = 'Riftbound TCG'`);

  if (count === 0) {
    console.log('No records need updating.');
    return;
  }

  // Show what will be updated
  console.log('\nRecords to update:');
  for (const row of existing.results) {
    console.log(`  - ${row.title} (${row.id})`);
  }

  // Perform update
  const result = await db
    .prepare(`
      UPDATE pre_orders
      SET game = 'League of Legends: Rift Bound',
          updated_at = datetime('now')
      WHERE game = 'Riftbound TCG'
    `)
    .run();

  console.log(`\n✓ Updated ${result.meta?.changes || count} record(s)`);
  console.log('Game label changed: "Riftbound TCG" → "League of Legends: Rift Bound"');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
