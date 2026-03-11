<!-- Context: development/examples/supabase-schema | Priority: critical | Version: 1.0 | Updated: 2026-03-02 -->

# Example: Database Schema with RLS

**Purpose**: Complete Supabase database schema with Row Level Security policies for user data isolation.

**Last Updated**: 2026-03-02

---

## Core Schema

Two tables: `profiles` (user metadata) and `weight_entries` (user data), with RLS ensuring per-user access only.

## profiles Table

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    settings JSONB DEFAULT '{"unit": "kg", "theme": "light"}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## weight_entries Table

```sql
CREATE TABLE weight_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    calories INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Index for fast queries
CREATE INDEX idx_weight_entries_user_date 
    ON weight_entries(user_id, date DESC);
```

## Row Level Security Policies

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

-- Users can view own profile
CREATE POLICY "Users view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Users can view own weight entries
CREATE POLICY "Users view own entries"
    ON weight_entries FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert own entries
CREATE POLICY "Users insert own entries"
    ON weight_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update own entries
CREATE POLICY "Users update own entries"
    ON weight_entries FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete own entries
CREATE POLICY "Users delete own entries"
    ON weight_entries FOR DELETE
    USING (auth.uid() = user_id);
```

## Automatic Profile Creation Trigger

```sql
-- Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**References**:
- `supabase-schema.sql` — Complete schema (run in Supabase SQL Editor)
- `js/sync.js` — Database operations using this schema

**Related**:
- [concepts/supabase-auth.md](../concepts/supabase-auth.md)
- [guides/supabase-quickstart.md](../guides/supabase-quickstart.md)
- [errors/auth-errors.md](../errors/auth-errors.md)

(End of file - total 89 lines)
