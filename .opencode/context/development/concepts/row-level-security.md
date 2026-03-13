<!-- Context: development/concepts/row-level-security | Priority: critical | Version: 1.0 | Updated: 2026-03-11 -->

# Concept: Row Level Security (RLS)

**Purpose**: Database-level security ensuring users can only access their own data, even if client-side code is compromised.

**Last Updated**: 2026-03-11

---

## Core Idea

RLS enforces access control at the database row level using PostgreSQL policies. Combined with Supabase Auth, it ensures `auth.uid()` matches `user_id` for all operations.

## Key Points

- **Database-Level Security**: Policies enforced by PostgreSQL, not application code
- **Auth Integration**: `auth.uid()` returns current user's UUID from JWT
- **Default Deny**: Without policies, no rows are accessible (even to authenticated users)
- **Policy Types**: SELECT, INSERT, UPDATE, DELETE — each needs explicit policy
- **Cascade Delete**: When user deleted, all their data deleted automatically

## RLS Policy Structure

```sql
-- Basic policy pattern
CREATE POLICY "policy_name"
    ON table_name
    FOR operation  -- SELECT, INSERT, UPDATE, DELETE
    USING (condition)        -- For SELECT, UPDATE, DELETE
    WITH CHECK (condition);  -- For INSERT, UPDATE
```

## Common Policy Patterns

```sql
-- User can view own data
CREATE POLICY "Users view own entries"
    ON weight_entries FOR SELECT
    USING (auth.uid() = user_id);

-- User can insert own data
CREATE POLICY "Users insert own entries"
    ON weight_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- User can update own data
CREATE POLICY "Users update own entries"
    ON weight_entries FOR UPDATE
    USING (auth.uid() = user_id);

-- User can delete own data
CREATE POLICY "Users delete own entries"
    ON weight_entries FOR DELETE
    USING (auth.uid() = user_id);
```

## Security Checklist

- [ ] RLS enabled on all tables: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- [ ] Policies exist for all operations (SELECT, INSERT, UPDATE, DELETE)
- [ ] Policies use `auth.uid()` for user identification
- [ ] Test policies with different user accounts
- [ ] Verify no public access unless explicitly intended

## Debugging RLS

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View all policies
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies;

-- Test as specific user
SET LOCAL ROLE authenticated;
SET request.jwt.claims.sub = 'user-uuid-here';
SELECT * FROM weight_entries;
```

**References**:
- `supabase-schema.sql` — Complete schema with RLS policies
- `js/sync.js` — Database operations that rely on RLS (lines 200-350)
- `js/auth.js` — Auth state that provides `auth.uid()`

**Related**:
- [concepts/supabase-auth.md](supabase-auth.md)
- [examples/supabase-schema.md](../examples/supabase-schema.md)
- [guides/supabase-quickstart.md](../guides/supabase-quickstart.md)
- [errors/auth-errors.md](../errors/auth-errors.md)

(End of file - total 79 lines)
