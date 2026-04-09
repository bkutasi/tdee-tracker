# Learnings

## 2026-03-30 - CI Coverage Fix

**Problem**: `test` job ran `npm run coverage` but `c8` wasn't installed, causing `sh: 1: c8: not found`.

**Root Cause**: The `e2e` job had `npm ci` (for Playwright), but the `test` job skipped it since plain `node tests/node-test.js` doesn't need dependencies. However, the coverage command DOES need `c8`.

**Solution**: Add `npm ci` step to `test` job before running coverage.

**Pattern**: When adding npm script commands to CI, always ensure dependencies are installed first—even if other steps in the same job don't need them.

**File**: `.github/workflows/deploy.yml`

## 2026-04-09 - getStatus() Async Bug Fix

**Bug**: `hasSession: !!(Auth.getSession && Auth.getSession())` at sync.js:1294 was ALWAYS truthy because:
- `Auth.getSession` is a function reference (truthy)
- Calling it without `await` returns a Promise object (also truthy)
- Result: `hasSession` was always `true` regardless of actual auth state

**Fix**: Changed to `hasSession: Auth.isAuthenticated() || false`
- `Auth.isAuthenticated()` is synchronous, returns `currentUser !== null`
- Returns proper boolean reflecting actual authentication state
- `getStatus()` remains synchronous (no async change needed)

**Key Insight**: `Auth.getSession()` is async and MUST be awaited. When checking auth state synchronously, always use `Auth.isAuthenticated()` instead.

## 2026-04-09 - saveWeightEntry Broken isNewEntry Check

**Bug**: `saveWeightEntry` at sync.js:1077-1079 performed an unnecessary `Storage.getAllEntries()` read to determine if an entry was new. The check `!existingEntry || !existingEntry.id` was ALWAYS true because local entries never have an `.id` field. This meant:
- Every entry was queued as 'create' anyway (correct behavior by accident)
- But we paid the cost of reading ALL entries from LocalStorage on every save
- `createRecord()` at line 909 already handles duplicates by checking Supabase for existing `(user_id, date)` pairs

**Fix**: Removed the `getAllEntries()` read and `isNewEntry` check. Always queue as 'create' — `createRecord()` converts to UPDATE if the entry already exists in Supabase.

**Pattern**: Don't duplicate existence checks across layers. Let the downstream function (`createRecord`) handle deduplication since it has access to the authoritative data source (Supabase).

**Files**: `js/sync.js` (lines 1075-1099 simplified to 10 lines)

