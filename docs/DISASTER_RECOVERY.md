# PostgreSQL Disaster Recovery & Backup Verification Plan

> **Scope**: HappyTF PostgreSQL instances (Supabase Production & Self-Hosted Fallback), Redis persistent caches, and attachment storage.

---

## 1. Automated Backup Cadence

| Asset | Frequency | Retention | Mechanism | Destination |
|-------|-----------|-----------|-----------|-------------|
| Production DB (PostgreSQL) | Daily snapshot + WAL archiving | 30 days point-in-time recovery (PITR) | Supabase Managed Backup / `pg_dump` | Encrypted S3 Bucket |
| Redis In-Memory State | RDB Snapshot every 15 min, AOF hourly | 7 days | Upstash / Redis Sentinel snapshots | Off-site cloud backup |
| Workspace Attachments | Continuous versioning | 90 days retention | Supabase Object Storage / AWS S3 | Cross-region replicated |

---

## 2. On-Demand Database Backup

To create an immediate full logical snapshot before executing risky migrations or major releases:

```bash
# Dump complete schema and table data using Supabase CLI
supabase db dump -f supabase/backups/backup_$(date +%Y%m%d_%H%M%S).sql --data-only

# Or using pg_dump directly:
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="happytf_prod_backup_$(date +%Y%m%d_%H%M%S).dump"
```

---

## 3. Restore Verification Protocol

A backup is only as good as its proven restore. Test the restore protocol monthly on staging:

```bash
# 1. Spin up an isolated staging / test instance
supabase start

# 2. Restore the logical dump onto the test instance
pg_restore -d "$STAGING_DATABASE_URL" --clean --if-exists "happytf_prod_backup.dump"

# 3. Verify data integrity:
# Run sanity queries against critical tables
SELECT count(*) FROM boards;
SELECT count(*) FROM board_items;
SELECT count(*) FROM workspace_members;
```

### Recovery Time Objective (RTO) & Recovery Point Objective (RPO)
- **RTO (Max Downtime)**: < 15 minutes for logical restore.
- **RPO (Max Data Loss Window)**: < 5 minutes via continuous WAL archiving.
