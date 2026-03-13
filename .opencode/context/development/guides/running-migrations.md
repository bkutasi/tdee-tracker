<!-- Context: development/guides/running-migrations | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Guide: Running Database Migrations

**Purpose**: Apply schema changes to Supabase database safely with rollback capability.

**Last Updated**: 2026-03-11

---

## Overview

Supabase migrations are versioned SQL files applied sequentially. Each migration has an up (apply) and down (rollback) script.

## Migration File Structure

```
supabase/migrations/
├── 20260301000000_create_profiles.sql
├── 20260302000000_create_weight_entries.sql
└── 20260303000000_add_calories_column.sql
```

## Creating a Migration

### Using Supabase CLI

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref xyzcompany

# Create new migration
supabase migration new add_notes_column
```

### Manual Creation

```bash
# Create migration file
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_migration_name.sql
```

## Migration Template

```sql
-- supabase/migrations/20260311000000_add_notes_column.sql

-- Up migration
ALTER TABLE weight_entries 
ADD COLUMN notes TEXT;

-- Down migration (rollback)
-- Run this to undo the migration
ALTER TABLE weight_entries 
DROP COLUMN notes;
```

## Applying Migrations

### Via Supabase Dashboard

1. Supabase Dashboard → **SQL Editor**
2. Click **New query**
3. Paste migration SQL
4. Click **Run**
5. Verify success in output

### Via Supabase CLI

```bash
# Apply all pending migrations
supabase db push

# Apply specific migration
supabase migration up
```

### Via API

```bash
# Using curl
curl -X POST \
  https://xyzcompany.supabase.co/rest/v1/rpc/apply_migration \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"migration_file": "migration_name.sql"}'
```

## Verifying Migrations

```sql
-- Check applied migrations
SELECT version, name, inserted_at 
FROM supabase_migrations.schema_migrations 
ORDER BY inserted_at DESC;

-- Verify table structure
\d weight_entries

-- Check column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'weight_entries';
```

## Rollback Strategy

### Test Rollback First

```sql
-- In development branch
BEGIN;

-- Run down migration
ALTER TABLE weight_entries DROP COLUMN notes;

-- Verify rollback worked
\d weight_entries

-- If OK, rollback the rollback
ROLLBACK;

-- If not OK, fix and try again
```

### Production Rollback

```bash
# Using CLI
supabase migration down --version 20260311000000

# Or manually via SQL Editor
-- Run the down migration SQL
ALTER TABLE weight_entries DROP COLUMN notes;
```

## Best Practices

1. **Test in Development First**: Always test migrations on a branch
2. **Backup Before Production**: Export data before applying
3. **Idempotent Migrations**: Use `IF NOT EXISTS` where possible
4. **Small Migrations**: One logical change per migration
5. **Document Changes**: Comment what each migration does

```sql
-- Good: Idempotent migration
ALTER TABLE weight_entries 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Good: With comment
COMMENT ON COLUMN weight_entries.notes IS 
'Optional user notes about the entry';
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Migration fails mid-way | Rollback manually, fix SQL, re-apply |
| Column already exists | Use `IF NOT EXISTS` or check migration history |
| Foreign key errors | Ensure referenced tables exist first |
| RLS policy conflicts | Update policies after schema changes |

**References**:
- `supabase-schema.sql` — Initial schema migration
- `supabase/migrations/` — Migration files directory

**Related**:
- [concepts/row-level-security.md](../concepts/row-level-security.md)
- [examples/supabase-schema.md](../examples/supabase-schema.md)
- [guides/supabase-quickstart.md](supabase-quickstart.md)

(End of file - total 151 lines)
