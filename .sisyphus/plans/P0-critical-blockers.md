# P0 Critical Blockers — Deployment Plan

**Priority**: CRITICAL (Must fix before deployment)  
**Estimated Time**: 60-90 minutes  
**Risk Level**: HIGH (Data loss, auth broken, a11y violations)  
**Tests**: 131 must pass after fixes  

---

## Executive Summary

**6 critical issues** preventing safe deployment to production (tdee.kutasi.dev):

1. Auth race conditions → failed syncs, data loss
2. Missing config.js → auth completely broken
3. No focus trapping → keyboard users locked out
4. No focus restoration → a11y violation
5. Missing updateEntry() → TypeError crashes
6. Inconsistent return types → sync failures

**After these fixes**: ✅ READY TO DEPLOY

---

## Prerequisites

```bash
# Ensure you're on master branch
git checkout master
git pull origin master

# Create feature branch
git checkout -b fix/p0-critical-blockers

# Verify current test status
node tests/node-test.js
# Expected: 131 tests passing
```

---

## Fix P0-2: Missing js/config.js (2 minutes)

**Problem**: `index.html:367` references non-existent `js/config.js` → 404 error, `SUPABASE_CONFIG` undefined

### Option A: Generate config.js (Recommended)

```bash
# Run config generator script
node scripts/generate-config.js

# Verify file created
ls -la js/config.js

# Verify content (should have SUPABASE_CONFIG)
cat js/config.js | head -20
```

### Option B: Remove script tag (if not using Supabase)

```bash
# Edit index.html, remove line 367
# <script src="js/config.js"></script>
```

### Verification

```bash
# Check for 404 errors in browser console
# Open index.html, check Network tab
# Should see 200 for js/config.js (or no error if removed)
```

### Git Commit

```bash
git add js/config.js
git commit -m "fix(p0): generate Supabase config file

- Run scripts/generate-config.js to create js/config.js
- Fixes 404 error breaking auth initialization
- Required for Supabase client configuration"
```

---

## Fix P0-5: Missing Storage.updateEntry() (15 minutes)

**Problem**: `sync.js:1020` calls `Storage.updateEntry()` which doesn't exist → TypeError

### Implementation

Edit `js/storage.js`, add after `deleteEntry()` function:

```javascript
/**
 * Update an existing entry in LocalStorage
 * @param {Object} entry - Entry object with date property
 * @returns {{success: boolean, error?: string}} Result object
 */
function updateEntry(entry) {
    'use strict';
    try {
        if (!entry || !entry.date) {
            return { success: false, error: 'Invalid entry: missing date' };
        }
        
        const entries = Storage.getEntries();
        const index = entries.findIndex(e => e.date === entry.date);
        
        if (index === -1) {
            return { success: false, error: 'Entry not found' };
        }
        
        // Update the entry
        entries[index] = { ...entries[index], ...entry, updatedAt: Date.now() };
        
        // Save back to LocalStorage
        localStorage.setItem('tdee_entries', JSON.stringify(entries));
        
        return { success: true };
    } catch (error) {
        console.error('Storage.updateEntry:', error);
        return { success: false, error: error.message };
    }
}
```

### Export the function

In `js/storage.js` IIFE return statement, add `updateEntry`:

```javascript
return {
    saveEntry,
    getEntry,
    getEntries,
    deleteEntry,
    updateEntry,  // ← ADD THIS
    clearAll,
    importData,
    exportData,
    // ... rest of exports
};
```

### Verification

```bash
# Run tests
node tests/node-test.js

# Check for Storage tests
# Should see Storage tests passing
```

### Git Commit

```bash
git add js/storage.js
git commit -m "fix(p0): add missing Storage.updateEntry() function

- Implements updateEntry() for sync.js to call
- Returns {success: boolean, error?: string} pattern
- Handles missing entry, invalid input gracefully
- Fixes TypeError at sync.js:1020"
```

---

## Fix P0-6: Inconsistent Storage Return Types (10 minutes)

