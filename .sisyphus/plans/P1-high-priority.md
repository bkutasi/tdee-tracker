# P1 High Priority — Sprint Plan

**Priority**: HIGH (Fix this sprint)  
**Estimated Time**: 3-4 hours  
**Risk Level**: MEDIUM (Crashes, data inconsistency, timezone bugs)  
**Dependencies**: P0-critical-blockers must be completed first  

---

## Executive Summary

**10 high-priority issues** affecting stability, data integrity, and user experience:

1. Unprotected render functions → UI crashes
2. Silent sync errors → data inconsistency
3. Incomplete SW cache → offline mode broken
4. parseDate() timezone bug → wrong dates
5. No quota validation → import corruption risk
6. No schema versioning → future breaking changes
7. Contradictory tests → test suite reliability
8. Fix #3 not implemented → auth race remains
9. Fix #5 not verified → import sync untested
10. Disabled test → coverage gap

**After these fixes**: ✅ PRODUCTION-READY with confidence

---

## Prerequisites

```bash
# Complete P0 fixes first
git checkout master
git pull origin master

# Create feature branch
git checkout -b fix/p1-high-priority

# Verify P0 fixes are present
node tests/node-test.js
# Expected: 131 tests passing
```

---

## ~~Fix P1-1: Render Functions Unprotected (30 minutes)~~ ✅ COMPLETE

**Problem**: No try-catch around DOM operations → single null reference crashes entire UI

### Affected Files

| File | Function | Risk |
|------|----------|------|
| `js/ui/dashboard.js` | `render()` | Stats cards fail |
| `js/ui/weeklyView.js` | `render()` | Table fails |
| `js/ui/chart.js` | `render()` | Chart fails |

### Implementation Pattern

Wrap all render functions with error boundaries:

```javascript
// OLD - Unprotected
function render() {
    const container = document.getElementById('dashboard-stats');
    container.innerHTML = generateStatsHTML();
}

// NEW - Protected with error boundary
function render() {
    try {
        const container = document.getElementById('dashboard-stats');
        if (!container) {
            console.warn('Dashboard container not found');
            return;
        }
        container.innerHTML = generateStatsHTML();
    } catch (error) {
        console.error('Dashboard.render:', error);
        // Show user-friendly error
        showError('Failed to load dashboard stats. Please refresh.');
    }
}
```

### Create shared error handler

Add to `js/ui/components.js`:

```javascript
/**
 * Show user-friendly error message
 * @param {string} message - Message to display
 */
function showError(message) {
    'use strict';
    const errorContainer = document.getElementById('error-message');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
}
```

### Apply to all render functions

Edit each render function in:
- `js/ui/dashboard.js`
- `js/ui/weeklyView.js`
- `js/ui/chart.js`
- `js/ui/dailyEntry.js`
- `js/ui/settings.js`

### Verification

```bash
# Manual test:
# 1. Open index.html
# 2. Delete a DOM element DevTools
# 3. Trigger render
# 4. Should see error message, not crash
# 5. Rest of UI should still work
```

### Git Commit

```bash
git add js/ui/*.js
git commit -m "fix(p1): add error boundaries to render functions

- Wrap all render() functions with try-catch
- Show user-friendly error messages on failure
- Prevent single null reference from crashing entire UI
- Graceful degradation when elements missing"
```

---

## Fix P1-2: Silent Sync Error Swallowing (15 minutes)

**Problem**: Sync errors not shown to user → data inconsistency between local and cloud

### Location

`js/settings.js:361` - Import function

### Implementation

Edit `js/ui/settings.js`, find import handler:

```javascript
// OLD - Silent failure
try {
    await Storage.importData(fileData);
    showMessage('Import successful');
} catch (error) {
    console.error('Import failed:', error);
    // User never knows it failed!
}

// NEW - Show error to user
try {
    await Storage.importData(fileData);
    showMessage('Import successful');
    
    // Trigger sync if authenticated
    if (Auth.isAuthenticated()) {
        await Sync.syncAll();
        showMessage('Data synced to cloud');
    }
} catch (error) {
    console.error('Import failed:', error);
    showError(`Import failed: ${error.message}. Please try again.`);
}
```

### Add sync status indicator

Edit `js/ui/settings.js`:

```javascript
// Show sync in progress
function showSyncProgress(message) {
    const statusEl = document.getElementById('sync-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = 'sync-status syncing';
    }
}

// Show sync complete
function showSyncComplete(success) {
    const statusEl = document.getElementById('sync-status');
    if (statusEl) {
        statusEl.textContent = success ? 'Synced' : 'Sync failed';
        statusEl.className = success ? 'sync-status success' : 'sync-status error';
    }
}
```

### Verification

