<!-- Context: agent/guidelines | Priority: critical | Version: 3.0.1 | Updated: 2026-03-16 -->

# TDEE Tracker — Agent Knowledge Base

> Comprehensive guidelines for AI agents. Vanilla JS PWA with Supabase sync, zero npm dependencies.

## Overview

**Stack**: Vanilla ES6+ JavaScript, LocalStorage + Supabase, PWA (offline-first). **Zero npm dependencies**.
**Architecture**: IIFE modules, manual script loading, `js/app.js` as coordinator.
**Testing**: Custom test framework (155+ tests), dual runners (Node.js + browser).
**Sync**: Offline-first with optimistic UI, background sync queue, multi-device support.
**Auth**: Supabase Auth with magic link, OAuth, session management.

---

## 1. Project Structure

```
tdee-tracker/
├── index.html              # Main app (17k lines, script loading order = dependency graph)
├── js/
│   ├── app.js              # Initialization coordinator (85 lines)
│   ├── calculator.js       # Core math: EWMA, TDEE, gap handling (875 lines)
│   ├── storage.js          # LocalStorage wrapper, import/export (510 lines)
│   ├── utils.js            # Date helpers, validation (373 lines)
│   ├── sync.js             # Supabase sync: offline-first, queue, merge (1050 lines)
│   ├── auth.js             # Supabase Auth: magic link, OAuth (387 lines)
│   ├── config.js           # Supabase config (generated)
│   └── ui/                 # UI components (6 files, ~2k lines total)
│       ├── components.js   # Shared utilities, modals, theme (158 lines)
│       ├── dailyEntry.js   # Weight/calorie input form (182 lines)
│       ├── weeklyView.js   # Weekly summary table (169 lines)
│       ├── dashboard.js    # Stats cards, TDEE display (270 lines)
│       ├── settings.js     # User preferences, units, theme (185 lines)
│       └── chart.js        # TDEE history chart (513 lines)
├── tests/                  # Custom test framework, 155+ tests
│   ├── node-test.js        # Node.js runner (81 tests)
│   ├── test-runner.html    # Browser runner (155+ tests)
│   ├── calculator.test.js  # TDEE calculations (295 lines)
│   ├── calculator_bmr.test.js # BMR formulas (107 lines)
│   ├── storage.test.js     # LocalStorage operations (143 lines)
│   ├── utils.test.js       # Date/validation helpers (173 lines)
│   ├── test-date-validation.js # Date validation integration (222 lines)
│   ├── sync.test.js        # Sync operations (35+ tests)
│   ├── csp-compliance.test.js # CSP meta tag validation (13 tests)
│   └── ui/
│       └── modal.test.js   # Modal rendering (45+ tests)
├── css/
│   └── styles.css          # All styles (2.3k lines)
├── .github/
│   └── workflows/
│       └── deploy.yml      # CI/CD: test + deploy to Cloudflare Pages
├── sw.js                   # Service worker (PWA offline support)
├── manifest.json           # PWA manifest
├── supabase-schema.sql     # Database schema with RLS policies
├── DEPLOYMENT.md           # Deployment guide
└── AGENTS.md               # This file
```

---

## 2. Supabase Sync Architecture

### Overview

**Sync Module** (`js/sync.js`): Offline-first data synchronization between LocalStorage and Supabase.

**Key Features:**
- ✅ Optimistic UI updates (LocalStorage first, instant feedback)
- ✅ Background sync queue (processes when online + authenticated)
- ✅ Conflict resolution (newest timestamp wins)
- ✅ Offline support (queue operations, sync when reconnected)
- ✅ Multi-device sync (automatic merge on login)

### Sync Flow

```
User saves entry
    ↓
Sync.saveWeightEntry()
    ├─→ Storage.saveEntry() → LocalStorage (INSTANT)
    └─→ Queue operation → Sync queue
         ↓
    Background Sync (when online + authenticated)
         ↓
    Supabase API → weight_entries table
         ↓
    Queue cleared on success
```

### Merge Logic (on login)

```
Remote (Supabase) + Local (LocalStorage)
    ↓
Compare by date
    ↓
Conflict? → Newest timestamp wins
    ↓
Merged, sorted entries → LocalStorage
    ↓
UI refreshed automatically
```

### Public API

**Core Methods:**
```javascript
// Save entry (optimistic UI + queue sync)
await Sync.saveWeightEntry(entry)

// Update entry
await Sync.updateWeightEntry(entry)

// Delete entry
await Sync.deleteWeightEntry(id)

// Fetch from Supabase
const result = await Sync.fetchWeightEntries()

// Merge remote + local
const merged = Sync.mergeEntries(remoteEntries)

// Manual sync trigger
await Sync.syncAll()

// Get status
const status = Sync.getStatus()
// Returns: { isOnline, isAuthenticated, pendingOperations, lastSyncTime, ... }
```

