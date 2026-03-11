-- Migration: Drop NOT NULL constraint from weight_entries.weight
-- Purpose: Support calories-only entries (weight optional)
-- Date: 2026-03-11
-- 
-- Run this in Supabase SQL Editor if you already have the weight_entries table
-- and need to support calories-only entries.
--
-- This migration is SAFE to run multiple times (uses IF NOT EXISTS patterns)

BEGIN;

-- Step 1: Remove NOT NULL constraint from weight column
-- This allows entries with only calories (no weight)
ALTER TABLE public.weight_entries 
ALTER COLUMN weight DROP NOT NULL;

-- Step 2: Add check constraint to ensure at least one field is present
-- Prevents entries with BOTH weight and calories as NULL
DO $$
BEGIN
    -- Only add constraint if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_weight_or_calories'
    ) THEN
        ALTER TABLE public.weight_entries
        ADD CONSTRAINT check_weight_or_calories
        CHECK (weight IS NOT NULL OR calories IS NOT NULL);
        
        RAISE NOTICE 'Added check constraint: check_weight_or_calories';
    ELSE
        RAISE NOTICE 'Constraint check_weight_or_calories already exists';
    END IF;
END $$;

-- Step 3: Verify the changes
DO $$
DECLARE
    v_is_nullable boolean;
    v_constraint_exists boolean;
BEGIN
    -- Check if weight column is now nullable
    SELECT (is_nullable = 'YES') INTO v_is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weight_entries'
      AND column_name = 'weight';
    
    -- Check if constraint exists
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_weight_or_calories'
    ) INTO v_constraint_exists;
    
    -- Report results
    IF v_is_nullable AND v_constraint_exists THEN
        RAISE NOTICE '✅ Migration successful: weight column is now nullable, check constraint added';
    ELSIF v_is_nullable AND NOT v_constraint_exists THEN
        RAISE NOTICE '⚠️  Partial success: weight column is nullable but check constraint missing';
    ELSE
        RAISE WARNING '❌ Migration failed: weight column still has NOT NULL constraint';
    END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify:

-- 1. Check column constraints
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'weight_entries' AND column_name IN ('weight', 'calories');

-- 2. Check constraints
-- SELECT conname, contype, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'public.weight_entries'::regclass;

-- 3. Test insert (calories-only entry)
-- INSERT INTO public.weight_entries (user_id, date, calories)
-- VALUES (auth.uid(), CURRENT_DATE, 2000);

-- 4. Test insert (weight-only entry)
-- INSERT INTO public.weight_entries (user_id, date, weight)
-- VALUES (auth.uid(), CURRENT_DATE, 80.5);

-- 5. Test insert (both weight and calories)
-- INSERT INTO public.weight_entries (user_id, date, weight, calories)
-- VALUES (auth.uid(), CURRENT_DATE, 80.5, 2000);

-- 6. Test insert (should FAIL - neither weight nor calories)
-- INSERT INTO public.weight_entries (user_id, date)
-- VALUES (auth.uid(), CURRENT_DATE);
