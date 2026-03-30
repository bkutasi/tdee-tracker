# P3 Low Priority — Backlog Plan

**Priority**: LOW (Nice to have, no urgency)  
**Estimated Time**: 12-15 hours (can be spread over months)  
**Risk Level**: NONE (Pure improvements, no bugs)  
**Dependencies**: P0, P1, P2 should be complete first  

---

## Executive Summary

**15 backlog improvements** for polish, documentation, and long-term maintainability:

1. Test file naming inconsistency
2. No performance benchmarks
3. Limited accessibility tests
4. Complex function refactoring
5. Untested helper functions
6. No central constants module
7. Generic error messages
8. Missing JSDoc examples
9. No typedefs for complex objects
10. No sync timeout
11. Fixed retry interval (not exponential)
12. No sync progress indicator
13. No critical CSS extraction
14. No SRI hashes for CDN
15. No Lighthouse CI

**Impact**: Developer experience, documentation, polish

---

## Prerequisites

```bash
# P0, P1, P2 should be complete first
git checkout master
git pull origin master

# Create feature branch
git checkout -b feat/p3-backlog

# Can tackle these incrementally
# Each item is independent
```

---

## Item P3-1: Standardize Test File Naming (30 minutes)

**Problem**: Inconsistent naming (`*.test.js` vs `test-*.js`)

### Current State

```bash
# Inconsistent naming
tests/calculator.test.js      # ✓ Consistent
tests/utils.test.js           # ✓ Consistent
tests/test-date-validation.js # ✗ Inconsistent
tests/theme-storage.test.js   # ✓ Consistent
tests/test-sync-browser.js    # ✗ Inconsistent
```

### Implementation

Rename to consistent pattern:

```bash
# Rename files
git mv tests/test-date-validation.js tests/date-validation.test.js
git mv tests/test-sync-browser.js tests/sync-browser.test.js
git mv tests/test-runner.html tests/browser-runner.html  # Special case
```

### Update references

Edit `tests/node-test.js`, update file list:

```javascript
const testFiles = [
    'tests/calculator.test.js',
    'tests/utils.test.js',
    'tests/date-validation.test.js',  // Updated
    'tests/storage.test.js',
    'tests/sync.test.js',
    'tests/sync-browser.test.js',     // Updated
];
```

### Verification

```bash
# List test files
ls tests/*.test.js

# Should all follow *.test.js pattern
```

### Git Commit

```bash
git add tests/
git commit -m "chore(p3): standardize test file naming

- Rename test-*.js to *.test.js
- Consistent naming convention
- Easier to grep for tests
- No functional changes"
```

---

## Item P3-2: Add Performance Benchmarks (1 hour)

**Problem**: No baseline for regression detection

### Create Benchmark Suite

Create `tests/benchmarks/chart-benchmark.js`:

```javascript
'use strict';

/**
 * Chart rendering benchmark
 * Measures time to render chart with varying data sizes
 */

const BENCHMARK_SIZES = [10, 50, 100, 500, 1000];

function benchmarkChartRender() {
    const results = [];
    
    BENCHMARK_SIZES.forEach(size => {
        // Generate test data
        const entries = [];
        for (let i = 0; i < size; i++) {
            entries.push({
                date: `2026-01-${String(i % 31).padStart(2, '0')}`,
                weight: 80 + Math.random() * 5,
                calories: 2000 + Math.random() * 500
            });
        }
        
        // Measure render time
        const startTime = performance.now();
        Chart.render(entries);
        const endTime = performance.now();
        
        results.push({
            size,
            duration: endTime - startTime,
            timestamp: new Date().toISOString()
        });
    });
    
    return results;
}

// Run benchmarks
const results = benchmarkChartRender();
console.table(results);

// Assert performance budgets
results.forEach(result => {
    const budget = result.size * 2;  // 2ms per entry budget
    if (result.duration > budget) {
        console.error(`PERF REGRESSION: ${result.size} entries took ${result.duration}ms (budget: ${budget}ms)`);
    }
});
```

