#!/bin/bash
# D1 Database Backup Script
# Creates a timestamped SQL dump of the warpzone D1 database

set -e

# Configuration
DB_NAME="warpzone"
DB_ID="c339931b-53c8-48fa-a271-aae6bf51ac8a"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/warpzone_backup_${TIMESTAMP}.sql"

echo "🗄️  Starting D1 database backup..."
echo "   Database: ${DB_NAME}"
echo "   Backup file: ${BACKUP_FILE}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Export the database to SQL
echo "📤 Exporting database..."
npx wrangler d1 export "${DB_NAME}" --remote --output="${BACKUP_FILE}"

# Compress the backup
echo "🗜️  Compressing backup..."
gzip "${BACKUP_FILE}"

# Get file size
BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)

echo "✅ Backup completed successfully!"
echo "   File: ${BACKUP_FILE}.gz"
echo "   Size: ${BACKUP_SIZE}"
echo ""
echo "💡 To restore from this backup:"
echo "   npx wrangler d1 execute ${DB_NAME} --remote --file=${BACKUP_FILE}.gz"
