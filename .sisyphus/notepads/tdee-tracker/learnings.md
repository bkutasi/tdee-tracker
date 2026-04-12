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

## 2026-04-12 - Sync Module Split: Two Bugs Slipped Through

### Bug 1: Missing CRUD Methods on SyncQueue

**Problem**: After refactoring `js/sync.js` into 4 files, `SyncQueue` was missing `saveWeightEntry`, `updateWeightEntry`, `deleteWeightEntry`, `fetchWeightEntries` on its public API. `sync-core.js` delegated to these methods, but they didn't exist — every call silently returned `{ success: false, error: 'SyncQueue not available' }`.

**Why it slipped through**:
- Node.js tests (`require()`) passed because delegation fallback returned error objects that tests didn't assert on deeply
- The test suite verified LocalStorage side effects and queue state, not the actual delegation chain
- No integration test exercised the full `Sync.saveWeightEntry() → SyncQueue.saveWeightEntry()` path

**Fix**: Added all 4 missing methods to `SyncQueue`'s return object with proper validation, LocalStorage ops, and queue operations.

**Lesson**: When extracting methods into a delegated module, **verify the delegation contract** — the delegator expects methods X, Y, Z; confirm they exist on the delegatee. A simple `Object.keys(SyncQueue)` check would have caught this instantly.

### Bug 2: `const _SyncDebug` Global Scope Collision in Browser

**Problem**: Each of the 4 split sync files declared `const _SyncDebug = new Proxy(...)` at **top-level script scope** (outside the IIFE). In browsers, all `<script>` tags share the same global scope — `const` throws `SyntaxError: Identifier '_SyncDebug' has already been declared` on the 2nd file load.

**Why it slipped through**:
- **Node.js tests use `require()`** — each file gets its own function closure, `const` never leaks globally → ✅ green
- **ESLint is per-file** — no cross-file scope awareness → ✅ green
- **Browser `<script>` tags** share global scope → ❌ fatal, but nobody opened the browser
- Deploy went out relying solely on Node.js test output

**Fix**: Moved `_getSyncDebug()` and `_SyncDebug` declarations **inside** each module's IIFE closure. Each file now has its own scoped copy — zero global pollution, zero collision.

**Golden Rule**: When splitting a monolithic file into multiple `<script>`-loaded modules:
1. **Never** declare `const`/`let` at top-level script scope — always inside the IIFE
2. **Always** test in a real browser, not just Node.js. Script tag loading ≠ module loading
3. Add a VM-based test that evals all files in a shared global context to catch collisions early

