<!-- Context: development/examples/navigation | Priority: high | Version: 1.0 | Updated: 2026-03-02 -->

# Development Examples Navigation

**Purpose**: Central index for code examples, schemas, and implementation patterns.

---

## Database & Schema

| File | Purpose | Lines |
|------|---------|-------|
| [supabase-schema.md](supabase-schema.md) | Complete schema with RLS policies, indexes, triggers | 89 |

---

## Quick Reference

**Schema Components**:
- `profiles` table — User metadata, settings
- `weight_entries` table — User data with RLS
- RLS policies — Per-user data isolation
- Auto-create trigger — Profile on signup

**Usage**:
```sql
-- Run in Supabase SQL Editor
-- Copy entire supabase-schema.sql file
```

---

## Related

- [../concepts/supabase-auth.md](../concepts/supabase-auth.md)
- [../guides/supabase-quickstart.md](../guides/supabase-quickstart.md)
- [../errors/auth-errors.md](../errors/auth-errors.md)
- [../../../supabase-schema.sql](../../../supabase-schema.sql)

(End of file - total 30 lines)