**Problem**: `Storage.deleteEntry()` returns boolean but sync expects `{success: boolean}`

### Update deleteEntry() signature

Edit `js/storage.js`, find `deleteEntry()` function:

```javascript
/**
 * Delete an entry from LocalStorage
 * @param {string} date - Entry date to delete
 * @returns {{success: boolean, error?: string}} Result object
 */
function deleteEntry(date) {
    'use strict';
    try {
        if (!date || typeof date !== 'string') {
            return { success: false, error: 'Invalid date parameter' };
        }
        
        const entries = Storage.getEntries();
        const filtered = entries.filter(e => e.date !== date);
        
        if (filtered.length === entries.length) {
            return { success: false, error: 'Entry not found' };
        }
        
        localStorage.setItem('tdee_entries', JSON.stringify(filtered));
        return { success: true };
    } catch (error) {
        console.error('Storage.deleteEntry:', error);
        return { success: false, error: error.message };
    }
}
```

### Update callers in sync.js

Edit `js/sync.js`, find all `Storage.deleteEntry()` calls:

```javascript
// OLD (returns boolean)
if (Storage.deleteEntry(date)) {
    // success
}

// NEW (returns {success: boolean})
const result = Storage.deleteEntry(date);
if (result.success) {
    // success
} else {
    console.error('Failed to delete entry:', result.error);
}
```

### Verification

```bash
# Run all tests
node tests/node-test.js

# Check sync tests specifically
# All sync operations should pass
```

### Git Commit

```bash
git add js/storage.js js/sync.js
git commit -m "fix(p0): standardize Storage.deleteEntry() return type

- Change from boolean to {success: boolean, error?: string}
- Update all sync.js callers to check result.success
- Consistent with updateEntry() and saveEntry() patterns
- Better error messages for debugging"
```

---

## Fix P0-1: Auth Race Conditions (10 minutes)

**Problem**: 3 locations use `Auth.getCurrentUser()` instead of `Auth.getSession()` → null user during auth transitions

### Locations to fix

| File | Line | Function |
|------|------|----------|
| `js/sync.js` | 481 | `queueLocalEntriesForSync()` |
| `js/sync.js` | 975 | `saveWeightEntry()` |
| `js/sync.js` | 1034 | `updateWeightEntry()` |

### Fix Pattern

Replace this pattern:
```javascript
// ❌ BROKEN - Race condition
const user = Auth.getCurrentUser();
if (user) {
    // use user.id
}
```

With this pattern:
```javascript
// ✅ FIXED - Await session
const { session } = await Auth.getSession();
if (session && session.user) {
    const userId = session.user.id;
    // use userId
}
```

### Implementation

Edit `js/sync.js`:

**Line 481** - `queueLocalEntriesForSync()`:
```javascript
// OLD
const user = Auth.getCurrentUser();
if (user) {
    // ...
}

// NEW
const { session } = await Auth.getSession();
if (session && session.user) {
    const userId = session.user.id;
    // ...
}
```

**Line 975** - `saveWeightEntry()`:
```javascript
// OLD
const user = Auth.getCurrentUser();
if (!user) {
    throw new Error('Not authenticated');
}

// NEW
const { session } = await Auth.getSession();
if (!session || !session.user) {
    throw new Error('Not authenticated');
}
const userId = session.user.id;
```

**Line 1034** - `updateWeightEntry()`:
```javascript
// Apply same pattern as saveWeightEntry()
const { session } = await Auth.getSession();
if (!session || !session.user) {
    throw new Error('Not authenticated');
}
```

### Make functions async

Since we're now awaiting `getSession()`, these functions must be `async`:

```javascript
// Add async keyword
async function queueLocalEntriesForSync() { ... }
async function saveWeightEntry(entry) { ... }
async function updateWeightEntry(entry) { ... }
```

### Update callers

Check if these functions are called elsewhere and add `await`:

```bash
# Find all callers
grep -rn "queueLocalEntriesForSync\|saveWeightEntry\|updateWeightEntry" js/
```

