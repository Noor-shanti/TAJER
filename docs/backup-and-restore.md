# Turso Backup & Restore Strategy

## Overview

This document defines the backup and restoration strategy for the merchant's Turso database.
The merchant's data (customers, invoices, payments) is business-critical and must be protected.

## Backup Method

### 1. Turso Built-in Replication (Automatic)
Turso automatically replicates data across multiple edge locations.
This protects against hardware/node failure but does NOT protect against accidental data deletion.

### 2. Periodic SQL Dump (Manual / Scheduled)

Export the full database as a standard SQL file using the Turso CLI:

```bash
# Install Turso CLI (if not installed)
curl -sSfL https://get.tur.so/install.sh | bash

# Authenticate
turso auth login

# Export database to SQL file
turso db shell <DATABASE_NAME> .dump > backup-$(date +%Y-%m-%d).sql
```

### Recommended Backup Frequency

| Data Volume | Frequency |
|-------------|-----------|
| Active daily use | Daily |
| Light use | Weekly |
| Before any migration | Always |

## Backup Storage

Store exported `.sql` files in at least TWO separate locations:

1. **Private GitHub repository** (e.g., `merchant-sales-backups` — private repo)
2. **Google Drive or cloud storage** folder (accessible offline)

Never store backups only on the same machine as the application.

## Restoration Procedure

### Restore to a new Turso database:

```bash
# 1. Create a new Turso database
turso db create merchant-sales-restored

# 2. Get the database URL
turso db show merchant-sales-restored

# 3. Import the SQL dump
cat backup-2025-01-01.sql | turso db shell merchant-sales-restored

# 4. Verify data
turso db shell merchant-sales-restored "SELECT COUNT(*) FROM invoices;"
```

### Restore to a local SQLite file (for testing):

```bash
# SQLite is compatible with libSQL dumps
sqlite3 restored.db < backup-2025-01-01.sql
sqlite3 restored.db "SELECT COUNT(*) FROM invoices;"
```

## Testing Restoration

Before trusting a backup, test it monthly:

1. Export a backup
2. Create a temporary Turso DB named `merchant-sales-test`
3. Import the backup
4. Verify row counts match production:
   ```sql
   SELECT COUNT(*) FROM customers;
   SELECT COUNT(*) FROM invoices;
   SELECT COUNT(*) FROM payments;
   ```
5. Delete the test DB: `turso db destroy merchant-sales-test`

## Migrating Away from Turso

Because Turso uses standard SQLite-compatible SQL:

1. Export the `.sql` dump as above
2. The dump is importable into:
   - Any SQLite file
   - PostgreSQL (with minor type adjustments — TEXT dates become TIMESTAMPTZ)
   - Any libSQL-compatible system
3. No proprietary format or vendor lock-in

## Automation (Optional Future Step)

A GitHub Actions workflow can be added to schedule daily backups:

```yaml
# .github/workflows/backup.yml
name: Daily Database Backup
on:
  schedule:
    - cron: '0 2 * * *'  # 2am daily
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Install Turso CLI
        run: curl -sSfL https://get.tur.so/install.sh | bash
      - name: Export backup
        env:
          TURSO_API_TOKEN: ${{ secrets.TURSO_API_TOKEN }}
        run: turso db shell ${{ secrets.DB_NAME }} .dump > backup-$(date +%Y-%m-%d).sql
      # Add upload step to cloud storage
```
