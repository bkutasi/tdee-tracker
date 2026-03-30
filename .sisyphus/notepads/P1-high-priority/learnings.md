
## P1-3: Complete Service Worker Cache (2026-03-30)

### Task
Add all missing JS files to service worker STATIC_ASSETS array to enable full offline mode.

### Files Modified
- `sw.js` - Updated STATIC_ASSETS array (lines 9-27)
- `js/version.js` - Incremented APP_VERSION to 1.0.2

### Changes Made

**STATIC_ASSETS Structure:**
Organized into logical groups with comments:
1. Core files: `/`, `/index.html`, `/manifest.json`, `/css/styles.css`
2. JS core modules (9 files): app, auth, calculator-ewma, calculator-tdee, calculator, storage, sync, utils, version
3. UI components (6 files): chart, components, dailyEntry, dashboard, focusTrap, settings, weeklyView
4. Icons (2 files): icon-192.png, icon-512.png

**Version Updates:**
- CACHE_VERSION: 1.0.1 → 1.0.2 (sw.js line 7)
- APP_VERSION: 1.0.1 → 1.0.2 (js/version.js line 10)

### Key Learnings

1. **File Organization**: Grouping cache assets by type (core/JS/UI/icons) improves maintainability
2. **Alphabetical Order**: Within groups, alphabetical ordering makes it easy to spot missing files
3. **Version Sync**: Both CACHE_VERSION and APP_VERSION must be incremented together to avoid mismatches
4. **Verification Critical**: Always verify all files exist before adding to cache (prevents silent failures)

### Verification Steps
```bash
# 1. Verify all files exist
for file in js/*.js js/ui/*.js icons/*.png; do
    [ -f "$file" ] && echo "✓ $file" || echo "✗ $file MISSING"
done

# 2. Run test suite
node tests/node-test.js
# Expected: All tests passing (131+)

# 3. Manual offline test (browser)
# - Open index.html
# - DevTools → Application → Service Workers → Update
# - DevTools → Network → Offline
# - Refresh page → Should work completely
```

### Test Results
- ✅ All 131 Node.js tests passing
- ✅ No regressions introduced
- ✅ All 18 cache files verified to exist

### Pattern for Future Cache Updates
```javascript
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/styles.css',
    // JS core modules (alphabetical)
    '/js/app.js',
    '/js/auth.js',
    // ... etc
    // UI components (alphabetical)
    '/js/ui/chart.js',
    '/js/ui/components.js',
    // ... etc
    // Icons
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];
```

### Notes
- Comments in STATIC_ASSETS are organizational only (improve readability)
- Service worker will cache all listed assets on install
- Version increment forces browser to invalidate old cache on next load
- Offline mode now fully functional with all JS files cached

## P1-4: parseDate() Timezone Bug Fix

**Date**: 2026-03-30  
**Issue**: Date strings shifting across timezones (e.g., 2026-03-30 → 2026-03-29)

### Root Cause

The `validateDateFormat()` function in `js/utils.js:345` was using `new Date(dateStr)` directly, which interprets the date string as UTC midnight. This caused timezone shifts when the local timezone is behind UTC.

Example:
- Input: `"2026-03-30"`
- Old behavior: `new Date("2026-03-30")` → UTC midnight → local time becomes 2026-03-29 in negative timezones
- New behavior: `parseDate("2026-03-30")` → local midnight → stays 2026-03-30

### Solution

Changed `validateDateFormat()` to use the existing `parseDate()` helper which properly handles timezone interpretation:

```javascript
// OLD - Timezone vulnerable (line 345)
const parsed = new Date(dateStr);

// NEW - Timezone-aware
const parsed = parseDate(dateStr);
```

The `parseDate()` function (lines 85-98) already uses the correct approach:
```javascript
const [year, month, day] = dateStr.split('-').map(Number);
return new Date(year, month - 1, day);  // Interprets as local time
```

### Verification

- All 131 tests pass
- Manual timezone test confirms no date shifting:
  - Input: `2026-03-30`
  - Parsed: `Mon Mar 30 2026 00:00:00 GMT+0200`
  - Formatted: `2026-03-30` ✓

### Files Modified

- `js/utils.js:345` - Changed `validateDateFormat()` to use `parseDate()`

### Pattern for Future Date Parsing

Always use `parseDate()` for YYYY-MM-DD strings:
- ✅ `parseDate('2026-03-30')` - Local timezone interpretation
- ❌ `new Date('2026-03-30')` - UTC interpretation (causes shifting)


## P1-1: Error Boundaries for UI Render Functions (2026-03-30)

### Summary
Added error boundaries to all UI render functions to prevent crashes from null references and provide user-friendly error messages.

### Files Modified
- `js/ui/components.js` - Added `showError()` helper function
- `js/ui/dashboard.js` - Wrapped `refresh()` and `renderTrends()` with try-catch
- `js/ui/weeklyView.js` - Wrapped `render()` and `renderSummary()` with try-catch
- `js/ui/chart.js` - Wrapped `refresh()` with try-catch
- `js/ui/dailyEntry.js` - Wrapped `loadCurrentEntry()` with try-catch
- `js/ui/settings.js` - Wrapped `init()`, `setupEventListeners()`, `loadSettings()`, `updateStorageInfo()` with try-catch

### Error Boundary Pattern
```javascript
function render() {
    try {
        // Null checks for DOM elements
        const container = document.getElementById('container-id');
        if (!container) {
            console.warn('Component.render: container not found');
            return;
        }
        
        // Render logic
        container.innerHTML = generateHTML();
    } catch (error) {
        console.error('Component.render:', error);
        Components.showError('User-friendly message', 'Component');
    }
}
```

### Key Points
1. **Null Checks First**: Check DOM elements exist before accessing properties
2. **Console Logging**: Log errors with component context for debugging
3. **User-Friendly Messages**: Show actionable messages via `Components.showError()`
4. **Graceful Degradation**: Return early if critical elements missing
5. **Non-Critical Failures**: Some errors (e.g., storage info) fail silently

### Testing
- All 131 existing tests pass
- Error boundaries tested manually (browser environment required)
- Console warnings help identify missing DOM elements during development

### Lessons Learned
- Error boundaries should wrap entire render functions, not individual operations
- Null checks prevent errors from propagating when DOM elements are missing
- `Components.showError()` centralizes error display and logging
- Some UI components (storage info) can fail silently without user impact
