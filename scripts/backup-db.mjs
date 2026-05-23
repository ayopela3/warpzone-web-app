#!/usr/bin/env node
/**
 * D1 Database Backup Script
 * 
 * Creates a timestamped SQL dump of the warpzone D1 database.
 * Supports both local and remote databases.
 * 
 * Usage:
 *   node scripts/backup-db.mjs [local|remote]
 * 
 * Default is 'remote' (production database).
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DB_NAME = 'warpzone';
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

function getTimestamp() {
  const now = new Date();
  return now.toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
}

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function runBackup(environment = 'remote') {
  const isLocal = environment === 'local';
  const timestamp = getTimestamp();
  const suffix = isLocal ? 'local' : 'remote';
  const backupFile = path.join(BACKUP_DIR, `warpzone_${suffix}_${timestamp}.sql`);

  console.log(`🗄️  Starting D1 database backup (${environment})...`);
  console.log(`   Database: ${DB_NAME}`);
  console.log(`   Backup file: ${backupFile}`);

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
  }

  try {
    // Export the database to SQL
    console.log('📤 Exporting database...');
    const localFlag = isLocal ? '--local' : '--remote';
    const command = `npx wrangler d1 export "${DB_NAME}" ${localFlag} --output="${backupFile}"`;
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    // Get file stats
    const stats = fs.statSync(backupFile);
    const fileSize = formatBytes(stats.size);

    console.log('\n✅ Backup completed successfully!');
    console.log(`   File: ${backupFile}`);
    console.log(`   Size: ${fileSize}`);
    console.log(`   Created: ${stats.mtime.toISOString()}`);
    
    console.log('\n💡 Restore commands:');
    console.log(`   Local:  npx wrangler d1 execute ${DB_NAME} --local --file=${backupFile}`);
    if (!isLocal) {
      console.log(`   Remote: npx wrangler d1 execute ${DB_NAME} --remote --file=${backupFile}`);
    }

    // List existing backups
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('warpzone_') && f.endsWith('.sql'))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime
      }))
      .sort((a, b) => b.time - a.time);

    if (backups.length > 1) {
      console.log(`\n📋 Existing backups (${backups.length} total):`);
      backups.slice(0, 5).forEach((b, i) => {
        const marker = i === 0 ? ' ← latest' : '';
        console.log(`   ${b.name}${marker}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Backup failed:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const environment = args[0] || 'remote';

if (!['local', 'remote'].includes(environment)) {
  console.error('❌ Invalid environment. Use "local" or "remote".');
  console.error('Usage: node scripts/backup-db.mjs [local|remote]');
  process.exit(1);
}

runBackup(environment);