### Verification

```bash
# Run tests
node tests/node-test.js

# Manual test in browser:
# 1. Open index.html
# 2. Sign in with magic link
# 3. Add weight entry
# 4. Check console for errors
# 5. Check Supabase dashboard for entry
```

### Git Commit

```bash
git add js/sync.js
git commit -m "fix(p0): fix auth race conditions with getSession()

- Replace getCurrentUser() with await getSession() in 3 locations
- sync.js:481 queueLocalEntriesForSync()
- sync.js:975 saveWeightEntry()
- sync.js:1034 updateWeightEntry()
- Make functions async to await session
- Prevents null user during auth state transitions"
```

---

## Fix P0-3: No Focus Trapping (20 minutes)

**Problem**: Users can tab out of modals to underlying page → keyboard users lose context

### Create focus trap utility

Create new file `js/ui/focusTrap.js`:

```javascript
'use strict';

/**
 * Focus trap utility for modals
 * Keeps focus within a container element
 */
window.FocusTrap = (function() {
    
    /**
     * Trap focus within an element
     * @param {HTMLElement} container - Element to trap focus within
     * @returns {Function} Cleanup function to call when done
     */
    function trapFocus(container) {
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');
        
        const focusableElements = container.querySelectorAll(focusableSelectors);
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        // Store previous focus for restoration
        const previousActiveElement = document.activeElement;
        
        // Focus first element
        firstFocusable?.focus();
        
        function handleKeyDown(event) {
            if (event.key !== 'Tab') return;
            
            if (event.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstFocusable) {
                    event.preventDefault();
                    lastFocusable?.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastFocusable) {
                    event.preventDefault();
                    firstFocusable?.focus();
                }
            }
        }
        
        container.addEventListener('keydown', handleKeyDown);
        
        // Return cleanup function
        return function releaseFocus() {
            container.removeEventListener('keydown', handleKeyDown);
            // Restore focus to previous element
            previousActiveElement?.focus();
        };
    }
    
    return {
        trapFocus
    };
})();
```

### Add to index.html

Edit `index.html`, add script tag in UI section:

```html
<!-- Add after components.js, before app.js -->
<script src="js/ui/components.js"></script>
<script src="js/ui/focusTrap.js"></script>
<script src="js/ui/dashboard.js"></script>
```

### Apply to modals

Edit `js/ui/components.js`, find `AuthModal.show()` or modal open function:

```javascript
// Add focus trap when modal opens
let releaseFocus = null;

function showModal() {
    // ... existing modal show code ...
    
    // Trap focus
    releaseFocus = FocusTrap.trapFocus(modalElement);
}

function hideModal() {
    // ... existing modal hide code ...
    
    // Release focus trap
    if (releaseFocus) {
        releaseFocus();
        releaseFocus = null;
    }
}
```

### Verification

```bash
# Manual test in browser:
# 1. Open index.html
# 2. Press Tab repeatedly
# 3. Focus should cycle within modal
# 4. Cannot tab to underlying page
# 5. Close modal, focus returns to trigger
```

### Git Commit

```bash
git add js/ui/focusTrap.js index.html js/ui/components.js
git commit -m "fix(p0): add focus trapping for modals

- Create js/ui/focusTrap.js utility
- Trap Tab key within modal boundaries
- Cycle focus from last to first element
- Prevents keyboard users losing context
- WCAG 2.1 compliance"
```

---

## Fix P0-4: No Focus Restoration (10 minutes)

**Problem**: After modal closes, focus not returned to trigger element → users lose place

### Store trigger element

Edit `js/ui/components.js`, modify modal functions:

```javascript
let triggerElement = null;
let releaseFocus = null;

function showModal(triggerElement) {
    // Store trigger for restoration
    this.triggerElement = triggerElement || document.activeElement;
    
    // ... existing show code ...
    
    // Trap focus
    releaseFocus = FocusTrap.trapFocus(modalElement);
}

function hideModal() {
    // ... existing hide code ...
    
    // Release focus trap
    if (releaseFocus) {
        releaseFocus();
        releaseFocus = null;
    }
    
    // Restore focus to trigger
    if (this.triggerElement) {
        this.triggerElement.focus();
        this.triggerElement = null;
    }
}
```

