<!-- Context: agent/guidelines | Priority: critical | Version: 2.0 | Updated: 2026-02-26 -->

# TDEE Tracker — Agent Knowledge Base

> Comprehensive guidelines for AI agents. Vanilla JS PWA, zero dependencies.

## Overview

**Stack**: Vanilla ES6+ JavaScript, LocalStorage, PWA (offline-first). **Zero npm dependencies**.
**Architecture**: IIFE modules, manual script loading, `js/app.js` as coordinator.
**Testing**: Custom test framework (80+ tests), dual runners (Node.js + browser).

## Structure

```
.
├── index.html          # Main app (17k lines, script loading order = dependency graph)
├── js/
│   ├── calculator.js   # Core math: EWMA, TDEE, gap handling (774 lines)
│   ├── storage.js      # LocalStorage wrapper, import/export (457 lines)
│   ├── utils.js        # Date helpers, validation (373 lines)
│   └── ui/             # UI components (6 files, ~1.5k lines total)
├── tests/              # Custom test framework, 80+ tests
├── css/styles.css      # All styles (2.2k lines)
└── sw.js               # Service worker (PWA)
```

## Where to Look

| Task | Location | Notes |
|------|----------|-------|
| TDEE algorithms | `js/calculator.js` | EWMA, regression, outlier detection |
| Storage logic | `js/storage.js` | LocalStorage, import/export JSON |
| Date utilities | `js/utils.js` | Date parsing, validation, formatting |
| UI components | `js/ui/*.js` | Dashboard, chart, entries, settings |
| Test suite | `tests/` | Run: `node tests/node-test.js` |
| Algorithms doc | `.opencode/context/project/tdee-algorithms.md` | Detailed specs |

## Code Map

| Symbol | Type | File | Purpose |
|--------|------|------|---------|
| `Calculator` | Module | `js/calculator.js` | Core TDEE engine (EWMA, regression, confidence) |
| `Storage` | Module | `js/storage.js` | LocalStorage persistence |
| `Utils` | Module | `js/utils.js` | Date/validation helpers |
| `App` | Module | `js/app.js` | Initialization coordinator |
| `Dashboard` | Module | `js/ui/dashboard.js` | Stats cards, TDEE display |
| `Chart` | Module | `js/ui/chart.js` | TDEE history visualization |

## Conventions

**Module Pattern**: IIFE with `'use strict';`, exposed globals (`Calculator`, `Storage`, etc.)
**Script Order**: HTML defines dependencies (utils → calculator → storage → ui → app)
**Naming**: camelCase files (`dailyEntry.js`), descriptive function names
**Constants**: UPPERCASE at module top (`CALORIES_PER_KG = 7716`)
**Comments**: JSDoc-style for functions, inline for complex logic

## Anti-Patterns (This Project)

- ❌ **DO NOT** introduce build tools (Webpack/Vite) unless explicitly requested
- ❌ **DO NOT** use ES6 modules (`import`/`export`) — breaks script loading
- ❌ **DO NOT** add npm dependencies — zero-dependency policy
- ❌ **DO NOT** suppress type errors — fix floating-point precision (`0.1 + 0.2 = 0.3`)
- ❌ **DO NOT** skip tests — always run `node tests/node-test.js` before commit
- ❌ **DO NOT** use browser dev tools for debugging — rely on automated tests

## Unique Styles

**Floating-Point Obsession**: Always use `Calculator.round(value, 2)` for comparisons
**Conservative Gap Handling**: Exclude non-tracked days from TDEE calculations
**Hybrid History**: Chart uses Theoretical TDEE when calculated TDEE has low confidence
**Adaptive Smoothing**: Lower alpha (0.1) for volatile periods (CV > 2%)
**Test Parity**: Tests verify Excel calculation match (see `tests/calculator.test.js`)

## Commands

```bash
# Run tests (Node.js)
node tests/node-test.js

# Run tests (browser)
open tests/test-runner.html

# Python scripting (data extraction)
python3 -m venv env
source venv/bin/activate
```

## Key Formulas

**EWMA**: `current * 0.3 + previous * 0.7`
**TDEE**: `avgCalories + ((-weightDelta * 7716) / trackedDays)` (kg)
**Confidence**: High (6+ days, ±5%), Medium (4-5 days, ±10%), Low (<4 days)

## Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `MIN_TRACKED_DAYS` | 4 | Minimum tracked days for valid TDEE |
| `CALORIES_PER_KG` | 7716 | Energy density (3500 cal/lb × 2.205) |
| `DEFAULT_ALPHA` | 0.3 | EWMA smoothing factor |
| `VOLATILE_ALPHA` | 0.1 | Reduced alpha for volatile periods |
| `OUTLIER_THRESHOLD` | 3 | Std devs for calorie outlier detection |

## Notes

- **GEMINI.md**: Deprecated, kept for backward compatibility
- **CSS `!important`**: 4 instances in `styles.css` — technical debt, avoid adding more
- **Test naming**: Inconsistent (`.test.js` vs `test-*.js`) — normalize when refactoring
- **`.tmp/`**: Build artifacts, should be `.gitignore`d