```bash
# Manual test:
# 1. Disconnect internet
# 2. Try to import data
# 3. Should see error message
# 4. Should NOT show "Import successful"
```

### Git Commit

```bash
git add js/ui/settings.js
git commit -m "fix(p1): show sync errors to users

- Display user-friendly error messages on sync failure
- Trigger sync after import if authenticated
- Add sync status indicator (syncing/success/error)
- Prevents silent data inconsistency"
```

---

## ~~Fix P1-3: Incomplete Service Worker Cache (10 minutes)~~ ✅ COMPLETE

**Problem**: 8 critical JS files not cached → offline mode broken

### Location

`sw.js:9-24` - STATIC_ASSETS array

### Implementation

Edit `sw.js`, update `STATIC_ASSETS`:

```javascript
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/manifest.json',
    // Add missing JS files
    '/js/app.js',
    '/js/utils.js',
    '/js/calculator.js',
    '/js/calculator-ewma.js',
    '/js/calculator-tdee.js',
    '/js/storage.js',
    '/js/sync.js',
    '/js/auth.js',
    '/js/version.js',
    // UI components
    '/js/ui/components.js',
    '/js/ui/focusTrap.js',
    '/js/ui/dashboard.js',
    '/js/ui/chart.js',
    '/js/ui/dailyEntry.js',
    '/js/ui/weeklyView.js',
    '/js/ui/settings.js',
    // Icons
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];
```

### Verify all files exist

```bash
# Check each file exists
for file in js/app.js js/utils.js js/calculator.js js/sync.js js/auth.js; do
    [ -f "$file" ] && echo "✓ $file" || echo "✗ $file MISSING"
done
```

### Update cache version

Increment version in `sw.js` and `js/version.js`:

```javascript
// sw.js line 6
const CACHE_VERSION = '1.0.2';  // Increment from 1.0.1

// js/version.js line 10
const APP_VERSION = '1.0.2';  // Increment from 1.0.1
```

### Verification

```bash
# Manual test:
# 1. Open index.html
# 2. Open DevTools → Application → Service Workers
# 3. Click "Update" on service worker
# 4. Go offline (DevTools → Network → Offline)
# 5. Refresh page
# 6. Should work offline completely
```

### Git Commit

```bash
git add sw.js js/version.js
git commit -m "fix(p1): complete service worker cache

- Add all 15 JS files to STATIC_ASSETS
- Add UI components and icons
- Increment CACHE_VERSION to 1.0.2
- Enables full offline mode support"
```

---

## ~~Fix P1-4: parseDate() Timezone Bug (15 minutes)~~ ✅ COMPLETE

**Problem**: Date shifts across timezones (e.g., 2026-03-30 → 2026-03-29)

### Location

`js/utils.js` - `parseDate()` function

### Implementation

Edit `js/utils.js`, find `parseDate()`:

```javascript
// OLD - Timezone vulnerable
function parseDate(dateString) {
    'use strict';
    return new Date(dateString);  // Interprets as UTC, shifts in local TZ
}

// NEW - Timezone-aware
function parseDate(dateString) {
    'use strict';
    if (!dateString) return null;
    
    // Force local timezone interpretation
    // Append time component to prevent UTC conversion
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

// Alternative approach (simpler):
function parseDate(dateString) {
    'use strict';
    if (!dateString) return null;
    
    // Append T00:00:00 to force local timezone
    return new Date(dateString + 'T00:00:00');
}
```

### Update all date parsing

Check for other date parsing locations:

```bash
grep -rn "new Date(" js/ | grep -v node_modules
```

Apply same fix to:
- `js/storage.js` - date parsing in import/export
- `js/calculator.js` - date comparisons

### Verification

```bash
# Manual test (different timezones):
# 1. Open index.html
# 2. Add entry with today's date
# 3. Check stored date in LocalStorage
# 4. Should match input date exactly
# 5. Test in UTC-5, UTC+1 timezones
```

### Git Commit

```bash
git add js/utils.js
git commit -m "fix(p1): fix parseDate() timezone bug

- Force local timezone interpretation
- Append T00:00:00 to prevent UTC conversion
- Prevents date shifting (2026-03-30 → 2026-03-29)
- Consistent behavior across timezones"
```

---

## Fix P1-5: No Quota Validation in importData() (20 minutes)

**Problem**: Risk of partial corruption on large imports if LocalStorage quota exceeded

### Location

`js/storage.js` - `importData()` function

### Implementation

Edit `js/storage.js`, add quota check:

