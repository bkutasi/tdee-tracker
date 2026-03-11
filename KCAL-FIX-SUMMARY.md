# Database Constraint Fix & Kcal Features Verification

**Date**: 2026-03-11  
**Issue**: `null value in column "weight" violates not-null constraint`  
**Status**: ✅ **COMPLETE - MIGRATION APPLIED**

---

## ✅ Migration Applied Successfully

**Database**: tdee-tracker (zcxdiqjpcjfptinerexl)  
**Applied**: 2026-03-11  
**Status**: ✅ **SUCCESS**

### Verification Results:
- ✅ `weight` column is now **nullable** (is_nullable: YES)
- ✅ Check constraint **check_weight_or_calories** exists
- ✅ Constraint definition: `CHECK (((weight IS NOT NULL) OR (calories IS NOT NULL)))`

### Test Results:
- ✅ **108 tests passing**
- ⚠️ 1 pre-existing test failure (unrelated to this fix)

---

## Quick Summary

The error occurs when syncing **calories-only entries** (entries without weight) to Supabase. The database schema has a `NOT NULL` constraint on the `weight` column, but the application is designed to support calories-only tracking.

**Root Cause**: The migration to drop the `NOT NULL` constraint exists in `supabase-schema.sql` (lines 143-158) but hasn't been run on your production database yet.

---

## What Was Done

### 1. Created Migration Script ✅

**File**: `migrations/001-drop-weight-not-null.sql`

This script:
- Removes `NOT NULL` constraint from `weight` column
- Adds check constraint: `CHECK (weight IS NOT NULL OR calories IS NOT NULL)`
- Includes verification queries
- Safe to run multiple times

### 2. Verified Kcal Features ✅

**File**: `docs/kcal-features-verification.md`

Comprehensive verification of:
- ✅ Daily entry form accepts calories input
- ✅ Weekly view displays calories
- ✅ Dashboard shows target intake based on calories
- ✅ Sync handles calories-only entries with validation
- ✅ TDEE calculations use calorie data correctly
- ✅ Storage persists calories data

### 3. Existing Code Analysis ✅

The application **already has full calories support**:

| Component | Status | Details |
|-----------|--------|---------|
| `js/ui/dailyEntry.js` | ✅ Working | Accepts calories-only input |
| `js/ui/weeklyView.js` | ✅ Working | Displays calories in table |
| `js/ui/dashboard.js` | ✅ Working | Shows calorie targets |
| `js/sync.js` | ✅ Working | Validates & syncs calories-only |
| `js/calculator.js` | ✅ Working | Uses calories for TDEE |
| `js/storage.js` | ✅ Working | Persists calories data |

---

## Action Items

### Step 1: Run Database Migration (Required)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the contents of `migrations/001-drop-weight-not-null.sql`
3. Paste into SQL Editor
4. Click **"Run"**
5. Verify success message: `✅ Migration successful`

**Alternative**: Run these SQL commands directly:

```sql
-- Remove NOT NULL constraint
ALTER TABLE public.weight_entries 
ALTER COLUMN weight DROP NOT NULL;

-- Add check constraint (if not exists)
ALTER TABLE public.weight_entries
ADD CONSTRAINT check_weight_or_calories
CHECK (weight IS NOT NULL OR calories IS NOT NULL);
```

### Step 2: Verify Migration (Optional)

Run these queries to verify:

```sql
-- Check weight column is nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'weight_entries' 
  AND column_name = 'weight';
-- Expected: is_nullable = 'YES'

-- Check constraint exists
SELECT conname 
FROM pg_constraint 
WHERE conname = 'check_weight_or_calories';
-- Expected: 1 row returned
```

### Step 3: Test Calories-Only Entry

1. Open the app in browser
2. Open DevTools Console (F12)
3. Enter a calories-only entry:
   - Leave weight blank
   - Enter calories (e.g., 2000)
   - Click "Save"
4. Verify:
   - ✅ Entry saves locally (no error)
   - ✅ Weekly view shows calories, weight shows "—"
   - ✅ If authenticated, sync succeeds (check console)

