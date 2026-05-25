// Database Schema Deployment Script
// Applies admin payment management schema to production database

require('dotenv').config({ path: '.env.local' });

const schemaSQL = `
-- Add admin payment management columns to orders table
-- This enables comprehensive admin payment approval and tracking

-- Payment status tracking (more detailed than basic order status)
ALTER TABLE orders 
ADD COLUMN payment_status TEXT DEFAULT 'pending';

-- Admin approval tracking
ALTER TABLE orders 
ADD COLUMN payment_approved_at TEXT;

ALTER TABLE orders 
ADD COLUMN payment_approved_by TEXT;

ALTER TABLE orders 
ADD COLUMN payment_rejected_at TEXT;

ALTER TABLE orders 
ADD COLUMN payment_rejected_by TEXT;

-- Admin notes and rejection reason
ALTER TABLE orders 
ADD COLUMN admin_notes TEXT;

ALTER TABLE orders 
ADD COLUMN rejection_reason TEXT;

-- Payment method tracking
ALTER TABLE orders 
ADD COLUMN payment_method TEXT DEFAULT 'bank_transfer';

-- Audit trail for payment status changes
CREATE TABLE IF NOT EXISTS payment_audit_log (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'approved', 'rejected', 'status_changed'
  old_status TEXT,
  new_status TEXT,
  admin_user_id TEXT NOT NULL,
  admin_notes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_approved_by ON orders(payment_approved_by);
CREATE INDEX IF NOT EXISTS idx_payment_audit_order_id ON payment_audit_log(order_id);
`;

async function deploySchema() {
  console.log('🚀 Deploying database schema changes to production...');
  
  try {
    // Check if we're in production environment
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not found in environment variables');
    }
    
    console.log('📋 Schema changes to apply:');
    console.log('  - Add payment_status column to orders');
    console.log('  - Add payment_approved_at column to orders');
    console.log('  - Add payment_approved_by column to orders');
    console.log('  - Add payment_rejected_at column to orders');
    console.log('  - Add payment_rejected_by column to orders');
    console.log('  - Add admin_notes column to orders');
    console.log('  - Add rejection_reason column to orders');
    console.log('  - Add payment_method column to orders');
    console.log('  - Create payment_audit_log table');
    console.log('  - Create performance indexes');
    
    // For Cloudflare D1, we need to use the D1 API
    if (process.env.CLOUDFLARE_D1_DATABASE_ID) {
      console.log('☁️  Detected Cloudflare D1 database');
      console.log('⚠️  Manual deployment required for D1:');
      console.log('  1. Run: npx wrangler d1 execute warpzone-db --file=./scripts/add-admin-payment-management.sql');
      console.log('  2. Or use the Cloudflare Dashboard to run the SQL');
      return;
    }
    
    // For other databases, we would execute the SQL directly
    console.log('✅ Schema deployment instructions prepared');
    console.log('📝 Please run the SQL manually on your production database');
    
  } catch (error) {
    console.error('❌ Schema deployment failed:', error.message);
    process.exit(1);
  }
}

// Instructions for manual deployment
console.log(`
📊 DATABASE SCHEMA DEPLOYMENT INSTRUCTIONS
==========================================

The payment approval feature requires database schema changes. 
Since you're using a cloud database, please run the following:

STEP 1: Copy the SQL from scripts/add-admin-payment-management.sql

STEP 2: Apply to your production database:
- If using Cloudflare D1: npx wrangler d1 execute warpzone-db --file=./scripts/add-admin-payment-management.sql
- If using other cloud provider: Run the SQL in your database management console

STEP 3: Verify the changes:
SELECT sql FROM sqlite_master WHERE type='table' AND name='orders';
SELECT sql FROM sqlite_master WHERE type='table' AND name='payment_audit_log';

STEP 4: Test payment approval functionality

⚠️  BACKUP your database before applying schema changes!
`);

if (require.main === module) {
  deploySchema();
}

module.exports = { deploySchema };