### Update modal triggers

Find all modal trigger buttons and pass `this`:

```html
<!-- OLD -->
<button onclick="AuthModal.show()">Sign In</button>

<!-- NEW -->
<button onclick="AuthModal.show(this)">Sign In</button>
```

Or in JavaScript:
```javascript
// When calling show()
AuthModal.show(event.target);
```

### Verification

```bash
# Manual test in browser:
# 1. Tab to "Sign In" button
# 2. Press Enter to open modal
# 3. Interact with modal
# 4. Close modal (ESC or X button)
# 5. Focus should return to "Sign In" button
# 6. Can continue tabbing from there
```

### Git Commit

```bash
git add js/ui/components.js index.html
git commit -m "fix(p0): restore focus after modal close

- Store trigger element before opening modal
- Restore focus when modal closes
- Keyboard users maintain their place
- Completes WCAG 2.1 focus management"
```

---

## Final Verification

### Run Complete Test Suite

```bash
# Node.js tests
node tests/node-test.js
# Expected: 131 tests passing, 0 failures

# Browser tests (manual)
open tests/test-runner.html
# Expected: 155+ tests passing
```

### Manual Testing Checklist

```bash
# Auth flow
□ Sign in with magic link works
□ No console errors during auth
□ Entries sync to Supabase

# Storage operations
□ Add weight entry → appears in list
□ Edit weight entry → updates correctly
□ Delete entry → removed from list

# Accessibility
□ Tab through modal → focus trapped
□ Close modal → focus restored to trigger
□ Cannot tab to underlying page

# Console errors
□ Open DevTools Console
□ Navigate entire app
□ Should see ZERO errors
```

### Git Status

```bash
# Check all changes committed
git status
# Should show clean working tree

# View commit history
git log --oneline -10
# Should see 6 commits (one per fix)
```

---

## Deployment

### Push to Feature Branch

```bash
git push origin fix/p0-critical-blockers
```

### Create Pull Request

```bash
gh pr create \
  --title "fix(p0): critical blockers for deployment" \
  --body "Fixes 6 critical issues preventing deployment:
- Auth race conditions
- Missing config.js
- Focus trapping/restoration
- Missing updateEntry()
- Return type consistency

All 131 tests passing."
```

### Merge and Deploy

```bash
# After PR approved
git checkout master
git pull origin master
git merge fix/p0-critical-blockers
git push origin master

# Or use GitHub merge button
# CI/CD will auto-deploy to Cloudflare Pages
```

### Post-Deployment Verification

```bash
# Visit production site
open https://tdee.kutasi.dev

# Test checklist:
□ Page loads without 404 errors
□ Auth works (sign in/out)
□ Can add/edit/delete entries
✓ Entries sync to Supabase
□ Keyboard navigation works
□ No console errors
```

---

## Rollback Plan

If issues discovered after deployment:

```bash
# Revert to previous commit
git checkout master
git revert HEAD~6..HEAD
git push origin master

# Or restore from Cloudflare Pages
# Go to Pages dashboard → tdee-tracker → Deployments
# Restore previous deployment
```

---

## Success Criteria

✅ **All P0 fixes complete when:**
- [ ] 131 Node.js tests passing
- [ ] 155+ browser tests passing
- [ ] Zero console errors in production
- [ ] Auth flow works end-to-end
- [ ] Keyboard navigation works (focus trap + restoration)
- [ ] Entries sync to Supabase correctly
- [ ] No 404 errors for config.js

**Estimated Total Time**: 60-90 minutes  
**Risk After Fixes**: LOW (ready for production)

---

**Created**: 2026-03-30  
**Based on**: COMPREHENSIVE_REVIEW_SUMMARY.md  
**Next Plan**: P1-high-priority.md