### Add to test runner

Edit `tests/node-test.js`:

```javascript
// Add benchmark task
if (process.argv.includes('--benchmark')) {
    require('./benchmarks/chart-benchmark.js');
    return;
}
```

### Run benchmarks

```bash
# Run benchmarks
node tests/node-test.js --benchmark

# Should see output like:
# ┌─────────┬──────┬──────────┬─────────────────────┐
# │ (index) │ size │ duration │ timestamp           │
# ├─────────┼──────┼──────────┼─────────────────────┤
# │ 0       │ 10   │ 15.2     │ '2026-03-30T...'    │
# │ 1       │ 50   │ 42.8     │ '2026-03-30T...'    │
# │ 2       │ 100  │ 89.1     │ '2026-03-30T...'    │
```

### Store baseline

Create `tests/benchmarks/baseline.json`:

```json
{
    "chart-render": {
        "10-entries": { "max-ms": 20 },
        "50-entries": { "max-ms": 100 },
        "100-entries": { "max-ms": 200 },
        "500-entries": { "max-ms": 1000 },
        "1000-entries": { "max-ms": 2000 }
    }
}
```

### Git Commit

```bash
git add tests/benchmarks/
git commit -m "test(p3): add chart rendering benchmarks

- Benchmark with 10-1000 entries
- Performance budgets (2ms per entry)
- Detect regressions automatically
- Store baseline for comparison"
```

---

## Item P3-3: Expand Accessibility Tests (2 hours)

**Problem**: Only modal tested, need full UI coverage

### Install axe-core

```bash
# Install accessibility testing library
npm install --save-dev axe-core
```

### Create A11y Test Suite

Create `tests/e2e/accessibility.spec.js`:

```javascript
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe('Accessibility Tests', () => {
    test('homepage should not have accessibility violations', async ({ page }) => {
        await page.goto('/');
        
        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
        
        expect(accessibilityScanResults.violations).toEqual([]);
    });
    
    test('modal should have focus trapping', async ({ page }) => {
        await page.goto('/');
        
        // Open modal
        await page.click('[data-testid="sign-in-button"]');
        
        // Check focus is in modal
        const focusedElement = await page.evaluate(() => document.activeElement.tagName);
        expect(focusedElement).toBe('BUTTON');  // Should be modal button
        
        // Tab through and check focus stays in modal
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        
        const stillInModal = await page.evaluate(() => {
            return document.activeElement.closest('.modal') !== null;
        });
        expect(stillInModal).toBe(true);
    });
    
    test('dashboard should have aria labels', async ({ page }) => {
        await page.goto('/');
        
        const tdeeCard = await page.$('[aria-label="TDEE"]');
        expect(tdeeCard).not.toBeNull();
        
        const weightCard = await page.$('[aria-label="Current Weight"]');
        expect(weightCard).not.toBeNull();
    });
    
    test('chart should be accessible', async ({ page }) => {
        await page.goto('/');
        
        const chart = await page.$('canvas[aria-label]');
        expect(chart).not.toBeNull();
    });
});
```

### Install Playwright A11y plugin

```bash
npm install --save-dev @axe-core/playwright
```

### Run A11y tests

```bash
npx playwright test tests/e2e/accessibility.spec.js

# Should see:
# ✓ Homepage accessibility
# ✓ Modal focus trapping
# ✓ ARIA labels
# ✓ Chart accessibility
```

### Git Commit

```bash
git add tests/e2e/accessibility.spec.js package.json
git commit -m "test(p3): expand accessibility tests

- Add axe-core for automated a11y testing
- Test homepage, modal, dashboard, chart
- Verify focus trapping, ARIA labels
- WCAG 2.1 AA compliance"
```

---

## Item P3-4: Refactor calculateStableTDEE() (1 hour)

**Problem**: 70-line function with 9 helpers → complexity

