# JavaScript Core Modules

> TDEE calculation engine, storage, utilities, and Supabase sync. Vanilla ES6+ with IIFE modules.

## Overview

**Files**: 5 core modules (calculator, storage, utils, app, sync) + 6 UI components.
**Pattern**: IIFE modules exposing globals (`Calculator`, `Storage`, `Utils`, `App`, `Sync`, `Auth`).
**Dependencies**: None — pure vanilla JS, loaded via `<script>` tags in HTML.
**External**: Supabase JS client (loaded from CDN, pinned v2.47.0)

## Structure

```
js/
├── app.js            # Init coordinator (85 lines)
├── calculator.js     # TDEE engine: EWMA, regression, confidence (875 lines)
├── storage.js        # LocalStorage wrapper, import/export (510 lines)
├── utils.js          # Date/validation helpers (373 lines)
├── sync.js           # Supabase sync: offline-first, queue, merge (1050 lines)
├── auth.js           # Supabase Auth: magic link, OAuth, session (387 lines)
└── ui/               # UI components (see js/ui/AGENTS.md)
```

## Where to Look

| Task | File | Key Functions |
|------|------|---------------|
| EWMA smoothing | `calculator.js` | `calculateEWMA`, `getAdaptiveAlpha` |
| TDEE calculation | `calculator.js` | `calculateTDEE`, `calculateFastTDEE`, `calculateStableTDEE` |
| Weight delta | `calculator.js` | `calculateEWMAWeightDelta`, `calculateSlope` |
| Outlier detection | `calculator.js` | `excludeCalorieOutliers`, `calculateStats` |
| LocalStorage | `storage.js` | `init`, `getEntries`, `addEntry`, `exportData` |
| Date validation | `utils.js` | `parseDate`, `isValidDate`, `formatDate` |
| App init | `app.js` | `init`, `registerKeyboardShortcuts` |
| **Supabase sync** | `sync.js` | `saveWeightEntry`, `syncAll`, `fetchWeightEntries`, `mergeEntries` |
| **Auth** | `auth.js` | `init`, `signInWithMagicLink`, `signOut`, `getSession` |
| **Debug sync** | `sync.js` | `SyncDebug.status()`, `SyncDebug.queue()`, `SyncDebug.forceSync()` |

## Code Map

| Symbol | File | Lines | Purpose |
|--------|------|-------|---------|
| `calculateEWMA` | `calculator.js:33` | 7 | Exponential moving average for weights |
| `calculateTDEE` | `calculator.js:66` | 11 | Energy balance TDEE formula |
| `getAdaptiveAlpha` | `calculator.js:46` | 9 | Volatility-based smoothing adjustment |
| `calculateFastTDEE` | `calculator.js:180` | 25 | 7-day reactive TDEE |
| `calculateStableTDEE` | `calculator.js:210` | 30 | 14-day regression TDEE |
| `Storage.init` | `storage.js:20` | 15 | Initialize localStorage schema |
| `Storage.addEntry` | `storage.js:80` | 20 | Add/update daily entry |
| `Utils.parseDate` | `utils.js:25` | 12 | ISO date parsing with validation |

## Conventions

**Module Pattern**:
```javascript
const Calculator = (function () {
    'use strict';
    
    const CONSTANT = value;
    
    function internalHelper() { }
    
    function publicAPI() { }
    
    return { publicAPI };
})();
```

**Script Load Order** (enforced in `index.html`):
1. `utils.js` — date helpers (no dependencies)
2. `calculator.js` — uses Utils
3. `storage.js` — uses Calculator, Utils
4. `ui/*.js` — uses all above
5. `app.js` — initializes everything

**Constants**: UPPERCASE at module top, before functions.
**JSDoc**: Required for all public functions (params, returns, types).

## Anti-Patterns

- ❌ **DO NOT** use `import`/`export` — breaks script loading
- ❌ **DO NOT** add dependencies — zero npm packages
- ❌ **DO NOT** skip `Calculator.round()` — floating-point precision critical
- ❌ **DO NOT** change script order — breaks dependency chain
- ❌ **DO NOT** use `localStorage` directly — always use `Storage` module

## Unique Styles

**Floating-Point Safety**:
```javascript
// ALWAYS round results
const tdee = Calculator.round(avgCalories + deficit, 0);
const weight = Calculator.round(ewma, 2);

// NEVER compare floats directly
if (Calculator.round(a - b, 2) === 0) { }  // Correct
if (a - b === 0) { }  // Wrong
```

**Conservative Gap Handling**:
```javascript
// Non-tracked days EXCLUDED from TDEE calculation
// Only days with BOTH weight AND calories count
const trackedDays = entries.filter(e => e.calories && e.weight).length;
```