**Debug Utilities** (dev mode only):
```javascript
SyncDebug.help()        // Show all commands
SyncDebug.status()      // Get sync status
SyncDebug.queue()       // View pending operations
SyncDebug.errors()      // View error history
SyncDebug.forceSync()   // Trigger immediate sync
SyncDebug.clearQueue()  // Clear pending operations
SyncDebug.clearErrors() // Clear error history
SyncDebug.lastSync()    // Get last sync time
SyncDebug.testEntry()   // Create test entry
SyncDebug.info()        // Full status report
SyncDebug.filterQueue() // Remove invalid operations (weight=null)
```

### Auth Integration

**Auth Module** (`js/auth.js`): Supabase authentication wrapper.

**Features:**
- Magic link (passwordless) authentication
- OAuth support (Google, GitHub, etc.)
- Session persistence in LocalStorage
- Auth state change observers

**Usage:**
```javascript
// Initialize
await Auth.init()

// Sign in with magic link
await Auth.signInWithMagicLink('user@example.com')

// Sign in with OAuth
await Auth.signInWithOAuth('google')

// Sign out
await Auth.signOut()

// Get current user
const user = Auth.getCurrentUser()

// Check authentication
const isAuthenticated = Auth.isAuthenticated()

// Get session
const { session } = await Auth.getSession()
```

**Auth State Events:**
- `SIGNED_IN` → Triggers data fetch + merge
- `SIGNED_OUT` → Pauses sync
- `TOKEN_REFRESHED` → Continues sync

### Supabase Setup

**Required Tables:**
- `profiles` (extends auth.users)
- `weight_entries` (user entries with RLS)

**Schema:** See `supabase-schema.sql`

**RLS Policies:**
- Users can only SELECT/INSERT/UPDATE/DELETE their own data
- Policy: `auth.uid() = user_id`

**Environment:**
```javascript
// Required in js/config.js
window.SUPABASE_CONFIG = {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key',
    siteUrl: 'http://localhost:8000'
};
```

**Generate config:**
```bash
node scripts/generate-config.js
```

### Sync Anti-Patterns

- ❌ **DO NOT** call `Storage.saveEntry()` directly for user entries — use `Sync.saveWeightEntry()`
- ❌ **DO NOT** bypass sync queue — breaks offline support
- ❌ **DO NOT** sync without checking `canSync()` — wastes API calls
- ❌ **DO NOT** ignore sync errors — check `SyncDebug.errors()`
- ❌ **DO NOT** clear queue manually unless debugging — use `Sync.clearQueue()`
- ❌ **DO NOT** queue entries with `weight: null` — violates DB constraint
- ❌ **DO NOT** save entries without weight validation — Phase 1 Fix #1 (2026-03-16)
- ❌ **DO NOT** delete entries without ID validation — Phase 1 Fix #2 (2026-03-16)
- ❌ **DO NOT** clear data without clearing sync queue — Phase 1 Fix #4 (2026-03-16)
- ❌ **DO NOT** import data without queuing for sync — Phase 1 Fix #5 (2026-03-16)

### Common Sync Issues

