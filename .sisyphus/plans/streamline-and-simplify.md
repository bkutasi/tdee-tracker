# TDEE Tracker — Codebase Streamline & Simplify

## TL;DR

> **Quick Summary**: Fix 5 critical runtime bugs, split js/sync.js (1584 lines) into 4 focused modules, deduplicate code across calculator modules, clean up CSS/JS dead code, and streamline the PWA experience. Zero behavioral changes except explicitly flagged bugs.
>
> **Deliverables**:
> - 5 critical bugs fixed (async getStatus, cache bypass, missing error codes, validation gaps)
> - sync.js split into: sync-errors.js, sync-queue.js, sync-merge.js, sync-core.js (each ≤400 lines)
> - 4 deduplication targets consolidated (linear regression ×3→1, round ×4→1, calculateStats ×4→1, calculateEWMAWeightDelta ×3→1)
> - CSS: duplicate @keyframes removed, .btn-ghost conflict resolved
> - Dead code removed (~500+ lines total)
> - Service worker skipWaiting() fixed, manifest screenshots added
>
> **Estimated Effort**: Large (5 waves, 24 tasks)
> **Parallel Execution**: YES — 5 waves with 4-7 parallel tasks per wave
> **Critical Path**: Wave 1 (bug fixes) → Wave 2 (sync split) → Wave 3 (dedup) → Wave 4 (cleanup) → Wave 5 (verify)

---

## Context

### Original Request
"Make a plan for all, aim for agent parallelization, and also the simplification of files eg js/sync.js is massive and hard to maintain"

### Interview Summary
Three parallel explore agents conducted a comprehensive code audit:
- **Agent 1** (JS/AI slop): Found triple-duplicated linear regression, dead coordinator fallbacks (~400 lines), Proxy over-engineering, JSDoc bloat
- **Agent 2** (UI/PWA): Found .btn-ghost visual bug, unconditional skipWaiting(), duplicate @keyframes, repeated getElementById calls
- **Agent 3** (sync/architecture): Found async getStatus bug, cache bypass in _mergeAndSave, nested retry amplification, 7 undefined error codes, two full table downloads on sign-in

### Metis Review
**Identified Gaps** (addressed):
- Module load order after sync.js split → Defined explicit script order in Wave 2
- Circular dependency risk → Designed unidirectional dependency graph
- Behavioral preservation → Each task specifies "must produce identical results"
- Test baseline → Wave 0 added to confirm green state before changes
- CSS visual regression → Playwright screenshot comparison added to QA
- Water weight detection interaction → Deduplication preserves Calculator.round() behavior

---

## Work Objectives

### Core Objective
Fix all critical bugs, reduce sync.js from 1584 to ~1200 lines across 4 modules, eliminate code duplication, remove dead code, and improve PWA UX — all while maintaining 100% test parity and identical user-facing behavior (except flagged bugs).

### Concrete Deliverables
- 5 critical runtime bugs fixed with tests
- 4 new sync modules (sync-errors.js, sync-queue.js, sync-merge.js, sync-core.js)
- Old sync.js reduced to thin coordinator or deleted
- Shared functions extracted (round, linearRegression, calculateStats, calculateEWMAWeightDelta)
- CSS deduplicated (keyframes, .btn-ghost)
- Dead code removed (~500+ lines)
- sw.js skipWaiting() fixed
- manifest.json screenshots added
- Dashboard TDEE calculations reduced

### Definition of Done
- [ ] `node tests/node-test.js` passes with same or more tests (155+)
- [ ] `npx eslint js/` returns 0 errors
- [ ] App loads, saves entries, syncs correctly (smoke test)
- [ ] No behavioral regression (verified by Playwright screenshots where applicable)

### Must Have
- Identical `Sync.*`, `Calculator.*`, `Storage.*`, `Auth.*` global API surface
- IIFE module pattern preserved (no ES6 modules)
- Zero npm dependencies
- Each wave passes tests before next wave begins
- sync.js split maintains unidirectional dependencies (no circular refs)

### Must NOT Have (Guardrails)
- No behavioral changes except the 5 explicitly flagged critical bugs
- No new features or UI redesigns
- No premature abstraction (only deduplicate exact duplicates)
- No changes to Supabase schema or API contracts
- No modifications to test expectations (may add tests, never weaken them)
- No parallel edits to the same file within a wave

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (155+ tests, custom framework)
- **Automated tests**: Tests-after (existing tests verify behavior preservation; new tests added for critical bug fixes)
- **Framework**: Custom test framework (Node.js + browser runners)
- **Agent-Executed QA**: ALWAYS (every task has explicit QA scenarios)

### QA Policy
- **Node.js tests**: `node tests/node-test.js` — must pass after every wave
- **Browser tests**: `tests/test-runner.html` — spot-check after Wave 2 and Wave 5
- **ESLint**: `npx eslint js/` — must pass after every commit
- **Frontend/UI**: Playwright screenshots for CSS changes
- **Sync behavior**: Curl Supabase API verification for sync module changes

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Baseline Verification — Sequential):
└── Task 0: Run test suite, confirm green baseline [quick]

Wave 1 (Critical Bug Fixes — 4 parallel, independent files):
├── Task 1: Fix getStatus() async bug (sync.js) [quick]
├── Task 2: Define missing error codes (errors.js) [quick]
├── Task 3: Fix _mergeAndSave cache bypass (sync.js) [quick]
└── Task 4: Add entry validation guards (sync.js) [quick]

Wave 2 (sync.js Split — 4 parallel modules, then integration):
├── Task 5: Create sync-errors.js — error handling extraction [deep]
├── Task 6: Create sync-queue.js — queue + retry logic [deep]
├── Task 7: Create sync-merge.js — merge + conflict resolution [deep]
├── Task 8: Create sync-core.js — main API coordinator [deep]
└── Task 9: Wire new modules, delete old sync.js, update index.html [quick]

Wave 3 (Deduplication — 4 parallel, independent targets):
├── Task 10: Deduplicate round() (4 copies → 1) [quick]
├── Task 11: Deduplicate linear regression (3 copies → 1) [quick]
├── Task 12: Deduplicate calculateStats() (4 copies → 1) [quick]
└── Task 13: Deduplicate calculateEWMAWeightDelta() (3 copies → 1) [quick]

Wave 4 (Cleanup — 6 fully parallel, independent files):
├── Task 14: Remove dead debug code (sync.js + sync-debug.js) [quick]
├── Task 15: Fix CSS duplicate @keyframes [quick]
├── Task 16: Fix .btn-ghost conflict [quick]
├── Task 17: Fix sw.js skipWaiting() [quick]
├── Task 18: Clean JSDoc bloat across all JS files [quick]
└── Task 19: Reduce Dashboard TDEE calculations [deep]

Wave 5 (Final Verification — Sequential):
├── Task 20: Run full test suite + ESLint [quick]
├── Task 21: Playwright smoke test (save entry, sync, UI) [quick]
└── Task 22: Cache version bump [quick]