```javascript
/**
 * Import data from JSON export
 * @param {Object} data - Imported data object
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function importData(data) {
    'use strict';
    try {
        // Check storage quota before import
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            const usage = estimate.usage || 0;
            const quota = estimate.quota || 5242880; // 5MB default
            const estimatedSize = JSON.stringify(data).length * 2; // bytes
            
            if (usage + estimatedSize > quota * 0.9) {
                return {
                    success: false,
                    error: `Import would exceed storage quota. Free ${(quota - usage) / 1024 / 1024} MB`
                };
            }
        }
        
        // Validate data structure
        if (!data || !data.entries || !Array.isArray(data.entries)) {
            return { success: false, error: 'Invalid import data format' };
        }
        
        // Clear existing data
        localStorage.setItem('tdee_entries', JSON.stringify(data.entries));
        
        if (data.settings) {
            localStorage.setItem('tdee_settings', JSON.stringify(data.settings));
        }
        
        return { success: true };
    } catch (error) {
        console.error('Storage.importData:', error);
        return { success: false, error: error.message };
    }
}
```

### Verification

```bash
# Manual test:
# 1. Create large import file (>4MB)
# 2. Try to import
# 3. Should see quota error message
# 4. Should NOT corrupt existing data
```

### Git Commit

```bash
git add js/storage.js
git commit -m "fix(p1): add quota validation to importData()

- Check navigator.storage.estimate() before import
- Reject if would exceed 90% of quota
- Prevents partial corruption on large imports
- Shows user how much space to free"
```

---

## Fix P1-6: No Schema Versioning in importData() (30 minutes)

**Problem**: No migration path for future schema changes → breaking changes risk

### Implementation

Add schema versioning to `js/storage.js`:

```javascript
const CURRENT_SCHEMA_VERSION = 1;

/**
 * Import data from JSON export with schema versioning
 * @param {Object} data - Imported data object
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function importData(data) {
    'use strict';
    try {
        // Check schema version
        const importVersion = data.schemaVersion || 0;
        
        if (importVersion > CURRENT_SCHEMA_VERSION) {
            return {
                success: false,
                error: `Import requires newer app version (schema ${importVersion} > ${CURRENT_SCHEMA_VERSION})`
            };
        }
        
        // Migrate if needed
        let migratedData = data;
        if (importVersion < CURRENT_SCHEMA_VERSION) {
            migratedData = migrateData(data, importVersion, CURRENT_SCHEMA_VERSION);
        }
        
        // ... rest of import logic ...
        
        return { success: true };
    } catch (error) {
        console.error('Storage.importData:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Migrate data between schema versions
 * @param {Object} data - Data to migrate
 * @param {number} fromVersion - Source version
 * @param {number} toVersion - Target version
 * @returns {Object} Migrated data
 */
function migrateData(data, fromVersion, toVersion) {
    'use strict';
    let migrated = { ...data };
    
    for (let version = fromVersion; version < toVersion; version++) {
        switch (version) {
            case 0:
                // v0 → v1: Add schema version field
                migrated.schemaVersion = 1;
                break;
            // Future migrations:
            // case 1: // v1 → v2: ...
        }
    }
    
    return migrated;
}
```

### Add schema version to exports

Edit `js/storage.js`, `exportData()` function:

```javascript
function exportData() {
    'use strict';
    return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        entries: Storage.getEntries(),
        settings: Storage.getSettings()
    };
}
```

### Verification

```bash
# Manual test:
# 1. Export current data
# 2. Check JSON has schemaVersion: 1
# 3. Import back → should work
# 4. Modify export to schemaVersion: 99
# 5. Import → should reject with version error
```

### Git Commit

```bash
git add js/storage.js
git commit -m "feat(p1): add schema versioning to import/export

- Add schemaVersion field to exported JSON
- Validate version on import (reject future versions)
- Add migrateData() framework for future migrations
- Starts at schema version 1"
```

---

## Fix P1-7: Contradictory Tests (20 minutes)

**Problem**: Calories-only entry tests conflict with Fix #1 weight validation

### Location

`tests/sync.test.js:695-770`

### Implementation

Edit `tests/sync.test.js`, remove or update contradictory tests:

```javascript
// REMOVE these tests (conflict with weight validation):
/*
describe('calories-only entries', () => {
    // DELETE THIS ENTIRE BLOCK
});
*/

// REPLACE with weight-required tests:
describe('weight validation', () => {
    it('rejects entry without weight', async () => {
        const entry = { date: '2026-03-30', calories: 2000 };
        const result = await Sync.saveWeightEntry(entry);
        expect(result.success).toBe(false);
        expect(result.error).toContain('weight');
    });
    
    it('rejects entry with null weight', async () => {
        const entry = { date: '2026-03-30', weight: null, calories: 2000 };
        const result = await Sync.saveWeightEntry(entry);
        expect(result.success).toBe(false);
    });
    
    it('accepts entry with valid weight', async () => {
        const entry = { date: '2026-03-30', weight: 80.5, calories: 2000 };
        const result = await Sync.saveWeightEntry(entry);
        expect(result.success).toBe(true);
    });
});
```