### Current State

```javascript
// js/calculator.js: ~70 lines
function calculateStableTDEE(entries) {
    // Helper 1
    function detectWeightGaps() { ... }
    // Helper 2
    function getEnergyDensity() { ... }
    // Helper 3
    function calculateCalorieAverageFallback() { ... }
    // ... 6 more helpers
    // Main logic interweaved with helpers
}
```

### Refactored Structure

```javascript
// Extract helpers to module-level functions
function detectWeightGaps(entries, minDays) {
    'use strict';
    // ... implementation ...
}

function getEnergyDensity(weightDeltaKg) {
    'use strict';
    return CALORIES_PER_KG;
}

function calculateCalorieAverageFallback(entries, outliers) {
    'use strict';
    // ... implementation ...
}

// Main function becomes orchestration
function calculateStableTDEE(entries) {
    'use strict';
    const gaps = detectWeightGaps(entries, MIN_TRACKED_DAYS);
    const energyDensity = getEnergyDensity(gaps.weightDelta);
    const avgCalories = calculateCalorieAverageFallback(entries, gaps.outliers);
    
    // ... rest of calculation ...
    
    return {
        tdee,
        confidence,
        reason
    };
}
```

### Add JSDoc to each function

```javascript
/**
 * Detect gaps in weight entries
 * @param {Array} entries - Sorted entries array
 * @param {number} minDays - Minimum tracked days
 * @returns {{validDays: number, weightDelta: number, outliers: Array}}
 */
function detectWeightGaps(entries, minDays) {
    // ...
}
```

### Verification

```bash
# Run tests
node tests/node-test.js

# Should see all calculator tests passing
# Code should be easier to read
```

### Git Commit

```bash
git add js/calculator.js
git commit -m "refactor(p3): extract calculateStableTDEE() helpers

- Move 9 helper functions to module level
- Main function becomes orchestration
- Add JSDoc to each helper
- Improves testability and readability"
```

---

## Item P3-5: Add Unit Tests for Helper Functions (1 hour)

**Problem**: `detectWeightGaps()`, `getEnergyDensity()`, etc. untested

### Add Tests

Edit `tests/calculator.test.js`:

```javascript
describe('detectWeightGaps', () => {
    it('identifies consecutive days', () => {
        const entries = [
            { date: '2026-03-01', weight: 80.5 },
            { date: '2026-03-02', weight: 80.3 },
            { date: '2026-03-03', weight: 80.1 }
        ];
        const result = detectWeightGaps(entries, 3);
        expect(result.validDays).toBe(3);
        expect(result.gaps).toHaveLength(0);
    });
    
    it('detects gaps in entries', () => {
        const entries = [
            { date: '2026-03-01', weight: 80.5 },
            { date: '2026-03-05', weight: 80.3 }  // 3-day gap
        ];
        const result = detectWeightGaps(entries, 2);
        expect(result.gaps).toHaveLength(1);
        expect(result.gaps[0].days).toBe(3);
    });
});

describe('getEnergyDensity', () => {
    it('returns CALORIES_PER_KG constant', () => {
        expect(getEnergyDensity(1)).toBe(7716);
        expect(getEnergyDensity(-1)).toBe(7716);
    });
});

describe('calculateCalorieAverageFallback', () => {
    it('excludes outliers from average', () => {
        const entries = [
            { calories: 2000 },
            { calories: 2100 },
            { calories: 10000 }  // Outlier
        ];
        const outliers = [2];  // Index of outlier
        const avg = calculateCalorieAverageFallback(entries, outliers);
        expect(avg).toBe(2050);  // (2000 + 2100) / 2
    });
});
```

### Verification

```bash
# Run tests
node tests/node-test.js

# Should see new helper function tests passing
# Coverage should increase
```

### Git Commit

```bash
git add tests/calculator.test.js
git commit -m "test(p3): add unit tests for helper functions

- Test detectWeightGaps(), getEnergyDensity()
- Test calculateCalorieAverageFallback()
- Cover gap detection, outlier exclusion
- Increases test coverage"
```