**Adaptive Smoothing**:
```javascript
// Volatile periods (CV > 2%) → lower alpha (0.1)
// Stable periods → default alpha (0.3)
const alpha = getAdaptiveAlpha(recentWeights);
```

## Constants

| Constant | File | Value | Purpose |
|----------|------|-------|---------|
| `CALORIES_PER_KG` | `calculator.js:17` | 7716 | Energy density (3500 × 2.205) |
| `DEFAULT_ALPHA` | `calculator.js:19` | 0.3 | EWMA smoothing factor |
| `VOLATILE_ALPHA` | `calculator.js:20` | 0.1 | Reduced alpha for volatility |
| `MIN_TRACKED_DAYS` | `calculator.js:23` | 4 | Minimum for valid TDEE |
| `OUTLIER_THRESHOLD` | `calculator.js:21` | 3 | Std devs for outlier detection |

## Testing

```bash
# Run all tests
node tests/node-test.js

# Calculator-specific tests
# See tests/calculator.test.js (13 describe blocks)
# See tests/calculator_bmr.test.js (BMR calculations)
```

**Test Coverage**:
- EWMA calculations (Excel parity verified)
- TDEE formulas (maintenance, deficit, surplus scenarios)
- Floating-point edge cases (`0.1 + 0.2 = 0.3`)
- Gap handling (missing days, partial data)
- Outlier detection (cheat day filtering)

## Notes

- **calculator.js:412**: NOTE comment about day index mapping — verify if improvement needed
- **Line count**: 875 lines (largest file) — complexity hotspot
- **No LSP**: TypeScript language server not installed — rely on tests for validation

---

## Supabase Sync Architecture

### Overview

**Sync Module** (`sync.js`): Offline-first data synchronization between LocalStorage and Supabase.

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
```

### Auth Integration

**Auth Module** (`auth.js`): Supabase authentication wrapper.

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

### Testing

```bash
# Run all tests (109 tests pass)
node tests/node-test.js

# Sync-specific tests
# See tests/sync.test.js (35+ tests)
# See tests/sync-browser.test.js (20+ tests)
```

**Test Coverage:**
- Queue operations (create, persist, clear, load)
- Sync execution (save, update, delete)
- Merge logic (conflict resolution, timestamp comparison)
- Auth integration (SIGNED_IN/SIGNED_OUT events)
- Error handling (retry logic, error history)
- Debug utilities (getStatus, getQueue, getErrorHistory)

### Constants

| Constant | File | Value | Purpose |
|----------|------|-------|---------|
| `SYNC_INTERVAL` | `sync.js:28` | 30000ms | Background sync interval |
| `MAX_RETRIES` | `sync.js` | 3 | Max sync retry attempts |
| `DEBUG_MODE` | `sync.js` | localhost | Enable debug logging |

### Anti-Patterns

- ❌ **DO NOT** call `Storage.saveEntry()` directly for user entries — use `Sync.saveWeightEntry()`
- ❌ **DO NOT** bypass sync queue — breaks offline support
- ❌ **DO NOT** sync without checking `canSync()` — wastes API calls
- ❌ **DO NOT** ignore sync errors — check `SyncDebug.errors()`
- ❌ **DO NOT** clear queue manually unless debugging — use `Sync.clearQueue()`

### Debugging

**Check sync status:**
```javascript
SyncDebug.status()
// Output: {
//   isOnline: true,
//   isAuthenticated: true,
//   pendingOperations: 0,
//   lastSyncTime: "2026-03-01T10:00:00.000Z",
//   errorCount: 0
// }
```

**View pending operations:**
```javascript
SyncDebug.queue()
// Output: [
//   {
//     id: "uuid",
//     type: "create",
//     table: "weight_entries",
//     data: { weight: 80.5, calories: 2200 },
//     timestamp: 1234567890,
//     retries: 0
//   }
// ]
```

**Force sync:**
```javascript
await SyncDebug.forceSync()
// Triggers immediate sync of all pending operations
```

**Common Issues:**

| Issue | Debug Command | Solution |
|-------|---------------|----------|
| Data not syncing | `SyncDebug.status()` | Check `isAuthenticated` and `isOnline` |
| Queue stuck | `SyncDebug.queue()` | Check for failed operations, use `SyncDebug.forceSync()` |
| Auth not working | `SyncDebug.status()` | Check `isAuthenticated`, re-login |
| Merge conflicts | `SyncDebug.info()` | Review conflict resolution (newest wins) |
| Errors | `SyncDebug.errors()` | Review error history, check Supabase RLS policies |

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