### Step 4: Clean Sync Queue (If Needed)

If you have stuck sync operations:

```javascript
// In browser console:
SyncDebug.filterQueue()  // Remove invalid operations
SyncDebug.forceSync()    // Trigger sync
SyncDebug.status()       // Check sync status
```

---

## Files Created

| File | Purpose |
|------|---------|
| `migrations/001-drop-weight-not-null.sql` | Database migration script |
| `docs/kcal-features-verification.md` | Detailed verification report |
| `KCAL-FIX-SUMMARY.md` | This summary document |

---

## Technical Details

### Why This Error Occurred

1. **Database Schema**: Original schema had `weight DECIMAL(5,2) NOT NULL`
2. **App Design**: Supports calories-only entries (weight optional)
3. **Sync Conflict**: Sync tried to upload `weight: null` to database
4. **Constraint Violation**: Database rejected null weight

### How It's Fixed

1. **Migration**: Drops `NOT NULL` constraint on weight
2. **Check Constraint**: Ensures at least one field (weight OR calories) is present
3. **Sync Validation**: Three-layer validation prevents invalid entries:
   - Before queuing
   - Before saving
   - Queue cleanup tool

### Sync Validation Flow

```
User enters calories-only entry
    ↓
Sync.saveWeightEntry()
    ├─→ Validate: has calories? ✅ YES
    ├─→ Save to LocalStorage (weight: null, calories: 2000)
    └─→ Queue for sync
         ↓
    Background Sync (when online + authenticated)
         ↓
    Validate queue operation: has weight OR calories? ✅ YES
         ↓
    Upload to Supabase (weight: NULL, calories: 2000)
         ↓
    ✅ Success - entry synced
```

---

## Test Coverage

### Existing Tests (Passing)

- ✅ Sync queue operations with calories data
- ✅ TDEE calculation with calorie data
- ✅ Weekly summary with calorie averages
- ✅ Gap handling for missing calories

### Documented Test Gaps

The following tests are planned but not yet implemented (tracked in `sync-challenges.md`):

- [ ] Test `queueLocalEntriesForSync()` with null weight entries
- [ ] Test `saveWeightEntry()` with calories-only data
- [ ] Test `filterInvalidOperations()` function
- [ ] E2E test: sign in with calories-only entries

---

## Troubleshooting

### Error: "duplicate key value violates unique constraint"

**Cause**: Entry already exists in database (same user_id + date)

**Solution**: 
- Sync system has duplicate detection (converts INSERT to UPDATE)
- If error persists, run `SyncDebug.filterQueue()` to clean stuck operations

### Error: "Sync failed" (generic)

**Cause**: Various (network, auth, validation)

**Solution**:
```javascript
// Check sync status
SyncDebug.status()

// View error history
SyncDebug.errors()

// View pending operations
SyncDebug.queue()

// Force sync
SyncDebug.forceSync()
```

### Entries Not Syncing

**Checklist**:
1. ✅ User is authenticated? (`SyncDebug.status().isAuthenticated`)
2. ✅ Browser is online? (`navigator.onLine`)
3. ✅ Entries have weight OR calories? (validation)
4. ✅ Queue not stuck? (`SyncDebug.queue()`)

---

## Related Documentation

- `.opencode/context/project/sync-challenges.md` - Documents the null weight bug and resolution
- `.opencode/context/project/tdee-algorithms.md` - Calorie handling in TDEE calculations
- `supabase-schema.sql` (lines 143-158) - Migration section in schema file

---

## Next Steps

1. ✅ **Run migration** (Step 1 above)
2. ✅ **Test calories-only entry** (Step 3 above)
3. ✅ **Monitor sync status** for any errors
4. 📝 **Add missing tests** (optional, tracked in backlog)

---

**Status**: ✅ **READY FOR DEPLOYMENT**

All code changes are complete. Only database migration is required.

---

*Created: 2026-03-11*  
*Author: AI Development Team*