---

## Item P3-6: Create constants.js Module (30 minutes)

**Problem**: Shared constants duplicated across files

### Note

This was already done in P2-7. Verify constants exist:

```bash
# Check constants file
cat js/constants.js

# Should see AppConstants with all constants
```

If not present, apply P2-7 fix.

### Git Commit

```bash
# Already done in P2, no commit needed
```

---

## Item P3-7: Enhance Error Messages (30 minutes)

**Problem**: Generic messages lack context for debugging

### Current State

```javascript
// Generic
throw new Error('Invalid entry');

// Better
throw new Error(`Invalid entry: expected weight to be number, got ${typeof weight}`);
```

### Implementation

Edit `js/sync.js`, enhance error messages:

```javascript
// OLD
if (!entry.weight) {
    throw new Error('Weight is required');
}

// NEW
if (!entry.weight) {
    throw new Error(
        `Invalid entry: weight is required. ` +
        `Got: weight=${entry.weight}, date=${entry.date}`
    );
}
```

### Edit `js/storage.js`:

```javascript
// OLD
if (!date) {
    throw new Error('Invalid date');
}

// NEW
if (!date) {
    throw new Error(
        `Storage.deleteEntry: Invalid date parameter. ` +
        `Expected: string (YYYY-MM-DD), Got: ${typeof date}`
    );
}
```

### Verification

```bash
# Manual test:
# 1. Trigger error in browser
# 2. Check console message
# 3. Should include actual values
# 4. Easier to debug
```

### Git Commit

```bash
git add js/sync.js js/storage.js
git commit -m "chore(p3): enhance error messages with context

- Include actual values in error messages
- Show expected vs received types
- Easier debugging and troubleshooting
- No functional changes"
```

---

## Item P3-8: Add JSDoc @example Tags (1 hour)

**Problem**: Usage unclear for complex functions

### Implementation

Edit `js/calculator.js`, add examples:

```javascript
/**
 * Calculate TDEE from weight entries
 * 
 * @param {Array} entries - Sorted array of weight entries
 * @param {Object} options - Calculation options
 * @param {number} options.alpha - EWMA smoothing factor (default: 0.3)
 * @param {number} options.minDays - Minimum tracked days (default: 4)
 * @returns {{tdee: number|null, confidence: string, reason: string}}
 * 
 * @example
 * const entries = [
 *   { date: '2026-03-01', weight: 80.5, calories: 2000 },
 *   { date: '2026-03-02', weight: 80.3, calories: 2100 }
 * ];
 * const result = Calculator.calculateTDEE(entries);
 * // { tdee: 2450, confidence: 'HIGH', reason: '6 days tracked' }
 * 
 * @example
 * // With custom options
 * const result = Calculator.calculateTDEE(entries, { alpha: 0.1, minDays: 7 });
 */
function calculateTDEE(entries, options = {}) {
    // ...
}
```

### Apply to all public functions

- `Calculator.calculateTDEE()`
- `Calculator.calculateEWMA()`
- `Storage.saveEntry()`
- `Sync.saveWeightEntry()`
- `Utils.parseDate()`

### Verification

```bash
# Hover over functions in editor
# Should see @example in tooltip
# Examples should be copy-paste runnable
```

### Git Commit

```bash
git add js/calculator.js js/storage.js js/sync.js js/utils.js
git commit -m "docs(p3): add JSDoc @example tags

- Add usage examples to all public functions
- Copy-paste runnable code snippets
- Improves developer onboarding
- No functional changes"
```

---

## Item P3-9: Use Typedef for Complex Objects (1 hour)

**Problem**: Object structures undocumented

### Implementation

Edit `js/calculator.js`, add typedefs:

```javascript
/**
 * @typedef {Object} WeightEntry
 * @property {string} date - ISO date (YYYY-MM-DD)
 * @property {number} weight - Weight in kg
 * @property {number} calories - Daily calorie intake
 * @property {number} [timestamp] - Unix timestamp (optional)
 */

/**
 * @typedef {Object} TDEEResult
 * @property {number|null} tdee - Calculated TDEE or null
 * @property {'HIGH'|'MEDIUM'|'LOW'} confidence - Confidence level
 * @property {string} reason - Explanation of calculation
 * @property {number} [ewma] - EWMA value (optional)
 * @property {number} [trackedDays] - Number of tracked days (optional)
 */

/**
 * @typedef {Object} SyncStatus
 * @property {boolean} isOnline - Network connectivity
 * @property {boolean} isAuthenticated - User logged in
 * @property {number} pendingOperations - Queue length
 * @property {string|null} lastSyncTime - Last sync timestamp
 * @property {Array} errors - Recent error messages
 */
```

### Use in function signatures

```javascript
/**
 * Calculate TDEE
 * @param {WeightEntry[]} entries - Entries to process
 * @returns {TDEEResult} Calculation result
 */
function calculateTDEE(entries) {
    // ...
}
```

### Verification

```bash
# Editor should show type hints
# Hover over function → see typedef structure
# Autocomplete should suggest properties
```

### Git Commit

```bash
git add js/calculator.js js/sync.js js/storage.js
git commit -m "docs(p3): add JSDoc typedefs for complex objects

- Define WeightEntry, TDEEResult, SyncStatus
- Improves IDE autocomplete and type hints
- Documents object structures
- No functional changes"
```

---

## Item P3-10: Add Sync Timeout (15 minutes)

**Problem**: Potential hanging on slow networks

### Implementation

Edit `js/sync.js`, add timeout to `syncAll()`:

```javascript
/**
 * Sync all pending operations with timeout
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function syncAll() {
    'use strict';
    const TIMEOUT_MS = 30000;  // 30 seconds
    
    const syncPromise = (async () => {
        // ... existing sync logic ...
    })();
    
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Sync timeout after 30s')), TIMEOUT_MS);
    });
    
    try {
        return await Promise.race([syncPromise, timeoutPromise]);
    } catch (error) {
        if (error.message.includes('timeout')) {
            console.error('Sync timed out:', error);
            return { success: false, error: 'Sync timed out. Please check connection.' };
        }
        throw error;
    }
}
```

### Verification

```bash
# Manual test:
# 1. Throttle network to Slow 3G (DevTools)
# 2. Trigger sync
# 3. Should timeout after 30s
# 4. Should show user-friendly error
```

### Git Commit

```bash
git add js/sync.js
git commit -m "feat(p3): add 30s timeout to syncAll()

- Prevent hanging on slow networks
- Promise.race() with timeout
- User-friendly timeout error message
- Improves reliability"
```

---

## Item P3-11: Exponential Backoff for Retries (30 minutes)

**Problem**: Fixed retry interval (suboptimal for transient failures)

### Current State

```javascript
// Fixed retry
for (let i = 0; i < MAX_RETRIES; i++) {
    try {
        await syncOperation();
        break;
    } catch (error) {
        await sleep(1000);  // Fixed 1s delay
    }
}
```

### Implementation

Edit `js/sync.js`, add exponential backoff:

```javascript
/**
 * Sleep with exponential backoff
 * @param {number} attempt - Attempt number (0-indexed)
 * @returns {Promise<void>}
 */
function sleepWithBackoff(attempt) {
    'use strict';
    const baseDelay = 1000;  // 1 second
    const maxDelay = 30000;  // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    
    return new Promise(resolve => setTimeout(resolve, delay));
}

// Usage in retry loop
for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
        await syncOperation();
        break;
    } catch (error) {
        if (attempt === MAX_RETRIES - 1) throw error;  // Last attempt
        await sleepWithBackoff(attempt);  // 1s, 2s, 4s, 8s, 16s
    }
}
```

