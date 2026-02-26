# JavaScript Core Modules

> TDEE calculation engine, storage, and utilities. Vanilla ES6+ with IIFE modules.

## Overview

**Files**: 4 core modules (calculator, storage, utils, app) + 6 UI components.
**Pattern**: IIFE modules exposing globals (`Calculator`, `Storage`, `Utils`, `App`).
**Dependencies**: None — pure vanilla JS, loaded via `<script>` tags in HTML.

## Structure

```
js/
├── app.js            # Init coordinator (56 lines)
├── calculator.js     # TDEE engine: EWMA, regression, confidence (774 lines)
├── storage.js        # LocalStorage wrapper, import/export (457 lines)
├── utils.js          # Date/validation helpers (373 lines)
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
- **Line count**: 774 lines (largest file) — complexity hotspot
- **No LSP**: TypeScript language server not installed — rely on tests for validation