### Verification

```bash
# Run tests
node tests/node-test.js

# Should see:
# ✓ weight validation tests passing
# ✗ NO calories-only tests (removed)
```

### Git Commit

```bash
git add tests/sync.test.js
git commit -m "test(p1): fix contradictory sync tests

- Remove calories-only entry tests (conflict with Fix #1)
- Add weight validation tests (require weight field)
- Tests now match production behavior
- All 131 tests passing"
```

---

## Fix P1-8: Fix #3 Not Implemented (10 minutes)

**Problem**: Auth race condition fix documented but not coded

### Note

This was already fixed in P0-1. Verify the fix is present:

```bash
# Check sync.js for getSession() usage
grep -n "getSession()" js/sync.js

# Should see 3 occurrences:
# Line ~481: queueLocalEntriesForSync()
# Line ~975: saveWeightEntry()
# Line ~1034: updateWeightEntry()
```

If not present, apply P0-1 fix.

### Git Commit (if needed)

```bash
# Already done in P0, no commit needed
```

---

## Fix P1-9: Fix #5 Not Verified (30 minutes)

**Problem**: No tests confirm sync trigger after import

### Implementation

Add integration test to `tests/sync.test.js`:

```javascript
describe('import sync trigger', () => {
    it('triggers sync after successful import', async () => {
        // Mock sync
        const syncSpy = jest.fn();
        Sync.syncAll = syncSpy;
        
        // Import data
        const testData = {
            schemaVersion: 1,
            entries: [{ date: '2026-03-30', weight: 80.5 }]
        };
        
        const result = await Storage.importData(testData);
        expect(result.success).toBe(true);
        
        // Verify sync was triggered
        expect(syncSpy).toHaveBeenCalled();
    });
    
    it('does NOT trigger sync if not authenticated', async () => {
        // Mock auth
        Auth.isAuthenticated = () => false;
        
        const syncSpy = jest.fn();
        Sync.syncAll = syncSpy;
        
        const testData = {
            schemaVersion: 1,
            entries: [{ date: '2026-03-30', weight: 80.5 }]
        };
        
        await Storage.importData(testData);
        
        // Verify sync NOT called
        expect(syncSpy).not.toHaveBeenCalled();
    });
});
```

### Verification

```bash
# Run tests
node tests/node-test.js

# Should see:
# ✓ import sync trigger tests passing
```

### Git Commit

```bash
git add tests/sync.test.js
git commit -m "test(p1): add import sync trigger tests

- Verify sync triggered after successful import
- Verify sync NOT triggered when not authenticated
- Integration test for Fix #5
- Confirms import → sync flow works"
```

---

## Fix P1-10: Disabled Test (10 minutes)

**Problem**: Fix #4 test commented out in `phase1-node.test.js`

### Location

`tests/phase1-node.test.js`

### Implementation

Edit `tests/phase1-node.test.js`, find disabled test:

```javascript
// OLD - Disabled
// it('clears queue before clearing data', () => {
//     // Test code...
// });

// NEW - Enabled
it('clears queue before clearing data', () => {
    // Test code...
    // Verify this is working correctly
});
```

If test fails, fix the underlying issue (should already be fixed in P0).

### Verification

```bash
# Run tests
node tests/node-test.js

# Should see:
# ✓ Fix #4 test passing (no longer disabled)
```

### Git Commit

```bash
git add tests/phase1-node.test.js
git commit -m "test(p1): enable disabled Fix #4 test

- Uncomment queue clearing test
- Verify clearData() clears sync queue first
- Test should pass after P0 fixes
- Improves test coverage"
```

---

## Final Verification

### Run Complete Test Suite

```bash
# Node.js tests
node tests/node-test.js
# Expected: 131+ tests passing

# Browser tests
open tests/test-runner.html
# Expected: 155+ tests passing
```

### Manual Testing Checklist

```bash
# Error boundaries
□ Delete DOM element, trigger render → shows error, doesn't crash

# Sync errors
□ Disconnect internet, import data → shows error message

# Offline mode
□ Go offline, refresh → app works completely

# Timezone
□ Add entry, check stored date → matches input exactly

# Import validation
□ Import large file (>4MB) → quota error
□ Import future schema → version error

# Tests
□ All 131 Node.js tests passing
□ All 155+ browser tests passing
```

---

## Deployment

```bash
# Push to feature branch
git push origin fix/p1-high-priority

# Create PR
gh pr create \
  --title "fix(p1): high priority stability improvements" \
  --body "10 high-priority fixes for production stability"

# After merge, auto-deploys to Cloudflare Pages
```

---

**Estimated Total Time**: 3-4 hours  
**Dependencies**: P0-critical-blockers must be complete  
**Next Plan**: P2-medium-priority.md