Critical Path: Task 0 → Tasks 1-4 → Tasks 5-8 → Task 9 → Tasks 10-13 → Tasks 14-19 → Tasks 20-22
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 6 (Wave 4)
```

### Dependency Matrix

- **0**: - → 1-4
- **1-4**: 0 → 5-8
- **5-8**: 1-4 → 9
- **9**: 5-8 → 10-13
- **10-13**: 9 → 14-19
- **14-19**: 9 (most), none (15,16,17) → 20-22
- **20-22**: 14-19 → done

### Agent Dispatch Summary

- **Wave 0**: **1** — T0 → `quick`
- **Wave 1**: **4** — T1 → `quick`, T2 → `quick`, T3 → `quick`, T4 → `quick`
- **Wave 2**: **5** — T5 → `deep`, T6 → `deep`, T7 → `deep`, T8 → `deep`, T9 → `quick`
- **Wave 3**: **4** — T10 → `quick`, T11 → `quick`, T12 → `quick`, T13 → `quick`
- **Wave 4**: **6** — T14 → `quick`, T15 → `quick`, T16 → `quick`, T17 → `quick`, T18 → `quick`, T19 → `deep`
- **Wave 5**: **3** — T20 → `quick`, T21 → `quick`, T22 → `quick`

---

## TODOs

- [x] 0. Baseline Verification — Run Test Suite

  **What to do**:
  - Run `node tests/node-test.js` and confirm all 155+ tests pass
  - Run `npx eslint js/` and confirm 0 errors
  - Record test count and any warnings as baseline

  **Must NOT do**:
  - Fix any issues found (document only, fix in later waves)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: No git operations needed, just running commands

  **Parallelization**:
  - **Can Run In Parallel**: NO (must complete before any other task)
  - **Sequential**: Blocks all subsequent waves

  **References**:
  - `tests/node-test.js` — Node.js test runner
  - `eslint.config.js` — ESLint configuration

  **Acceptance Criteria**:
  - [ ] `node tests/node-test.js` exits with code 0
  - [ ] Test count recorded (expected: 155+)
  - [ ] `npx eslint js/` exits with code 0

  **QA Scenarios**:

  ```
  Scenario: Test suite passes
    Tool: Bash
    Steps:
      1. Run: node tests/node-test.js
      2. Assert: exit code 0
      3. Capture: total test count from output
    Expected Result: All tests pass, exit code 0
    Evidence: .sisyphus/evidence/task-0-test-baseline.txt
  ```

  **Commit**: YES
  - Message: `chore(tests): establish green baseline before refactoring`
  - Pre-commit: `node tests/node-test.js`

---

- [x] 1. Fix getStatus() Async Bug

  **What to do**:
  - In `js/sync.js:1294`, `Auth.getSession()` is called without `await`, returning a Promise that's always truthy
  - Change `hasSession: !!(Auth.getSession && Auth.getSession())` to properly await or use `Auth.isAuthenticated()` instead
  - Since `getStatus()` is synchronous, replace with `hasSession: Auth.isAuthenticated() || false`

  **Must NOT do**:
  - Change the return shape of `getStatus()` — must remain a plain object (not Promise)
  - Modify any other part of getStatus()

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: Will commit after fix

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3, 4 — different concerns in sync.js, minimal overlap risk)
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: None
  - **Blocked By**: Task 0

  **References**:
  - `js/sync.js:1287-1310` — getStatus() function
  - `js/auth.js:245-247` — Auth.isAuthenticated() implementation

  **Acceptance Criteria**:
  - [ ] `getStatus().hasSession` returns boolean, not Promise
  - [ ] `getStatus().isAuthenticated` correctly reflects auth state

  **QA Scenarios**:

  ```
  Scenario: getStatus returns booleans not promises
    Tool: Bash (Node.js REPL)
    Steps:
      1. Load js/sync.js in Node.js test environment
      2. Call Sync.getStatus()
      3. Assert: typeof result.hasSession === 'boolean'
      4. Assert: typeof result.isAuthenticated === 'boolean'
    Expected Result: Both fields are booleans
    Evidence: .sisyphus/evidence/task-1-getStatus-types.txt
  ```

  **Commit**: YES
  - Message: `fix(sync): getStatus() returns booleans not promises for hasSession`
  - Files: `js/sync.js`
  - Pre-commit: `node tests/node-test.js`

---

- [x] 2. Define Missing Error Codes

  **What to do**:
  - Add 7 missing error codes to `js/errors.js`:
    - `AppErrors.STORAGE.QUOTA_EXCEEDED`
    - `AppErrors.STORAGE.INVALID_INPUT`
    - `AppErrors.STORAGE.NOT_FOUND`
    - `AppErrors.STORAGE.INVALID_FORMAT`
    - `AppErrors.STORAGE.VERSION_MISMATCH`
    - `AppErrors.SYNC.NOT_AUTHENTICATED` (already partially defined, verify)
    - `AppErrors.SYNC.SUPABASE_NOT_AVAILABLE`
    - `AppErrors.AUTH.NOT_INITIALIZED`
  - Verify all references in storage.js, sync.js, auth.js resolve correctly

  **Must NOT do**:
  - Change error handling logic — only add missing definitions
  - Rename existing error codes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 3, 4 — different files)
  - **Parallel Group**: Wave 1
  - **Blocked By**: Task 0

  **References**:
  - `js/errors.js` — Current error code definitions (24 lines)
  - `js/storage.js:167,289,303,418,424` — References to undefined storage errors
  - `js/sync.js:523,1205,1211` — References to undefined sync errors
  - `js/auth.js:149,181,216,255` — References to undefined auth errors

  **Acceptance Criteria**:
  - [ ] All 8 error codes defined in errors.js
  - [ ] Grep for each error code reference finds definition
  - [ ] No `TypeError: Cannot read properties of undefined` at runtime

  **QA Scenarios**:

  ```
  Scenario: All error codes are defined
    Tool: Bash
    Steps:
      1. Grep for each referenced error code in errors.js
      2. Assert: all 8 codes found in errors.js
    Expected Result: No undefined error codes
    Evidence: .sisyphus/evidence/task-2-error-codes.txt
  ```

  **Commit**: YES
  - Message: `fix(errors): define 8 missing error codes referenced across codebase`
  - Files: `js/errors.js`
  - Pre-commit: `node tests/node-test.js`

---

- [x] 3. Fix _mergeAndSave Cache Bypass

  **What to do**:
  - In `js/sync.js:365`, `_mergeAndSave()` writes directly to `localStorage.setItem('tdee_entries', ...)` bypassing `Storage.entriesCache`
  - After the direct write, add `Storage.entriesCache = null` (or equivalent cache invalidation)
  - Alternatively, use `Storage` module methods instead of direct localStorage access

  **Must NOT do**:
  - Change the merge logic itself
  - Change the data format being written

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 2, 4 — different lines in sync.js)
  - **Parallel Group**: Wave 1
  - **Blocked By**: Task 0

  **References**:
  - `js/sync.js:344-369` — _mergeAndSave function
  - `js/storage.js:20` — entriesCache declaration
  - `js/storage.js:162` — Cache invalidation pattern (entriesCache = null)

  **Acceptance Criteria**:
  - [ ] After _mergeAndSave, Storage.getAllEntries() returns merged data
  - [ ] No stale cache after sync merge

  **QA Scenarios**:

  ```
  Scenario: Cache invalidated after merge
    Tool: Bash (Node.js test environment)
    Steps:
      1. Set up Storage with entries in cache
      2. Call Sync._mergeAndSave with different remote entries
      3. Call Storage.getAllEntries()
      4. Assert: returned entries include merged data, not stale cache
    Expected Result: Merged data returned, not stale cached data
    Evidence: .sisyphus/evidence/task-3-cache-invalidation.txt
  ```

  **Commit**: YES
  - Message: `fix(sync): _mergeAndSave invalidates Storage cache after direct write`
  - Files: `js/sync.js`
  - Pre-commit: `node tests/node-test.js`

---

- [x] 4. Add Entry Validation Guards

  **What to do**:
  - Fix `saveWeightEntry()` broken `isNewEntry` check (sync.js:1077-1079): local entries never have `.id` field, so check always returns true
  - Simplify: always use 'create' operation type, let `createRecord()` handle existence check (it already does at line 909)
  - Remove the unnecessary `Storage.getAllEntries()` read at line 1077
  - Verify `deleteWeightEntry()` ID validation is present (already exists at line 1164, confirm it's sufficient)

  **Must NOT do**:
  - Change the entry save logic beyond fixing the broken isNewEntry check
  - Modify createRecord() existence check (it already works correctly)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 2, 3)
  - **Parallel Group**: Wave 1
  - **Blocked By**: Task 0

  **References**:
  - `js/sync.js:1075-1099` — saveWeightEntry with broken isNewEntry check
  - `js/sync.js:907-925` — createRecord existence check (already handles duplicates)
  - `js/sync.js:1160-1166` — deleteWeightEntry ID validation

  **Acceptance Criteria**:
  - [ ] saveWeightEntry no longer reads all entries to determine create vs update
  - [ ] deleteWeightEntry rejects null/empty/whitespace IDs
  - [ ] All entries queued as 'create', createRecord handles existence

  **QA Scenarios**:

  ```
  Scenario: saveWeightEntry queues create without reading all entries
    Tool: Bash (Node.js test environment)
    Steps:
      1. Mock Storage.getAllEntries to track calls
      2. Call Sync.saveWeightEntry({date:'2026-04-08', weight:80.5})
      3. Assert: Storage.getAllEntries was NOT called
      4. Assert: queueOperation was called with type='create'
    Expected Result: No getAllEntries call, create operation queued
    Evidence: .sisyphus/evidence/task-4-save-entry-no-read.txt
  ```

  **Commit**: YES
  - Message: `fix(sync): remove broken isNewEntry check, simplify saveWeightEntry`
  - Files: `js/sync.js`
  - Pre-commit: `node tests/node-test.js`

---

- [ ] 5. Create sync-errors.js — Extract Error Handling

  **What to do**:
  - Create `js/sync-errors.js` as IIFE module exposing `SyncErrors` global
  - Move error recording, error history management, and error-related constants
  - Functions to extract: `recordError()`, `loadErrorHistory()`, `saveErrorHistory()`, `getErrorHistory()`, `clearErrorHistory()`, `filterInvalidOperations()`, `removeStuckOperations()`
  - Constants: `MAX_ERROR_HISTORY`
  - Keep backward compat: `Sync.recordError` etc. still work via re-export

  **Must NOT do**:
  - Change error recording logic
  - Modify error history format
  - Touch sync.js until Task 9 (integration)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6, 7, 8 — separate files)
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1-4

  **References**:
  - `js/sync.js:218-270` — loadErrorHistory, saveErrorHistory, recordError
  - `js/sync.js:1342-1356` — getErrorHistory, clearErrorHistory
  - `js/sync.js:1372-1421` — removeStuckOperations, filterInvalidOperations
  - `js/errors.js` — AppErrors definitions (separate module, don't touch)

  **Acceptance Criteria**:
  - [ ] sync-errors.js ≤300 lines
  - [ ] All error functions work identically
  - [ ] `node tests/node-test.js` passes
  - [ ] IIFE pattern consistent with other modules

  **QA Scenarios**:

  ```
  Scenario: Error recording works from new module
    Tool: Bash (Node.js test environment)
    Steps:
      1. Load sync-errors.js in test environment
      2. Call SyncErrors.recordError('test', new Error('test error'))
      3. Call SyncErrors.getErrorHistory()
      4. Assert: history contains the recorded error
    Expected Result: Error recorded and retrievable
    Evidence: .sisyphus/evidence/task-5-error-recording.txt
  ```

  **Commit**: YES
  - Message: `refactor(sync): extract error handling to sync-errors.js module`
  - Files: `js/sync-errors.js`
  - Pre-commit: `node tests/node-test.js`

---

- [ ] 6. Create sync-queue.js — Extract Queue Management

  **What to do**:
  - Create `js/sync-queue.js` as IIFE module exposing `SyncQueue` global
  - Move: `loadSyncQueue()`, `saveSyncQueue()`, `queueOperation()`, `clearQueue()`, `startBackgroundSync()`, `canSync()`
  - Move: `sleep()`, `sleepWithBackoff()` helpers
  - Move: `executeOperation()` with its retry loop
  - Move: `createRecord()`, `updateRecord()`, `deleteRecord()`, `getSupabase()`
  - Move: constants `SYNC_INTERVAL`, `MAX_RETRIES`, `QUEUE_KEY`, `AUTH_TIMEOUT`, `AUTH_POLL_INTERVAL`, `TOAST_AUTO_HIDE_DELAY`
  - Fix nested retry bug: remove inner retry loop in executeOperation(), use single retry mechanism
  - Keep backward compat via re-export

  **Must NOT do**:
  - Change sync queue behavior (except fixing the nested retry amplification bug)
  - Touch sync.js until Task 9

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 7, 8 — separate files)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1-4

  **References**:
  - `js/sync.js:191-216` — loadSyncQueue, saveSyncQueue
  - `js/sync.js:684-706` — queueOperation
  - `js/sync.js:711-801` — syncAll (orchestrates queue)
  - `js/sync.js:806-892` — executeOperation with nested retry bug
  - `js/sync.js:898-997` — createRecord, updateRecord, deleteRecord
  - `js/sync.js:1002-1028` — getSupabase
  - `js/sync.js:639-645` — startBackgroundSync
  - `js/sync.js:653-675` — canSync

  **Acceptance Criteria**:
  - [ ] sync-queue.js ≤400 lines
  - [ ] Queue operations work identically
  - [ ] Nested retry bug fixed (single retry loop)
  - [ ] `node tests/node-test.js` passes

  **QA Scenarios**:

  ```
  Scenario: Queue operations work from new module
    Tool: Bash (Node.js test environment)
    Steps:
      1. Load sync-queue.js in test environment
      2. Call SyncQueue.queueOperation('create', 'weight_entries', {date:'2026-04-08'})
      3. Call SyncQueue.getQueue()
      4. Assert: queue contains the operation
    Expected Result: Operation queued and retrievable
    Evidence: .sisyphus/evidence/task-6-queue-operations.txt

  Scenario: Retry amplification bug fixed
    Tool: Bash (Node.js test environment)
    Steps:
      1. Mock Supabase to always fail
      2. Queue an operation
      3. Run syncAll
      4. Count total HTTP attempts made
      5. Assert: attempts <= MAX_RETRIES (3), not 12+
    Expected Result: Max 3 retry attempts, not amplified
    Evidence: .sisyphus/evidence/task-6-retry-count.txt
  ```

  **Commit**: YES
  - Message: `refactor(sync): extract queue management to sync-queue.js, fix retry amplification`
  - Files: `js/sync-queue.js`
  - Pre-commit: `node tests/node-test.js`

---

- [ ] 7. Create sync-merge.js — Extract Merge Logic

  **What to do**:
  - Create `js/sync-merge.js` as IIFE module exposing `SyncMerge` global
  - Move: `_fetchRemoteData()`, `_mergeAndSave()`, `_showSyncResult()`, `fetchAndMergeData()`, `_getRemoteDates()`, `queueLocalEntriesForSync()`, `_isValidEntryForSync()`, `_queueEntryForSync()`, `_processEntriesForQueue()`, `_showQueueNotifications()`
  - Move: `mergeEntries()` function
  - Fix: `_mergeAndSave` cache invalidation (add `Storage.entriesCache = null` after write)
  - Optimize: Combine `_fetchRemoteData()` + `_getRemoteDates()` into single fetch during sign-in
  - Keep backward compat via re-export

  **Must NOT do**:
  - Change merge conflict resolution logic (newest timestamp wins)
  - Change entry format
  - Touch sync.js until Task 9

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 8 — separate files)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1-4

  **References**:
  - `js/sync.js:326-338` — _fetchRemoteData
  - `js/sync.js:344-369` — _mergeAndSave (with cache bypass bug)
  - `js/sync.js:376-391` — _showSyncResult
  - `js/sync.js:397-415` — fetchAndMergeData
  - `js/sync.js:421-435` — _getRemoteDates
  - `js/sync.js:516-562` — queueLocalEntriesForSync
  - `js/sync.js:1235-1281` — mergeEntries

  **Acceptance Criteria**:
  - [ ] sync-merge.js ≤400 lines
  - [ ] Merge produces identical results
  - [ ] Cache invalidation fixed
  - [ ] Single fetch during sign-in (not two)
  - [ ] `node tests/node-test.js` passes

  **QA Scenarios**:

  ```
  Scenario: Merge produces correct results
    Tool: Bash (Node.js test environment)
    Steps:
      1. Set up local entries with known timestamps
      2. Set up remote entries with conflicting timestamps
      3. Call SyncMerge.mergeEntries(remoteEntries)
      4. Assert: newest timestamp wins for each conflict
    Expected Result: Merge matches expected conflict resolution
    Evidence: .sisyphus/evidence/task-7-merge-results.txt

  Scenario: Single fetch during sign-in
    Tool: Bash (Node.js test environment)
    Steps:
      1. Mock fetchWeightEntries to count calls
      2. Simulate sign-in flow (fetchAndMergeData + queueLocalEntriesForSync)
      3. Assert: fetchWeightEntries called once, not twice
    Expected Result: Single remote fetch, dates cached for second use
    Evidence: .sisyphus/evidence/task-7-single-fetch.txt
  ```

  **Commit**: YES
  - Message: `refactor(sync): extract merge logic to sync-merge.js, fix cache bypass and double fetch`
  - Files: `js/sync-merge.js`
  - Pre-commit: `node tests/node-test.js`

---

- [ ] 8. Create sync-core.js — Main API Coordinator

  **What to do**:
  - Create `js/sync-core.js` as IIFE module exposing `Sync` global (same as current)
  - Wire together: SyncErrors, SyncQueue, SyncMerge modules
  - Keep public API methods: `init()`, `syncAll()`, `saveWeightEntry()`, `updateWeightEntry()`, `deleteWeightEntry()`, `fetchWeightEntries()`, `mergeEntries()`, `fetchAndMergeData()`, `queueLocalEntriesForSync()`, `getStatus()`, `getQueue()`, `getLastSyncTime()`, `getErrorHistory()`, `clearErrorHistory()`, `clearQueue()`, `removeStuckOperations()`, `filterInvalidOperations()`
  - Each method delegates to appropriate sub-module
  - Remove Proxy wrapper for _SyncDebug — use direct reference since load order is now guaranteed

  **Must NOT do**:
  - Change any public API signatures
  - Add new public methods
  - Remove any existing public methods

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6, 7 — separate files)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1-4

  **References**:
  - `js/sync.js:49-140` — Sync IIFE, init, private state
  - `js/sync.js:1424-1460` — Public API return statement
  - `js/sync-errors.js` (Task 5 output) — SyncErrors module
  - `js/sync-queue.js` (Task 6 output) — SyncQueue module
  - `js/sync-merge.js` (Task 7 output) — SyncMerge module

  **Acceptance Criteria**:
  - [ ] sync-core.js ≤300 lines
  - [ ] All Sync.* methods work identically
  - [ ] No Proxy indirection for debug calls
  - [ ] `node tests/node-test.js` passes

  **QA Scenarios**:

  ```
  Scenario: Sync API works identically after split
    Tool: Bash (Node.js test environment)
    Steps:
      1. Load all sync modules in correct order
      2. Call each Sync.* method
      3. Assert: return shapes match original behavior
      4. Run sync tests from tests/sync.test.js
    Expected Result: All sync tests pass
    Evidence: .sisyphus/evidence/task-8-sync-api.txt
  ```

  **Commit**: YES
  - Message: `refactor(sync): create sync-core.js coordinator wiring all sub-modules`
  - Files: `js/sync-core.js`
  - Pre-commit: `node tests/node-test.js`

---

- [ ] 9. Wire New Modules, Delete Old sync.js, Update index.html

  **What to do**:
  - Update `index.html` script order: add sync-errors.js, sync-queue.js, sync-merge.js, sync-core.js before app.js
  - Remove old sync.js script tag
  - Delete old sync.js file
  - Update sync-debug.js to reference new module names if needed
  - Verify no broken references

  **Must NOT do**:
  - Modify any logic in the new modules
  - Change script load order of non-sync files

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 5-8)
  - **Sequential**: After Wave 2 parallel tasks complete
  - **Blocks**: Wave 3 (deduplication)
  - **Blocked By**: Tasks 5, 6, 7, 8

  **References**:
  - `index.html:383` — Current sync.js script tag
  - `js/sync-debug.js` — May need reference updates
  - Script load order: sync-errors → sync-queue → sync-merge → sync-core → app

  **Acceptance Criteria**:
  - [ ] index.html has 4 new sync script tags in correct order
  - [ ] Old sync.js script tag removed
  - [ ] Old sync.js file deleted
  - [ ] `node tests/node-test.js` passes
  - [ ] App loads without errors in browser

  **QA Scenarios**:

  ```
  Scenario: App loads with new sync modules
    Tool: Bash
    Steps:
      1. Run: node tests/node-test.js
      2. Assert: exit code 0
      3. Assert: test count >= baseline (from Task 0)
    Expected Result: All tests pass, no broken references
    Evidence: .sisyphus/evidence/task-9-wire-modules.txt
  ```

  **Commit**: YES
  - Message: `refactor(sync): wire new modules, delete old sync.js, update index.html`
  - Files: `index.html`, `js/sync.js` (deleted), `js/sync-*.js` (added)
  - Pre-commit: `node tests/node-test.js`

---

- [x] 10. Deduplicate round() — 4 Copies → 1

  **What to do**:
  - Canonical implementation is in `js/utils.js` — verify it's correct
  - Remove inline fallbacks from: calculator.js, calculator-ewma.js, calculator-tdee.js
  - All modules call `Utils.round()` directly (utils.js loads first in script order)
  - Verify floating-point precision tests still pass

  **Must NOT do**:
  - Change the rounding algorithm
  - Break Node.js compatibility (Utils.round must work in Node.js too)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 11, 12, 13 — different functions)
  - **Parallel Group**: Wave 3
  - **Blocked By**: Task 9

  **References**:
  - `js/utils.js:361-365` — Canonical round() implementation
  - `js/calculator.js:329-338` — Delegate + inline fallback
  - `js/calculator-ewma.js:22-27` — Inline fallback in getRoundFn()
  - `js/calculator-tdee.js:52-57` — Inline fallback in getRoundFn()

  **Acceptance Criteria**:
  - [ ] Only Utils.round() exists
  - [ ] All callers use Utils.round()
  - [ ] Floating-point tests pass (0.1 + 0.2 = 0.3)

  **QA Scenarios**:

  ```
  Scenario: round produces correct results after dedup
    Tool: Bash (Node.js test environment)
    Steps:
      1. Run calculator tests that verify floating-point precision
      2. Assert: all round-related tests pass
    Expected Result: Identical rounding behavior
    Evidence: .sisyphus/evidence/task-10-round-dedup.txt
  ```

  **Commit**: YES
  - Message: `refactor(calc): deduplicate round() — 4 copies to single Utils.round()`
  - Files: `js/calculator.js`, `js/calculator-ewma.js`, `js/calculator-tdee.js`
  - Pre-commit: `node tests/node-test.js`

---

- [x] 11. Deduplicate Linear Regression — 3 Copies → 1

  **What to do**:
  - Extract single `performLinearRegression()` function to `js/utils.js` (alongside round)
  - Replace 3 identical implementations in calculator-tdee.js (lines 622, 868, 1166)
  - Function signature: `function linearRegression(points) { return { slope, intercept }; }`
  - Update all 3 call sites to use `Utils.linearRegression()`

  **Must NOT do**:
  - Change the regression algorithm
  - Break existing TDEE calculations

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 12, 13)
  - **Parallel Group**: Wave 3
  - **Blocked By**: Task 9

  **References**:
  - `js/calculator-tdee.js:622-644` — performLinearRegression
  - `js/calculator-tdee.js:868-892` — calculateLinearRegression
  - `js/calculator-tdee.js:1166-1192` — calculateSlope

  **Acceptance Criteria**:
  - [ ] Single linearRegression() in utils.js
  - [ ] 3 call sites updated
  - [ ] TDEE calculations produce identical results

  **QA Scenarios**:

  ```
  Scenario: Linear regression produces identical results after dedup
    Tool: Bash (Node.js test environment)
    Steps:
      1. Run TDEE calculation tests
      2. Assert: all regression-related tests pass with same values
    Expected Result: Identical TDEE calculations
    Evidence: .sisyphus/evidence/task-11-regression-dedup.txt
  ```

  **Commit**: YES
  - Message: `refactor(calc): deduplicate linear regression — 3 copies to single Utils.linearRegression()`
  - Files: `js/calculator-tdee.js`, `js/utils.js`
  - Pre-commit: `node tests/node-test.js`

---

- [x] 12. Deduplicate calculateStats() — 4 Copies → 1

  **What to do**:
  - Canonical implementation in `js/utils.js:372-397`
  - Remove inline fallbacks from calculator.js, calculator-ewma.js, calculator-tdee.js
  - All modules call `Utils.calculateStats()` directly

  **Must NOT do**:
  - Change stats calculation algorithm

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 11, 13)
  - **Parallel Group**: Wave 3
  - **Blocked By**: Task 9

  **References**:
  - `js/utils.js:372-397` — Canonical calculateStats
  - `js/calculator.js:357-392` — Delegate + inline fallback
  - `js/calculator-ewma.js:32-52` — Inline fallback
  - `js/calculator-tdee.js:60-84` — Inline fallback

  **Acceptance Criteria**:
  - [ ] Only Utils.calculateStats() exists
  - [ ] All callers updated
  - [ ] Stats tests pass

  **QA Scenarios**:

  ```
  Scenario: calculateStats produces identical results after dedup
    Tool: Bash (Node.js test environment)
    Steps:
      1. Run tests that exercise calculateStats
      2. Assert: all stats tests pass with same values
    Expected Result: Identical stats calculations
    Evidence: .sisyphus/evidence/task-12-stats-dedup.txt
  ```

  **Commit**: YES
  - Message: `refactor(calc): deduplicate calculateStats() — 4 copies to single Utils.calculateStats()`
  - Files: `js/calculator.js`, `js/calculator-ewma.js`, `js/calculator-tdee.js`
  - Pre-commit: `node tests/node-test.js`

---

- [x] 13. Deduplicate calculateEWMAWeightDelta() — 3 Copies → 1

  **What to do**:
  - Extract single function to `js/utils.js`
  - Remove 3 identical implementations from calculator-ewma.js, calculator-tdee.js, calculator.js
  - All modules call `Utils.calculateEWMAWeightDelta()` directly

  **Must NOT do**:
  - Change the weight delta algorithm

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 10, 11, 12)
  - **Parallel Group**: Wave 3
  - **Blocked By**: Task 9

  **References**:
  - `js/calculator-ewma.js:119-129` — calculateEWMAWeightDelta
  - `js/calculator-tdee.js:276-286` — calculateEWMAWeightDelta
  - `js/calculator.js:420-430` — Inline fallback

  **Acceptance Criteria**:
  - [ ] Single Utils.calculateEWMAWeightDelta()
  - [ ] 3 call sites updated
  - [ ] EWMA tests pass

  **QA Scenarios**:

  ```
  Scenario: calculateEWMAWeightDelta produces identical results after dedup
    Tool: Bash (Node.js test environment)
    Steps:
      1. Run EWMA calculation tests
      2. Assert: all weight delta tests pass with same values
    Expected Result: Identical EWMA calculations
    Evidence: .sisyphus/evidence/task-13-ewma-delta-dedup.txt
  ```

  **Commit**: YES
  - Message: `refactor(calc): deduplicate calculateEWMAWeightDelta() — 3 copies to single Utils.calculateEWMAWeightDelta()`
  - Files: `js/calculator.js`, `js/calculator-ewma.js`, `js/calculator-tdee.js`
  - Pre-commit: `node tests/node-test.js`

---

- [x] 14. Remove Dead Debug Code

  **What to do**:
  - Delete `js/sync.js:1452-1578` (~130 lines of dead duplicate debug code that mirrors sync-debug.js)
  - Remove Proxy wrapper at `js/sync.js:24-47` — replace with direct reference since load order is guaranteed
  - Remove inline toast fallback at `js/sync.js:594-634` (components.js always loads first)
  - Remove empty if block at `js/app.js:11-13`
  - Remove dead sync placeholder at `sw.js:122-132`
  - Remove unused constants: `dailyEntry.js:12` (TOAST_AUTO_HIDE_DELAY), `calculator.js:59` (LB_TO_KG_CONVERSION)
  - Remove dead exports: `version.js:215-229` (showUpdateIndicator/hideUpdateIndicator)

  **Must NOT do**:
  - Remove sync-debug.js (still used for dev debugging)
  - Change any working debug functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 15-19 — independent files)
  - **Parallel Group**: Wave 4
  - **Blocked By**: Task 9 (sync.js must exist in split form first)

  **References**:
  - `js/sync.js:1452-1578` — Dead duplicate debug code
  - `js/sync.js:24-47` — Proxy wrapper
  - `js/sync.js:594-634` — Dead toast fallback
  - `js/app.js:11-13` — Empty if block
  - `sw.js:122-132` — Dead sync placeholder
  - `js/ui/dailyEntry.js:12` — Unused constant
  - `js/calculator.js:59` — Unused constant
  - `js/version.js:215-229` — Dead exports

  **Acceptance Criteria**:
  - [ ] ~250+ lines of dead code removed
  - [ ] SyncDebug.* still works
  - [ ] No broken references
  - [ ] `node tests/node-test.js` passes

  **QA Scenarios**:

  ```
  Scenario: Debug utilities still work after dead code removal
    Tool: Bash (Node.js test environment)
    Steps:
      1. Load sync modules
      2. Call SyncDebug.status(), SyncDebug.queue(), SyncDebug.help()
      3. Assert: no errors, expected output
    Expected Result: Debug utilities functional
    Evidence: .sisyphus/evidence/task-14-debug-still-works.txt
  ```

  **Commit**: YES
  - Message: `chore: remove ~250 lines of dead code across sync, app, sw, and calculator modules`
  - Files: `js/sync.js`, `js/app.js`, `sw.js`, `js/ui/dailyEntry.js`, `js/calculator.js`, `js/version.js`
  - Pre-commit: `node tests/node-test.js`

---

- [x] 15. Fix CSS Duplicate @keyframes

  **What to do**:
  - Consolidate duplicate `@keyframes` definitions in `css/styles.css`:
    - fadeIn: 3 definitions (lines 687-690, 916-924, 1374-1382) → keep most feature-complete
    - slideDown: 2 definitions (lines 1084, 1659) → keep most feature-complete
    - spin: 3 definitions (lines 683, 1475, 1886) → keep most feature-complete
    - pulse: 2 definitions → keep most feature-complete
  - Place single definitions near top of file in a dedicated `/* Animations */` section
  - Remove all duplicates

  **Must NOT do**:
  - Change animation behavior
  - Modify any non-keyframe CSS

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 14, 16-19 — independent file)
  - **Parallel Group**: Wave 4
  - **Blocked By**: None (can run in parallel with Wave 2-3)

  **References**:
  - `css/styles.css:683-690, 916-924, 1084, 1374-1382, 1475-1483, 1659, 1886-1895` — Duplicate keyframes

  **Acceptance Criteria**:
  - [ ] Each @keyframes defined exactly once
  - [ ] CSS parses without errors
  - [ ] Animations work identically

  **QA Scenarios**:

  ```
  Scenario: No duplicate @keyframes in CSS
    Tool: Bash
    Steps:
      1. Grep for "@keyframes fadeIn" in css/styles.css
      2. Assert: exactly 1 match
      3. Repeat for slideDown, spin, pulse
    Expected Result: Each keyframe defined once
    Evidence: .sisyphus/evidence/task-15-no-duplicate-keyframes.txt
  ```

  **Commit**: YES
  - Message: `fix(css): consolidate duplicate @keyframes definitions (fadeIn×3, slideDown×2, spin×3, pulse×2)`
  - Files: `css/styles.css`
  - Pre-commit: `npx eslint css/` (if configured) or CSS lint

---

- [x] 16. Fix .btn-ghost Conflict

  **What to do**:
  - `css/styles.css:745-753` defines `.btn-ghost` with error-themed styles
  - `css/styles.css:1801-1810` redefines `.btn-ghost` with transparent/default styles
  - Second definition overrides first, making error ghost button invisible
  - **RESOLUTION**: Keep the generic transparent style at line 1801 as the base `.btn-ghost`, rename the error-themed variant to `.btn-ghost-error` at line 745
  - Update any HTML references if needed

  **Must NOT do**:
  - Change other button styles
  - Break existing button functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 14, 15, 17-19 — independent file)
  - **Parallel Group**: Wave 4
  - **Blocked By**: None

  **References**:
  - `css/styles.css:745-753` — Error-themed .btn-ghost
  - `css/styles.css:1801-1810` — Generic .btn-ghost (overrides above)
  - `index.html` — Check for .btn-ghost usage

  **Acceptance Criteria**:
  - [ ] `.btn-ghost` has single transparent definition
  - [ ] `.btn-ghost-error` has error-themed definition
  - [ ] No visual regression on other buttons

  **QA Scenarios**:

  ```
  Scenario: .btn-ghost renders correctly after fix
    Tool: Bash
    Steps:
      1. Grep for ".btn-ghost" in css/styles.css
      2. Assert: exactly 2 definitions (base + error variant)
      3. Assert: no conflicting styles
    Expected Result: Clean button definitions
    Evidence: .sisyphus/evidence/task-16-btn-ghost.txt
  ```

  **Commit**: YES
  - Message: `fix(css): resolve .btn-ghost conflict — rename error variant to .btn-ghost-error`
  - Files: `css/styles.css`
  - Pre-commit: CSS validation

---

- [ ] 17. Fix sw.js skipWaiting()

  **What to do**:
  - Remove unconditional `self.skipWaiting()` from install event (sw.js:47)
  - Keep the `SKIP_WAITING` message handler (lines 71-76) which is triggered by the app's update notification
  - Update comment at line 78 to accurately reflect cache-first strategy (not "network-first for dynamic")
  - Add `/icons/icon-32.png` to STATIC_ASSETS (referenced in HTML but not precached)

  **Must NOT do**:
  - Change cache-first strategy
  - Remove the message handler
  - Change cache versioning logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 14-16, 18, 19 — independent file)
  - **Parallel Group**: Wave 4
  - **Blocked By**: None

  **References**:
  - `sw.js:47` — Unconditional skipWaiting
  - `sw.js:71-76` — SKIP_WAITING message handler (keep this)
  - `sw.js:78` — Misleading comment
  - `sw.js:9-35` — STATIC_ASSETS list
  - `index.html:22` — icon-32.png reference

  **Acceptance Criteria**:
  - [ ] skipWaiting only triggered by SKIP_WAITING message
  - [ ] Comment accurately describes strategy
  - [ ] icon-32.png in STATIC_ASSETS

  **QA Scenarios**:

  ```
  Scenario: Service worker installs without skipWaiting
    Tool: Bash
    Steps:
      1. Grep for "skipWaiting" in sw.js
      2. Assert: only in message handler, not in install event
      3. Assert: icon-32.png in STATIC_ASSETS
    Expected Result: skipWaiting controlled by app, icon precached
    Evidence: .sisyphus/evidence/task-17-sw-fix.txt
  ```

  **Commit**: YES
  - Message: `fix(sw): remove unconditional skipWaiting, add icon-32.png to precache`
  - Files: `sw.js`
  - Pre-commit: None (no test runner for SW)

---

- [x] 18. Clean JSDoc Bloat

  **What to do**:
  - Strip redundant `@description` tags (used 3× per block in some files)
  - Remove novel-length docblocks for trivial functions (e.g., 16-line doc for 15-line clearData())
  - Keep: `@param`, `@returns`, `@throws` for non-obvious functions
  - Remove: `@example` for internal functions nobody calls externally
  - Target files: dashboard.js, settings.js, weeklyView.js, dailyEntry.js
  - Keep complex algorithm documentation (calculator.js, sync.js core logic)

  **Must NOT do**:
  - Remove all comments
  - Remove documentation for complex logic
  - Change any code

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 14-17, 19 — independent concern)
  - **Parallel Group**: Wave 4
  - **Blocked By**: Task 9 (sync.js must be split first)

  **References**:
  - `js/ui/dashboard.js:268-284` — 17-line JSDoc for 50-line function
  - `js/ui/settings.js:159-176, 196-210, 254-271` — Over-documented functions
  - `js/ui/weeklyView.js:11-24, 31-44` — 13-line doc for 4-line function

  **Acceptance Criteria**:
  - [ ] No function has more than 5 lines of JSDoc for trivial operations
  - [ ] Complex algorithms still documented
  - [ ] `npx eslint js/` passes

  **QA Scenarios**:

  ```
  Scenario: JSDoc bloat removed
    Tool: Bash
    Steps:
      1. Grep for "@description" in js/ui/*.js
      2. Assert: count reduced significantly
      3. Run ESLint to verify no syntax errors
    Expected Result: Cleaner JSDoc, no ESLint errors
    Evidence: .sisyphus/evidence/task-18-jsdoc-cleanup.txt
  ```

  **Commit**: YES
  - Message: `chore(docs): clean JSDoc bloat — remove redundant @description, shorten trivial docblocks`
  - Files: `js/ui/dashboard.js`, `js/ui/settings.js`, `js/ui/weeklyView.js`, `js/ui/dailyEntry.js`
  - Pre-commit: `npx eslint js/`

---

- [x] 19. Reduce Dashboard TDEE Calculations

  **What to do**:
  - `Dashboard.refresh()` currently triggers 5+ separate TDEE calculations
  - Cache the processed entries result and reuse across calculations
  - Single call to `Calculator.processEntriesWithGaps()` → pass processed data to each sub-calculation
  - Eliminate redundant `Storage.getAllEntries()` calls within the refresh chain
  - Target: 1-2 TDEE calculations per refresh instead of 5+

  **Must NOT do**:
  - Change TDEE calculation algorithms
  - Break the display of any dashboard metrics
  - Introduce new caching infrastructure (simple variable cache, not a new module)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 14-18 — different files)
  - **Parallel Group**: Wave 4
  - **Blocked By**: Task 9

  **References**:
  - `js/ui/dashboard.js` — refresh() and _fetchDashboardData()
  - `js/calculator.js` — processEntriesWithGaps(), calculateStableTDEE(), calculateFastTDEE()
  - `js/storage.js` — getAllEntries()

  **Acceptance Criteria**:
  - [ ] Dashboard renders with same data
  - [ ] TDEE calculations reduced from 5+ to 1-2 per refresh
  - [ ] `node tests/node-test.js` passes

  **QA Scenarios**:

  ```
  Scenario: Dashboard renders correctly with optimized calculations
    Tool: Bash (Node.js test environment)
    Steps:
      1. Set up test entries
      2. Call Dashboard.refresh()
      3. Assert: all dashboard fields populated with expected values
      4. Compare output with pre-refactor baseline
    Expected Result: Identical dashboard output, fewer calculations
    Evidence: .sisyphus/evidence/task-19-dashboard-optimized.txt
  ```

  **Commit**: YES
  - Message: `perf(dashboard): reduce TDEE calculations from 5+ to 1-2 per refresh`
  - Files: `js/ui/dashboard.js`
  - Pre-commit: `node tests/node-test.js`

---

- [x] 20. Final Verification — Test Suite + ESLint

  **What to do**:
  - Run `node tests/node-test.js` — all tests must pass
  - Run `npx eslint js/` — 0 errors
  - Compare test count with baseline from Task 0
  - Document any new tests added during refactoring

  **Must NOT do**:
  - Delete or weaken any tests
  - Skip failing tests

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (must complete before Task 22)
  - **Sequential**: After all implementation tasks complete
  - **Blocks**: Task 22
  - **Blocked By**: All Wave 1-4 tasks

  **References**:
  - `tests/node-test.js` — Test runner
  - Baseline test count from Task 0

  **Acceptance Criteria**:
  - [ ] `node tests/node-test.js` exits with code 0
  - [ ] Test count >= baseline
  - [ ] `npx eslint js/` exits with code 0

  **QA Scenarios**:

  ```
  Scenario: Full test suite passes
    Tool: Bash
    Steps:
      1. Run: node tests/node-test.js
      2. Assert: exit code 0
      3. Assert: test count >= baseline
      4. Run: npx eslint js/
      5. Assert: exit code 0
    Expected Result: All tests pass, ESLint clean
    Evidence: .sisyphus/evidence/task-20-final-verification.txt
  ```

  **Commit**: YES
  - Message: `chore: final verification — all tests passing, ESLint clean`
  - Pre-commit: `node tests/node-test.js && npx eslint js/`

---

- [x] 21. Playwright Smoke Test

  **What to do**:
  - Serve the app locally
  - Use Playwright to:
    1. Open app, verify dashboard loads
    2. Fill in weight entry form, submit
    3. Verify entry appears in weekly view
    4. Open settings, change theme
    5. Verify theme applied
    6. Take screenshots at each step

  **Must NOT do**:
  - Test Supabase sync (requires credentials)
  - Modify any app code

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 20 — independent verification)
  - **Parallel Group**: Wave 5
  - **Blocked By**: All Wave 1-4 tasks

  **References**:
  - `index.html` — App entry point
  - Playwright skill for browser automation

  **Acceptance Criteria**:
  - [ ] App loads without errors
  - [ ] Entry form works
  - [ ] Theme switching works
  - [ ] Screenshots captured

  **QA Scenarios**:

  ```
  Scenario: Full app smoke test
    Tool: Playwright
    Steps:
      1. Navigate to index.html
      2. Assert: dashboard visible, no errors
      3. Fill weight input with "80.5"
      4. Click save button
      5. Assert: success toast appears
      6. Assert: weekly view shows new entry
      7. Open settings, switch theme
      8. Assert: theme applied
      9. Screenshot each step
    Expected Result: All interactions work, screenshots captured
    Evidence: .sisyphus/evidence/task-21-smoke-test/
  ```

  **Commit**: NO (evidence capture only)

---

- [x] 22. Cache Version Bump

  **What to do**:
  - Increment `CACHE_VERSION` in `sw.js` (line 7)
  - Increment `APP_VERSION` in `js/version.js` (line 10)
  - Use semver patch bump (e.g., 1.0.4 → 1.0.5)

  **Must NOT do**:
  - Change any other version references
  - Forget either file (both must match)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (must be last)
  - **Sequential**: After Task 20 passes
  - **Blocked By**: Task 20

  **References**:
  - `sw.js:7` — CACHE_VERSION
  - `js/version.js:10` — APP_VERSION
  - AGENTS.md Section 5 — Cache versioning process

  **Acceptance Criteria**:
  - [ ] CACHE_VERSION incremented
  - [ ] APP_VERSION incremented
  - [ ] Both match

  **QA Scenarios**:

  ```
  Scenario: Versions match
    Tool: Bash
    Steps:
      1. Grep CACHE_VERSION in sw.js
      2. Grep APP_VERSION in js/version.js
      3. Assert: both show same version number
    Expected Result: Matching incremented versions
    Evidence: .sisyphus/evidence/task-22-version-bump.txt
  ```

  **Commit**: YES
  - Message: `chore(version): bump cache version to 1.0.5 for deployment`
  - Files: `sw.js`, `js/version.js`
  - Pre-commit: `node tests/node-test.js`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npx eslint js/` + `node tests/node-test.js`. Review all changed files for: dead code remaining, unused imports, inconsistent patterns. Check AI slop: excessive comments, over-abstraction, generic names. Verify sync.js split produced modules ≤400 lines each. Verify deduplication actually reduced copies.
  Output: `ESLint [PASS/FAIL] | Tests [N pass/N fail] | Modules [N under 400 lines] | Dedup [N eliminated] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (sync split + dedup working together). Test edge cases: save entry, sync, theme change, offline mode. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 0**: `chore(tests): establish green baseline before refactoring`
- **Wave 1** (4 commits):
  - `fix(sync): getStatus() returns booleans not promises for hasSession`
  - `fix(errors): define 8 missing error codes referenced across codebase`
  - `fix(sync): _mergeAndSave invalidates Storage cache after direct write`
  - `fix(sync): remove broken isNewEntry check, simplify saveWeightEntry`
- **Wave 2** (5 commits):
  - `refactor(sync): extract error handling to sync-errors.js module`
  - `refactor(sync): extract queue management to sync-queue.js, fix retry amplification`
  - `refactor(sync): extract merge logic to sync-merge.js, fix cache bypass and double fetch`
  - `refactor(sync): create sync-core.js coordinator wiring all sub-modules`
  - `refactor(sync): wire new modules, delete old sync.js, update index.html`
- **Wave 3** (4 commits):
  - `refactor(calc): deduplicate round() — 4 copies to single Utils.round()`
  - `refactor(calc): deduplicate linear regression — 3 copies to single Utils.linearRegression()`
  - `refactor(calc): deduplicate calculateStats() — 4 copies to single Utils.calculateStats()`
  - `refactor(calc): deduplicate calculateEWMAWeightDelta() — 3 copies to single Utils.calculateEWMAWeightDelta()`
- **Wave 4** (6 commits):
  - `chore: remove ~250 lines of dead code across sync, app, sw, and calculator modules`
  - `fix(css): consolidate duplicate @keyframes definitions`
  - `fix(css): resolve .btn-ghost conflict — rename error variant to .btn-ghost-error`
  - `fix(sw): remove unconditional skipWaiting, add icon-32.png to precache`
  - `chore(docs): clean JSDoc bloat`
  - `perf(dashboard): reduce TDEE calculations from 5+ to 1-2 per refresh`
- **Wave 5** (2 commits):
  - `chore: final verification — all tests passing, ESLint clean`
  - `chore(version): bump cache version for deployment`

---

## Success Criteria

### Verification Commands
```bash
node tests/node-test.js        # Expected: 155+ tests, 0 failures
npx eslint js/                  # Expected: 0 errors, 0 warnings
wc -l js/sync-*.js              # Expected: each file ≤400 lines
grep -c "function linearRegression" js/*.js  # Expected: 1
grep -c "function round" js/*.js             # Expected: 1 (in utils.js)
grep -c "@keyframes fadeIn" css/styles.css   # Expected: 1
```

### Final Checklist
- [ ] All "Must Have" present (global API preserved, IIFE pattern, zero deps, test parity)
- [ ] All "Must NOT Have" absent (no behavioral changes, no new features, no premature abstraction)
- [ ] All tests pass (155+)
- [ ] ESLint clean (0 errors)
- [ ] sync.js split into 4 modules, each ≤400 lines
- [ ] 4 deduplication targets consolidated
- [ ] 5 critical bugs fixed
- [ ] ~500+ lines of dead code removed
- [ ] CSS duplicates resolved
- [ ] sw.js skipWaiting fixed
- [ ] Cache version bumped