| Issue | Debug Command | Solution |
|-------|---------------|----------|
| Data not syncing | `SyncDebug.status()` | Check `isAuthenticated` and `isOnline` |
| Queue stuck | `SyncDebug.queue()` | Check for failed operations, use `SyncDebug.forceSync()` |
| Auth not working | `SyncDebug.status()` | Check `isAuthenticated`, re-login |
| Merge conflicts | `SyncDebug.info()` | Review conflict resolution (newest wins) |
| Errors | `SyncDebug.errors()` | Review error history, check Supabase RLS policies |
| Null weight errors | `SyncDebug.filterQueue()` | Remove invalid operations, entries without weight saved locally only |
| Null weight queued | `SyncDebug.queue()` | Check saveWeightEntry validation (Fix #1) |
| Invalid ID in queue | `SyncDebug.queue()` | Check deleteWeightEntry validation (Fix #2) |
| Queue not cleared | `SyncDebug.queue()` after clear | Check clearData clears queue first (Fix #4) |
| Import not syncing | `SyncDebug.status()` | Check importData queues for sync (Fix #5) |

---

## 3. Authentication

### Overview

**Module**: `js/auth.js` (387 lines)
**Provider**: Supabase Auth (v2.47.0)
**Methods**: Magic link (passwordless), OAuth (Google, GitHub)

### Authentication Flow

```
User clicks "Sign In"
    ↓
AuthModal shows (email input or OAuth buttons)
    ↓
User enters email or selects OAuth
    ↓
Magic link sent OR OAuth redirect
    ↓
User verifies email OR completes OAuth
    ↓
SIGNED_IN event fired
    ↓
Sync.fetchWeightEntries() + merge
    ↓
UI updated with synced data
```

### Session Management

```javascript
// Session stored in LocalStorage (Supabase client handles this)
const { session } = await Auth.getSession()
// Returns: { access_token, refresh_token, user, ... }

// Session auto-refreshes (Supabase client handles this)
// TOKEN_REFRESHED event fired on refresh
```

### Auth State Observer

```javascript
// Registered in Auth.init()
supabase.auth.onAuthStateChange((event, session) => {
    switch (event) {
        case 'SIGNED_IN':
            // Fetch remote data, merge with local
            break
        case 'SIGNED_OUT':
            // Pause sync, clear user data from memory
            break
        case 'TOKEN_REFRESHED':
            // Continue sync with new token
            break
    }
})
```

### Auth Anti-Patterns

- ❌ **DO NOT** store credentials manually — Supabase client handles this
- ❌ **DO NOT** bypass auth state observer — breaks sync integration
- ❌ **DO NOT** call Supabase APIs without checking auth — RLS will reject
- ❌ **DO NOT** ignore auth errors — show user-friendly messages

---

## 4. Context System Guide

### Overview

The Context System organizes project knowledge for AI agents in `.opencode/context/`.

**Core Principles:**
1. **Minimal Viable Information (MVI)**: Scannable in <30 seconds
2. **Concern-Based Structure**: Organize by what you're doing
3. **Token-Efficient Navigation**: ~200-300 tokens per navigation file
4. **Self-Describing Filenames**: `code-quality.md` not `code.md`

### Context Locations

| Category | Path | Purpose |
|----------|------|---------|
| **Core Standards** | `.opencode/context/core/standards/` | Universal standards (all projects) |
| **Project Context** | `.opencode/context/project/` | TDEE-specific algorithms, sync, challenges |
| **Development** | `.opencode/context/development/` | Multi-tech development patterns |
| **Deployment** | `.opencode/context/deployment/` | Cloudflare Pages, CI/CD guides |
| **Testing** | `.opencode/context/testing/` | Test patterns, coverage guides |

### Key Project Context Files

| File | Purpose |
|------|---------|
| `project/tdee-algorithms.md` | EWMA, TDEE formulas, confidence levels |
| `project/sync-challenges.md` | Documented sync bugs and resolutions |
| `project/project-context.md` | Technical domain overview |
| `deployment/guides/cloudflare-pages-ci.md` | CI/CD setup with test gating |
| `testing/concepts/test-patterns.md` | AAA pattern, positive/negative tests |

### Context Commands

```bash
/context                      # Quick scan, suggest actions
/context harvest              # Extract knowledge from summaries
/context extract {source}     # From docs/code/URLs
/context organize {category}  # Restructure flat files
/context update {what}        # When APIs/frameworks change
/context error {error}        # Add recurring error to knowledge base
```

### Using Context in Development

**Before writing code:**
1. Check `.opencode/context/project/` for existing patterns
2. Review `tdee-algorithms.md` for calculation specs
3. Check `sync-challenges.md` for known issues

**After solving a problem:**
1. Document in `.opencode/context/project/` or `development/`
2. Follow MVI format (core concepts, key points, minimal example)
3. Link to full documentation if needed

---

## 5. Deployment Quickstart

### Cloudflare Pages (Production)

**Live Demo**: https://tdee.kutasi.dev

**Automated Deployment:**
- Push to `master` → Tests run → Deploy if pass
- Pull requests → Tests only (no deploy)
- Preview deployments for feature branches

### Deploy Manually

```bash
# Install wrangler CLI
npm install -g wrangler

# Authenticate
wrangler login

# Deploy to Cloudflare Pages
wrangler pages deploy . --project-name=tdee-tracker --branch=master
```

### Cache Versioning (IMPORTANT)

**Before each deployment**, you MUST increment the cache version to force browser updates:

**Files to update:**
1. `sw.js` - Line 6: `const CACHE_VERSION = '1.0.0';`
2. `js/version.js` - Line 10: `const APP_VERSION = '1.0.0';`

**Process:**
```bash
# Before deploying, increment version (e.g., 1.0.0 → 1.0.1)
# Edit sw.js: const CACHE_VERSION = '1.0.1';
# Edit js/version.js: const APP_VERSION = '1.0.1';
# Then deploy
wrangler pages deploy . --project-name=tdee-tracker
```

**Why:** The service worker uses versioned cache names (`tdee-tracker-v1.0.1`). Without incrementing, users stay on old cached versions and need hard refresh.

**Automatic Update Detection:**
- New version shows "Update available" notification to users
- Version badge in footer displays current version
- Users can refresh immediately or defer
- See `VERSIONING.md` for complete documentation

### CI/CD Setup

**GitHub Secrets Required:**
```
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
CLOUDFLARE_API_TOKEN=<your-api-token>
```

**Workflow File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy TDEE Tracker

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run test suite
        run: node tests/node-test.js
      
      - name: Deploy to Cloudflare Pages
        if: github.ref == 'refs/heads/master' && success()
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy . --project-name=tdee-tracker
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### Custom Domain Setup

**DNS Configuration:**
```dns
Type: CNAME
Name: tdee
Value: tdee-tracker.pages.dev
TTL: 3600
```

**Cloudflare Pages:**
1. Pages Dashboard → Select project → **Custom domains**
2. **Set up a domain** → Enter `tdee.kutasi.dev`
3. SSL provisions automatically (~5 minutes)

### Deployment Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| Authentication failed | Invalid API token | Regenerate token with Pages Edit permission |
| Test failures | Assertion errors | Run `node tests/node-test.js` locally |
| Project not found | Wrong project name | Verify `--project-name` matches exactly |
| Permission denied | Token lacks permissions | Regenerate with Account → Pages → Edit |

See `DEPLOYMENT.md` for complete deployment guide.

---

## 6. Testing Deep Dive

### Overview

**Framework**: 100% custom (zero dependencies), Jest-inspired syntax
**Runners**: Node.js (81 tests) + Browser (155+ tests)
**Coverage**: Calculator, Storage, Utils, Sync, UI components, CSP

### Test Structure

```
tests/
├── node-test.js              # Node.js runner (81 tests)
├── test-runner.html          # Browser runner (155+ tests)
├── calculator.test.js        # TDEE calculations (295 lines)
├── calculator_bmr.test.js    # BMR formulas (107 lines)
├── storage.test.js           # LocalStorage operations (143 lines)
├── utils.test.js             # Date/validation helpers (173 lines)
├── test-date-validation.js   # Date validation integration (222 lines)
├── sync.test.js              # Sync operations (35+ tests)
├── csp-compliance.test.js    # CSP meta tag validation (13 tests)
└── ui/
    └── modal.test.js         # Modal rendering (45+ tests)
```

### Run Tests

```bash
# Node.js (fast, 81 tests)
node tests/node-test.js

# Browser (full suite, 155+ tests)
open tests/test-runner.html

# Shell script
./run-tests.sh
```

### Test Patterns

**AAA Pattern:**
```javascript
it('click on close button closes modal', () => {
    // Arrange
    AuthModal.show();
    const closeButton = getCloseButton();
    
    // Act
    closeButton.click();
    
    // Assert
    expect(AuthModal.isShown()).toBe(false);
});
```

**Positive/Negative Pairs:**
```javascript
// Positive test
it('Escape key closes modal', () => {
    AuthModal.show();
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);
    expect(AuthModal.isShown()).toBe(false);
});

// Negative test
it('other keys do NOT close modal', () => {
    AuthModal.show();
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    document.dispatchEvent(event);
    expect(AuthModal.isShown()).toBe(true);
});
```

**Floating-Point Safety:**
```javascript
// Tests explicitly verify 0.1 + 0.2 = 0.3
test('round handles floating point precision', () => {
    expect(Calculator.round(0.1 + 0.2, 2)).toBe(0.3);
});
```

**Excel Parity Tests:**
```javascript
// Tests verify calculations match Excel spreadsheet
test('matches Excel calculations for Week 1 data', () => {
    // From Improved_TDEE_Tracker.xlsx Row 12-13
    const weights = [82.0, 82.6, 82.6, 81.6, 81.4, 81.0, 81.1];
    // ... verify EWMA progression matches Excel
});
```

### Test Coverage

| Category | Tests | Coverage |
|----------|-------|----------|
| Calculator | 42 | EWMA, TDEE, gap handling, stats, BMR |
| Storage | 15 | CRUD, import/export, settings |
| Utils | 37 | Date parsing, validation, formatting |
| Sync | 35 | Queue, merge, auth integration, errors |
| UI | 58 | Modal rendering, accessibility, behavior |
| CSP | 13 | Meta tag validation, security best practices |
| **Total** | **155+** | **All passing** |

### Testing Anti-Patterns

- ❌ **DO NOT** use Jest/Vitest/Mocha — custom framework only
- ❌ **DO NOT** add test dependencies — zero npm packages
- ❌ **DO NOT** skip tests before commit — always run `node tests/node-test.js`
- ❌ **DO NOT** use browser dev tools for debugging — rely on automated tests
- ❌ **DO NOT** delete failing tests to "pass" — fix root cause
- ❌ **DO NOT** mock localStorage inconsistently — use standard mock pattern

### Browser-Only Tests

Some tests require browser environment (DOM, localStorage):
- UI component tests (modal rendering, dashboard)
- CSP compliance tests (meta tag validation)
- Integration tests (full app flow)

These run only in `test-runner.html`, not in Node.js.

---

## 7. Architecture Changes (v3.0)

### What's New

**Supabase Integration** (NEW in v3.0):
- `js/sync.js` — Offline-first sync (1050 lines)
- `js/auth.js` — Authentication (387 lines)
- `js/config.js` — Supabase configuration
- `supabase-schema.sql` — Database schema with RLS

**Enhanced Testing**:
- Sync tests (35+ tests)
- CSP compliance tests (13 tests)
- UI modal tests (45+ tests)
- Total: 155+ tests (up from 80+)

**CI/CD Pipeline**:
- GitHub Actions workflow
- Test gating (deploy blocked if tests fail)
- Cloudflare Pages deployment
- Preview deployments for feature branches

**Context System**:
- `.opencode/context/` knowledge base
- Project-specific context (algorithms, sync challenges)
- Deployment guides, testing patterns

### Migration from v2.0

**No Breaking Changes**:
- All existing LocalStorage data preserved
- Sync merges remote + local on first login
- Calorie-only entries saved locally (not synced)

**New Requirements**:
- Supabase project setup (see `supabase-schema.sql`)
- Config generation (`node scripts/generate-config.js`)
- CSP meta tag in `index.html` (validated by tests)

### File Changes

| File | Status | Changes |
|------|--------|---------|
| `js/sync.js` | NEW | Offline-first sync, queue, merge |
| `js/auth.js` | NEW | Supabase Auth wrapper |
| `js/config.js` | NEW | Supabase configuration |
| `supabase-schema.sql` | NEW | Database schema, RLS policies |
| `tests/sync.test.js` | NEW | Sync operation tests |
| `tests/csp-compliance.test.js` | NEW | CSP validation |
| `tests/ui/modal.test.js` | NEW | Modal rendering tests |
| `DEPLOYMENT.md` | NEW | Deployment guide |
| `AGENTS.md` | UPDATED | This file (v3.0) |

---

## 8. Where to Look

| Task | Location | Notes |
|------|----------|-------|
| TDEE algorithms | `js/calculator.js` | EWMA, regression, outlier detection |
| Storage logic | `js/storage.js` | LocalStorage, import/export JSON |
| Date utilities | `js/utils.js` | Date parsing, validation, formatting |
| UI components | `js/ui/*.js` | Dashboard, chart, entries, settings |
| **Supabase sync** | `js/sync.js` | Offline-first, queue, merge, debug |
| **Authentication** | `js/auth.js` | Magic link, OAuth, session |
| **Cache versioning** | `sw.js`, `js/version.js` | Version increment before deploy |
| **VERSIONING.md** | Root directory | Complete versioning guide |
| Test suite | `tests/` | Run: `node tests/node-test.js` |
| Algorithms doc | `.opencode/context/project/tdee-algorithms.md` | Detailed specs |
| Sync challenges | `.opencode/context/project/sync-challenges.md` | Bug documentation |
| Deployment | `DEPLOYMENT.md` | CI/CD, Cloudflare Pages |
| Context system | `.opencode/context/core/context-system.md` | Knowledge organization |

---

## 9. Code Map

| Symbol | Type | File | Purpose |
|--------|------|------|---------|
| `Calculator` | Module | `js/calculator.js` | Core TDEE engine (EWMA, regression, confidence) |
| `TDEE` | Module | `js/calculator-tdee.js` | Advanced TDEE: Fast/Stable, water weight, 4-factor confidence |
| `Storage` | Module | `js/storage.js` | LocalStorage persistence |
| `Utils` | Module | `js/utils.js` | Date/validation helpers |
| `App` | Module | `js/app.js` | Initialization coordinator |
| `Sync` | Module | `js/sync.js` | Supabase sync (offline-first, queue) |
| `Auth` | Module | `js/auth.js` | Supabase Auth (magic link, OAuth) |
| `Dashboard` | Module | `js/ui/dashboard.js` | Stats cards, TDEE display |
| `Chart` | Module | `js/ui/chart.js` | TDEE history visualization |
| `Components` | Module | `js/ui/components.js` | Shared utilities, modals, theme |
| `SyncDebug` | Module | `js/sync.js` | Debug utilities (dev mode) |

---

## 10. Conventions

**Module Pattern**: IIFE with `'use strict';`, exposed globals (`Calculator`, `Storage`, etc.)
**Script Order**: HTML defines dependencies (utils → calculator → storage → ui → app)
**Naming**: camelCase files (`dailyEntry.js`), descriptive function names
**Constants**: UPPERCASE at module top (`CALORIES_PER_KG = 7716`)
**Comments**: JSDoc-style for functions, inline for complex logic

**Script Load Order** (enforced in `index.html`):
1. `utils.js` — date helpers (no dependencies)
2. `calculator.js` — uses Utils
3. `storage.js` — uses Calculator, Utils
4. `sync.js`, `auth.js` — Supabase modules
5. `ui/*.js` — uses all above
6. `app.js` — initializes everything

---

## 11. Anti-Patterns (This Project)

- ❌ **DO NOT** introduce build tools (Webpack/Vite) unless explicitly requested
- ❌ **DO NOT** use ES6 modules (`import`/`export`) — breaks script loading
- ❌ **DO NOT** add npm dependencies — zero-dependency policy
- ❌ **DO NOT** suppress type errors — fix floating-point precision (`0.1 + 0.2 = 0.3`)
- ❌ **DO NOT** skip tests — always run `node tests/node-test.js` before commit
- ❌ **DO NOT** use browser dev tools for debugging — rely on automated tests
- ❌ **DO NOT** forget to commit — commit after every atomic change
- ❌ **DO NOT** call `Storage.saveEntry()` directly — use `Sync.saveWeightEntry()`
- ❌ **DO NOT** bypass sync queue — breaks offline support
- ❌ **DO NOT** sync without checking auth — RLS will reject
- ❌ **DO NOT** deploy without incrementing `CACHE_VERSION` in `sw.js` and `js/version.js`
- ❌ **DO NOT** forget to update both files — version mismatch causes issues
- ❌ **DO NOT** save entries without weight validation — violates DB constraint (Fix #1)
- ❌ **DO NOT** delete entries without ID validation — queues invalid operations (Fix #2)
- ❌ **DO NOT** check auth with getCurrentUser() — use getSession() instead (Fix #3)
- ❌ **DO NOT** clear data without clearing queue — orphaned operations (Fix #4)
- ❌ **DO NOT** import data without sync trigger — data never synced (Fix #5)

### Water Weight Detection (NEW in v3.1)

**Module**: `js/calculator-tdee.js` — `detectWaterWeight()` function

Water weight refers to rapid body weight fluctuations caused by glycogen-water binding, sodium, creatine, or carb refeeds. These are NOT fat/muscle changes and produce unreliable TDEE estimates.

**Detection Criteria** (based on Hall & Chow 2011, Kreitzman et al. 1992):
- Weight change >1 kg/week without calorie correlation
- Sudden swing >2 kg in 3 days (glycogen-water loading)
- Weight gain during calorie deficit (>0.3 kg/week while eating <2000 cal/day)
- Implied TDEE outside physiological bounds (800-5000 kcal)

**Behavior When Detected**:
- **Fast TDEE**: Returns `null`, sets `isWaterWeight: true`
- **Stable TDEE**: Returns `null`, sets `confidence: 'none'`
- Falls back to more stable calculation window

**Anti-Patterns**:
- ❌ **DO NOT** display TDEE when `isWaterWeight: true` — data is unreliable
- ❌ **DO NOT** ignore water weight flags in Fast TDEE results
- ❌ **DO NOT** treat rapid weight swings as fat/muscle change
- ❌ **DO NOT** calculate TDEE without checking `detectWaterWeight()` first

### ESLint (NEW in v3.0.1)

**Configuration**: `eslint.config.js` (flat config, ESLint v9+)

**Pre-commit**: Run `npx eslint js/` before every commit — must pass with 0 errors.

**Auto-fix**: Run `npx eslint js/ --fix` for auto-fixable issues.

**IIFE Pattern Support**: ESLint configured to allow:
- Unused catch params: `catch (_error) { }` (underscore prefix)
- Event handler params: `function onClick(event) { }` (event can be unused)
- Var hoisting: `var AppConstants;` declared before conditional assignment
- Return assignments: `return x = y` (common vanilla JS pattern)
- Deep nesting: max-depth 7 (for chart rendering)

**Anti-Patterns**:
- ❌ **DO NOT** ignore ESLint errors — fix before commit
- ❌ **DO NOT** disable rules without justification
- ❌ **DO NOT** use `.eslintrc.*` — only `eslint.config.js` (flat config)
- ❌ **DO NOT** add unused variables — prefix with `_` if intentionally unused

---

## 12. Unique Styles

**Floating-Point Obsession**: Always use `Calculator.round(value, 2)` for comparisons
**Conservative Gap Handling**: Exclude non-tracked days from TDEE calculations
**Hybrid History**: Chart uses Theoretical TDEE when calculated TDEE has low confidence
**Adaptive Smoothing**: Lower alpha (0.1) for volatile periods (CV > 2%)
**Test Parity**: Tests verify Excel calculation match (see `tests/calculator.test.js`)
**Optimistic UI**: LocalStorage first, sync in background
**Conflict Resolution**: Newest timestamp wins
**Debug Tools**: `SyncDebug.*` utilities for troubleshooting

---

## 13. Commands

```bash
# Run tests (Node.js)
node tests/node-test.js

# Run tests (browser)
open tests/test-runner.html

# Deploy to Cloudflare Pages
wrangler pages deploy . --project-name=tdee-tracker

# Check current version
cat sw.js | grep CACHE_VERSION
cat js/version.js | grep APP_VERSION

# Generate Supabase config
node scripts/generate-config.js

# Python scripting (data extraction)
python3 -m venv env
source venv/bin/activate
```

---

## 14. Key Formulas

**EWMA**: `current * 0.3 + previous * 0.7`
**TDEE**: `avgCalories + ((-weightDelta * 7716) / trackedDays)` (kg)
**Theoretical TDEE**: `Mifflin-St Jeor BMR × Activity Level`

### Enhanced Confidence Scoring (4-Factor Model)

Weighted score (0-100) mapped to tiers:

| Factor | Weight | Score Tiers | Purpose |
|--------|--------|-------------|---------|
| **Duration** | 40% | 100 (28+d), 85 (14-27d), 70 (7-13d), 40 (<7d) | Tracking duration adequacy |
| **Completeness** | 25% | 100 (≥85%), 75 (70-84%), 50 (<70%) | Data completeness ratio |
| **Volatility** | 20% | 100 (CV<0.2), 80 (0.2-0.3), 60 (>0.3) | Weight stability (CV) |
| **Weekend Coverage** | 15% | 100 (≥50%), 70 (<50%), 40 (0%) | Weekend tracking coverage |

**Water Weight Penalty**: -20 points when `isWaterWeight: true`

**Confidence Tiers**:
- **HIGH** (80-100): Trust for decision-making
- **MEDIUM** (60-79): Use with caution
- **LOW** (40-59): Preliminary estimate only
- **NONE** (<40): Insufficient data

**Formula**: `score = (duration × 0.40) + (completeness × 0.25) + (volatility × 0.20) + (weekend × 0.15) - waterWeightPenalty`

### Physiological Range Validation

All TDEE values validated against physiological bounds:
- **Minimum**: 800 kcal/day (below BMR, impossible)
- **Maximum**: 5000 kcal/day (superhuman, impossible)
- **Action**: Returns `null` if outside range

### Water Weight Detection

Based on Hall & Chow (2011), Kreitzman et al. (1992) — glycogen-water binding (1g glycogen : 3-4g water):
- Weight change >1 kg/week without calorie correlation
- Sudden swing >2 kg in 3 days
- Weight gain during calorie deficit (>0.3 kg/week, <2000 cal/day)
- Implied TDEE outside 800-5000 kcal bounds

---

## 15. Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `MIN_TRACKED_DAYS` | 4 | Minimum tracked days for valid TDEE |
| `CALORIES_PER_KG` | 7716 | Energy density (3500 cal/lb × 2.205) |
| `DEFAULT_ALPHA` | 0.3 | EWMA smoothing factor |
| `VOLATILE_ALPHA` | 0.1 | Reduced alpha for volatile periods |
| `OUTLIER_THRESHOLD` | 3 | Std devs for calorie outlier detection |
| `SYNC_INTERVAL` | 30000ms | Background sync interval |
| `MAX_RETRIES` | 3 | Max sync retry attempts |
| `CONFIDENCE_WEIGHTS.DURATION` | 0.40 | Duration factor weight (4-factor model) |
| `CONFIDENCE_WEIGHTS.COMPLETENESS` | 0.25 | Completeness factor weight |
| `CONFIDENCE_WEIGHTS.VOLATILITY` | 0.20 | Volatility factor weight (CV) |
| `CONFIDENCE_WEIGHTS.WEEKEND_COVERAGE` | 0.15 | Weekend coverage factor weight |
| `CONFIDENCE_SCORE_TIERS.HIGH` | 80 | Minimum score for HIGH confidence |
| `CONFIDENCE_SCORE_TIERS.MEDIUM` | 60 | Minimum score for MEDIUM confidence |
| `CONFIDENCE_SCORE_TIERS.LOW` | 40 | Minimum score for LOW confidence |
| `WATER_WEIGHT_PENALTY` | 20 | Points deducted when water weight detected |
| `PHYSIOLOGICAL_TDEE_MIN` | 800 | Minimum valid TDEE (kcal/day) |
| `PHYSIOLOGICAL_TDEE_MAX` | 5000 | Maximum valid TDEE (kcal/day) |

---

## 16. Troubleshooting Guide

### Sync Issues

**Data not syncing:**
```javascript
SyncDebug.status()
// Check: isAuthenticated, isOnline, pendingOperations
```

**Queue stuck:**
```javascript
SyncDebug.queue()        // View pending operations
SyncDebug.forceSync()    // Trigger immediate sync
```

**Null weight errors:**
```javascript
SyncDebug.filterQueue()  // Remove invalid operations
// Entries without weight saved locally only (not synced)
```

### Phase 1 Fixes (2026-03-16)

**Weight validation failing:**
```javascript
// Check entry has valid weight
await Sync.saveWeightEntry({ date: '2026-03-16', weight: 80.5 })
// If fails, check weight is numeric and not null/undefined
```

**ID validation failing:**
```javascript
// Check ID is valid string
await Sync.deleteWeightEntry('valid-id-123')
// If fails, check ID is not null/empty/whitespace
```

**Auth race condition:**
```javascript
// Use getSession() instead of getCurrentUser()
const { session } = await Auth.getSession()
if (session && session.user) { /* authenticated */ }
```

**Queue not clearing:**
```javascript
// Clear queue before clearing storage
if (window.Sync) Sync.clearQueue()
Storage.clearAll()
```

**Import not syncing:**
```javascript
// Trigger sync after import
if (Auth.isAuthenticated()) Sync.syncAll()
```

### Auth Issues

**Login not working:**
1. Check Supabase config in `js/config.js`
2. Verify RLS policies in Supabase dashboard
3. Check browser console for auth errors

**Session expired:**
- Supabase client auto-refreshes tokens
- If still failing, re-login

### Test Failures

**Run tests locally:**
```bash
node tests/node-test.js
# Reproduces CI test environment
```

**CSP validation failing:**
- Check `<meta http-equiv="Content-Security-Policy">` in `index.html`
- Required directives: `script-src`, `connect-src`, `style-src`, `img-src`

### TDEE Calculation Issues

**Impossible TDEE values (<800 or >5000 kcal):**
```javascript
// Check if calculatePeriodTDEE() has physiological validation
// Should return null for values outside 800-5000 kcal range
// If not, add validation before return statement
```

**Water weight detected (TDEE returns null):**
```javascript
// Check detectWaterWeight() result
// Common causes: creatine loading, sodium spikes, carb refeeds
// Solution: Wait for stable data, rely on Stable TDEE (14-day)
```

**Low confidence scores:**
- Check completeness ratio (need ≥85% for max score)
- Check weight volatility (CV >0.3 reduces score)
- Check weekend coverage (need ≥50% weekend days)
- Check for water weight penalty (-20 points)

### Deployment Issues

**See Deployment Troubleshooting** (Section 5) or `DEPLOYMENT.md`

---

## 17. Version History

| Version | Date | Changes |
|---------|------|---------|
| **v3.0.1** | 2026-03-16 | Phase 1 critical fixes: validation, race conditions, sync queue |
| **v3.0** | 2026-03-13 | Supabase sync, Auth, CI/CD, 155+ tests, Context System |
| **v2.0** | 2026-02-26 | 80+ tests, Cloudflare Pages deployment, PWA |
| **v1.0** | 2026-01-15 | Initial release, LocalStorage only |

---

## 18. Notes

- **GEMINI.md**: Deprecated, kept for backward compatibility
- **CSS `!important`**: 4 instances in `styles.css` — technical debt, avoid adding more
- **Test naming**: Inconsistent (`.test.js` vs `test-*.js`) — normalize when refactoring
- **`.tmp/`**: Build artifacts, should be `.gitignore`d
- **calculator.js:412**: NOTE comment about day index mapping — verify if improvement needed
- **No LSP**: TypeScript language server not installed — rely on tests for validation

---

**Last Updated**: 2026-03-16  
**Version**: 3.0.1  
**Tests**: 155+ passing  
**Dependencies**: 0