### Verification

```bash
# Manual test:
# 1. Disconnect network
# 2. Trigger sync
# 3. Watch console for retry delays
# 4. Should see 1s, 2s, 4s, 8s delays
```

### Git Commit

```bash
git add js/sync.js
git commit -m "feat(p3): implement exponential backoff for retries

- Retry delays: 1s, 2s, 4s, 8s, 16s (capped at 30s)
- Better handling of transient failures
- Reduces server load during outages
- Industry standard pattern"
```

---

## Item P3-12: Sync Progress Indicator (30 minutes)

**Problem**: No feedback on large queues

### Implementation

Add progress callback to `syncAll()`:

```javascript
/**
 * Sync all with progress callback
 * @param {Function} onProgress - Callback with progress updates
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function syncAll(onProgress) {
    'use strict';
    const queue = getPendingOperations();
    const total = queue.length;
    let completed = 0;
    
    for (const operation of queue) {
        try {
            await executeOperation(operation);
            completed++;
            
            if (onProgress) {
                onProgress({
                    completed,
                    total,
                    percentage: Math.round((completed / total) * 100)
                });
            }
        } catch (error) {
            // ... error handling ...
        }
    }
}
```

### Update UI to show progress

Edit `js/ui/settings.js`:

```javascript
// Show sync progress
Sync.syncAll((progress) => {
    const progressBar = document.getElementById('sync-progress');
    if (progressBar) {
        progressBar.value = progress.percentage;
        progressBar.textContent = `Syncing: ${progress.completed}/${progress.total} (${progress.percentage}%)`;
    }
});
```

### Add progress bar to HTML

Edit `index.html`:

```html
<!-- Add to sync status area -->
<progress id="sync-progress" max="100" value="0" style="display:none;"></progress>
```

### Verification

```bash
# Manual test:
# 1. Queue 10+ operations
# 2. Trigger sync
# 3. Should see progress bar update
# 4. Shows percentage and count
```

### Git Commit

```bash
git add js/sync.js js/ui/settings.js index.html
git commit -m "feat(p3): add sync progress indicator

- Progress callback with percentage
- UI shows sync progress bar
- Better UX for large queues
- Users know sync is working"
```

---

## Item P3-13: Critical CSS Extraction (1 hour)

**Problem**: FCP delayed by full CSS load

### Implementation

Extract critical CSS for inline:

```bash
# Install critical CSS tool
npm install --save-dev critters

# Extract critical CSS
npx critters index.html --inline --output dist/
```

### Manual Approach

Edit `index.html`, add critical CSS inline:

```html
<head>
    <!-- Critical CSS (above-the-fold) -->
    <style>
        /* Inline critical styles */
        body { font-family: system-ui; margin: 0; }
        .header { padding: 1rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
        /* ... more critical styles ... */
    </style>
    
    <!-- Non-critical CSS (lazy loaded) -->
    <link rel="preload" href="css/styles.css" as="style" onload="this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="css/styles.css"></noscript>
</head>
```

### Verification

```bash
# Manual test:
# 1. Open index.html
# 2. DevTools → Network tab
# 3. Should see inline CSS renders immediately
# 4. Full CSS loads asynchronously
# 5. FCP should be faster
```

### Git Commit

```bash
git add index.html
git commit -m "perf(p3): inline critical CSS

- Extract above-the-fold styles
- Lazy load full stylesheet
- Faster First Contentful Paint
- Improved perceived performance"
```

---

## Item P3-14: Add SRI Hashes for CDN Resources (15 minutes)

**Problem**: CDN compromise risk (no integrity check)

### Generate SRI Hash

```bash
# Download Supabase CDN script
curl -s https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.0/dist/umd/supabase.min.js | openssl dgst -sha384 -binary | openssl base64 -A

# Output: sha384-<hash>
```

### Add to index.html

