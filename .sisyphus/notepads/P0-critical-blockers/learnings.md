## P0-2: Generate js/config.js - Completed (2026-03-30)

### Problem
`index.html:367` referenced non-existent `js/config.js` → 404 error, `SUPABASE_CONFIG` undefined

### Solution
1. Generator script exists: `scripts/generate-config.js`
2. Script requires `.env` file with Supabase credentials
3. Created `.env` with placeholder values for local development
4. Ran `node scripts/generate-config.js` → generated `js/config.js`

### Key Points
- **Generator location**: `scripts/generate-config.js`
- **Input**: `.env` file (gitignored) with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SITE_URL`
- **Output**: `js/config.js` (gitignored) with `window.SUPABASE_CONFIG` object
- **Safe to commit**: `.env.example` exists, `.env` and `js/config.js` are gitignored

### File Structure
```
.env                    # Local credentials (gitignored)
.env.example            # Template for new developers
js/config.js            # Generated config (gitignored)
scripts/generate-config.js  # Generator script
```

### For Production (CI/CD)
- Cloudflare Pages injects env vars at build time
- No `.env` file needed in CI
- GitHub Actions sets `SUPABASE_URL` and `SUPABASE_ANON_KEY` as secrets

### Placeholder Values Used
```
SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_ANON_KEY=placeholder-anon-key
SITE_URL=http://localhost:8000
```

### Next Steps
- Replace placeholders with real Supabase credentials for local testing
- Or skip Supabase features entirely (app works with LocalStorage only)

## P0-1: Auth Race Condition Fix (2026-03-30)

**Problem**: Three locations in `js/sync.js` used `Auth.getCurrentUser()` which returns null during auth transitions, causing sync operations to fail silently.

**Root Cause**: `getCurrentUser()` reads cached user state synchronously, which can be stale during:
- Initial page load
- Auth state transitions (SIGNED_IN event firing)
- Token refresh cycles

**Solution Pattern**: Replace synchronous `getCurrentUser()` with async `await Auth.getSession()`

**Fixed Locations**:

1. **Line 481** - `queueLocalEntriesForSync()`:
```javascript
// BEFORE
const user = Auth.getCurrentUser();
if (!user) { /* skip */ }

// AFTER
const { session } = await Auth.getSession();
if (!session || !session.user) { /* skip */ }
const user = session.user;
```

2. **Line 975** - `saveWeightEntry()`:
```javascript
// BEFORE
const isAuthenticated = Auth.isAuthenticated();
const user = Auth.getCurrentUser();

// AFTER
const isAuthenticated = Auth.isAuthenticated();
const { session } = await Auth.getSession();
const user = session && session.user ? session.user : null;
```

3. **Line 1034** - `updateWeightEntry()`:
```javascript
// Same pattern as saveWeightEntry()
const { session } = await Auth.getSession();
const user = session && session.user ? session.user : null;
```

**Key Learnings**:

1. **Always await getSession()** in sync-critical paths
2. **Pattern**: `const { session } = await Auth.getSession(); if (session && session.user)`
3. **Functions must be async** to await getSession()
4. **Callers already using await** - no breaking changes needed
5. **getStatus() excluded** - debug-only, non-critical path

**Verification**: All 131 tests pass (`node tests/node-test.js`)

**Related**: Phase 1 Fix #3 (2026-03-16) - documented in AGENTS.md

## Focus Trap Implementation (P0-3 + P0-4) - 2026-03-30

### What Worked

**Focus Trap Pattern:**
- Created standalone `js/ui/focusTrap.js` utility module (98 lines)
- `trapFocus(container)` returns cleanup function that auto-restores focus
- Tab key cycles: last element → first element (and vice versa with Shift+Tab)
- Focus restoration happens automatically when cleanup function is called

**Integration:**
- Added script tag after auth-modal.js in index.html
- Applied to AuthModal.show() and AuthModal.hide()
- Single `releaseFocus` variable tracks cleanup function
- Graceful degradation: checks `typeof FocusTrap !== 'undefined'`

**WCAG 2.1 Compliance:**
- Users cannot tab out of modal to underlying page
- Focus returns to trigger element when modal closes
- Keyboard users maintain context throughout interaction

### Code Pattern

```javascript
// In module state
let releaseFocus = null;

// On modal open
releaseFocus = FocusTrap.trapFocus(modalContent);

// On modal close
if (releaseFocus) {
    releaseFocus();
    releaseFocus = null;
}
```

### Test Results
- 131 tests passing (0 failures)
- No regressions introduced
- ESLint: 9 warnings (pre-existing, non-blocking)

### Files Modified
- `js/ui/focusTrap.js` (NEW) - Focus trap utility
- `index.html` - Added script tag
- `js/ui/auth-modal.js` - Applied focus trap to show/hide
