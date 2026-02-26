# Test Suite

> Custom vanilla JS test framework. Dual runners: Node.js (fast) + browser (full integration).

## Overview

**Files**: 7 test files (80+ tests total).
**Framework**: 100% custom (zero dependencies), Jest-inspired syntax.
**Runners**: Node.js (`node-test.js`) + browser (`test-runner.html`).

## Structure

```
tests/
├── node-test.js          # Node.js runner (29 tests, 459 lines)
├── test-runner.html      # Browser runner (full suite)
├── calculator.test.js    # TDEE calculations (295 lines)
├── calculator_bmr.test.js # BMR formulas (107 lines)
├── storage.test.js       # LocalStorage operations (143 lines)
├── utils.test.js         # Date/validation helpers (173 lines)
├── test-date-validation.js # Date validation integration (222 lines)
└── syntax-check.js       # JS syntax validation (41 lines)
```

## Where to Look

| Task | File | Tests |
|------|------|-------|
| EWMA/TDEE tests | `calculator.test.js` | 13 describe blocks |
| BMR calculations | `calculator_bmr.test.js` | Mifflin-St Jeor validation |
| Storage operations | `storage.test.js` | 9 describe blocks |
| Date utilities | `utils.test.js` | 11 describe blocks |
| Date validation | `test-date-validation.js` | 26 integration tests |
| Quick checks | `node-test.js` | 29 sanity tests |

## Code Map

| Symbol | File | Purpose |
|--------|------|---------|
| `expect()` | `node-test.js:11` | Assertion helper (chainable matchers) |
| `test()` | `node-test.js:28` | Test runner with try/catch |
| `describe()` | `calculator.test.js:5` | Test suite grouping (browser) |
| `it()` | `calculator.test.js:10` | Individual test (browser) |

## Commands

```bash
# Run Node.js tests (fast, 29 tests)
node tests/node-test.js

# Run browser tests (full suite, 80+ tests)
open tests/test-runner.html

# Run via shell script
./run-tests.sh
```

## Conventions

**Test Naming** (INCONSISTENT — normalize when refactoring):
- `*.test.js` → Browser tests (Jest-style)
- `test-*.js` → Node.js standalone runners
- `node-test.js` → Hybrid runner

**Assertion Style**:
```javascript
// Node.js runner (limited matchers)
expect(Calculator.round(0.1 + 0.2, 2)).toBe(0.3);
expect(tdee).toBeNull();
expect(value).toBeCloseTo(3.14, 2);

// Browser runner (richer API)
expect(array).toContain(item);
expect(array).toHaveLength(5);
expect(value).toBeGreaterThan(10);
expect(obj).toEqual({ key: 'value' });  // Deep equality
```

**Test Structure** (browser):
```javascript
describe('Calculator.round', () => {
    it('rounds to 2 decimal places by default', () => {
        expect(Calculator.round(3.14159)).toBe(3.14);
    });
    
    it('handles floating-point edge cases', () => {
        expect(Calculator.round(0.1 + 0.2, 2)).toBe(0.3);
    });
});
```

**Test Structure** (Node.js):
```javascript
test('round handles floating point precision', () => {
    expect(Calculator.round(0.1 + 0.2, 2)).toBe(0.3);
});

test('TDEE returns null for zero tracked days', () => {
    const tdee = Calculator.calculateTDEE({...});
    expect(tdee).toBeNull();
});
```

## Anti-Patterns

- ❌ **DO NOT** use Jest/Vitest/Mocha — custom framework only
- ❌ **DO NOT** add test dependencies — zero npm packages
- ❌ **DO NOT** skip tests before commit — always run `node tests/node-test.js`
- ❌ **DO NOT** use browser dev tools for debugging — rely on automated tests
- ❌ **DO NOT** delete failing tests to "pass" — fix root cause
- ❌ **DO NOT** mock localStorage inconsistently — use standard mock pattern

## Unique Styles

**Floating-Point Obsession**:
```javascript
// Tests explicitly verify 0.1 + 0.2 = 0.3
test('round handles floating point precision', () => {
    expect(Calculator.round(0.1 + 0.2, 2)).toBe(0.3);
});
```

**Excel Parity Tests**:
```javascript
// Tests verify calculations match Excel spreadsheet
test('matches Excel calculations for Week 1 data', () => {
    // From Improved_TDEE_Tracker.xlsx Row 12-13
    const weights = [82.0, 82.6, 82.6, 81.6, 81.4, 81.0, 81.1];
    // ... verify EWMA progression matches Excel
});
```

**Sanity Check Scenarios**:
```javascript
// Real-world TDEE scenarios with expected values
test('Sanity: maintenance calories = stable weight → TDEE equals intake', () => {
    // If eating 2000 cal/day and weight stable → TDEE should be 2000
    expect(tdee).toBe(2000);
});
```

**Browser Global Mocks** (for Node.js):
```javascript
// Manual localStorage mock
global.localStorage = {
    data: { tdee_entries: '{}', tdee_settings: '{}' },
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; }
};
```

**Conditional Skip** (browser-only tests):
```javascript
test('importData sanitizes imported entries', () => {
    if (typeof localStorage === 'undefined') {
        return; // Skip in Node.js
    }
    // ... test code
});
```

## Test Coverage

| Module | Tests | Coverage |
|--------|-------|----------|
| Calculator | 13 describe + 29 node | EWMA, TDEE, gap handling, stats, BMR |
| Storage | 9 describe | CRUD, import/export, settings |
| Utils | 11 describe + 26 validation | Date parsing, validation, formatting |

**Total**: 80+ tests across 7 files.

## Notes

- **test-date-validation.js**: 222 lines — largest test file, integration tests
- **calculator_bmr.test.js**: Uses Node.js `assert` module (inconsistent with other tests)
- **No code coverage**: No Istanbul/c8 — rely on test count and scenarios
- **Dual runners**: Same tests run in Node.js (fast) + browser (full integration)
- **Test timing**: Browser runner tracks execution time per test (`performance.now()`)