```html
<!-- OLD - No integrity check -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.0/dist/umd/supabase.min.js"></script>

<!-- NEW - With SRI hash -->
<script 
    src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.0/dist/umd/supabase.min.js"
    integrity="sha384-<generated-hash>"
    crossorigin="anonymous"
></script>
```

### Verification

```bash
# Manual test:
# 1. Open index.html
# 2. DevTools → Console
# 3. Should see NO integrity errors
# 4. Script loads correctly
```

### Git Commit

```bash
git add index.html
git commit -m "security(p3): add SRI hashes for CDN resources

- integrity attribute on Supabase CDN script
- Prevents compromised CDN from injecting code
- crossorigin for proper error reporting
- Security best practice"
```

---

## Item P3-15: Performance Monitoring (2 hours)

**Problem**: No Lighthouse CI integration

### Install Lighthouse CI

```bash
npm install --save-dev @lhci/cli
```

### Create LHCI config

Create `.lighthouserc.js`:

```javascript
module.exports = {
    ci: {
        collect: {
            startServerCommand: 'npx serve . -p 8080',
            startServerReadyPattern: 'Accepting connections',
            url: ['http://localhost:8080'],
            numberOfRuns: 3
        },
        upload: {
            target: 'temporary-public-storage'
        },
        assert: {
            assertions: {
                'categories:performance': ['warn', { minScore: 0.9 }],
                'categories:accessibility': ['error', { minScore: 0.95 }],
                'categories:best-practices': ['warn', { minScore: 0.9 }],
                'categories:seo': ['warn', { minScore: 0.9 }]
            }
        }
    }
};
```

### Add to CI/CD

Edit `.github/workflows/deploy.yml`:

```yaml
- name: Run Lighthouse CI
  run: npx lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### Run locally

```bash
# Run Lighthouse audit
npx lhci autorun

# Should see:
# - Server starts
# - Lighthouse runs 3 times
# - Scores reported
# - Assertions checked
```

### Verification

```bash
# Check Lighthouse report
# Should see:
# - Performance: 95+
# - Accessibility: 100
# - Best Practices: 100
# - SEO: 100
```

### Git Commit

```bash
git add .lighthouserc.js .github/workflows/deploy.yml package.json
git commit -m "ci(p3): add Lighthouse CI for performance monitoring

- Automated Lighthouse audits in CI/CD
- Performance budget: 90+ score
- Accessibility budget: 95+ score
- Temporary public report storage"
```

---

## Final Summary

### All P3 Items Complete

| Item | Status | Time |
|------|--------|------|
| P3-1 Test naming | ✓ | 30 min |
| P3-2 Benchmarks | ✓ | 1 hour |
| P3-3 A11y tests | ✓ | 2 hours |
| P3-4 Refactor | ✓ | 1 hour |
| P3-5 Helper tests | ✓ | 1 hour |
| P3-6 Constants | ✓ | 30 min |
| P3-7 Error messages | ✓ | 30 min |
| P3-8 JSDoc examples | ✓ | 1 hour |
| P3-9 Typedefs | ✓ | 1 hour |
| P3-10 Sync timeout | ✓ | 15 min |
| P3-11 Backoff | ✓ | 30 min |
| P3-12 Progress | ✓ | 30 min |
| P3-13 Critical CSS | ✓ | 1 hour |
| P3-14 SRI hashes | ✓ | 15 min |
| P3-15 Lighthouse CI | ✓ | 2 hours |

**Total**: ~12-15 hours

---

## Deployment

```bash
# Push to feature branch
git push origin feat/p3-backlog

# Create PR
gh pr create \
  --title "chore(p3): backlog improvements" \
  --body "15 polish improvements for DX, docs, performance"

# After merge, auto-deploys to Cloudflare Pages
```

---

**Estimated Total Time**: 12-15 hours (can be spread over months)  
**Priority**: LOW (No urgency, pure improvements)  
**All Plans Complete**: ✓ P0, ✓ P1, ✓ P2, ✓ P3
