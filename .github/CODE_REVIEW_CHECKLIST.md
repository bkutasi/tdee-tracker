# Code Review Checklist

> Use this checklist for all pull requests to ensure code quality and prevent regressions.

## For Pull Request Authors

### Before Requesting Review

- [ ] **Pre-commit checks pass**
  - [ ] `node tests/node-test.js` - All tests pass
  - [ ] `node -c js/your-file.js` - Syntax valid (or use pre-commit hook)
  - [ ] No console.log() debug statements left in code

- [ ] **Tests added/updated**
  - [ ] Positive test case (happy path)
  - [ ] Negative test case (error/edge case)
  - [ ] All new code paths covered
  - [ ] Fallback logic tested (if applicable)

- [ ] **Code quality**
  - [ ] Variables declared before use (no use-before-define)
  - [ ] Function is < 100 lines (or extracted into helpers)
  - [ ] Nesting depth < 4 levels
  - [ ] JSDoc comments for all public functions
  - [ ] Complex logic has inline comments

- [ ] **Documentation**
  - [ ] Updated AGENTS.md if adding new patterns
  - [ ] Updated this checklist if needed
  - [ ] Added regression prevention tests if fixing bugs

---

## For Reviewers

### Variable Scoping & Declaration

- [ ] All variables declared before first use
- [ ] No temporal dependencies (variable A uses variable B declared later)
- [ ] `const` used by default, `let` only when reassignment needed
- [ ] No `var` (use `let`/`const` for block scoping)
- [ ] Variable names are descriptive (no single-letter except loop counters)

**Red Flags to Look For:**
```javascript
// ❌ BAD: Variable used before declaration
if (condition) {
    return calResult.value;  // calResult not declared yet!
}
const calResult = calculateValue();

// ✅ GOOD: Variable declared before use
const calResult = calculateValue();
if (condition) {
    return calResult.value;
}
```

### Function Complexity

- [ ] Function is < 100 lines (or has helper functions)
- [ ] Cyclomatic complexity < 20 (count: if/for/while/switch/catch/&&/||)
- [ ] Nesting depth < 4 levels
- [ ] Single responsibility (function does one thing)

**Red Flags:**
- Functions longer than a screen (~100 lines)
- More than 3 levels of nested if/for/while
- Function name contains "And" (e.g., `calculateAndSaveAndNotify`)

### Error Handling & Edge Cases

- [ ] Guard clauses for invalid input
- [ ] Early returns over nested conditionals
- [ ] All code paths return consistent types
- [ ] Edge cases handled (null, undefined, empty arrays)

**Example:**
```javascript
// ✅ GOOD: Guard clauses
function calculateTDEE(entries, unit, minDays) {
    if (!entries || entries.length < 7) {
        return { tdee: null, confidence: 'none' };
    }
    
    if (entries.length < minDays) {
        return calculateFallback(entries);
    }
    
    // Main logic here (flat, minimal nesting)
}
```

### Test Coverage

- [ ] Positive test case exists (happy path)
- [ ] Negative test case exists (error/edge case)
- [ ] All conditional branches tested
- [ ] Fallback logic tested (if applicable)
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)

**Test Coverage Matrix Example:**

| Condition | Path | Test Case | Status |
|-----------|------|-----------|--------|
| entries.length < 7 | Early return | `test_returnsNullForInsufficientEntries` | ✅ |
| trackedDays < minDays | Fallback | `test_returnsCalorieAverageFallback` | ✅ |
| All checks pass | Normal flow | `test_calculatesStableTDEE` | ✅ |

### Code Style & Conventions

- [ ] Follows IIFE module pattern (if adding new module)
- [ ] Constants are UPPERCASE at module top
- [ ] camelCase for functions and variables
- [ ] Consistent indentation (4 spaces)
- [ ] No trailing whitespace

### Documentation

- [ ] JSDoc comments for all public functions:
  ```javascript
  /**
   * Calculate stable TDEE using regression
   * @param {Object[]} entries - Array of daily entries
   * @param {string} unit - 'kg' or 'lb'
   * @param {number} windowDays - Window size (default: 14)
   * @returns {Object} { tdee, confidence, trackedDays }
   */
  ```
- [ ] Complex logic has inline comments explaining WHY (not WHAT)
- [ ] Updated AGENTS.md if adding new patterns or conventions

---

## Special Focus: Regression Prevention

### For Bug Fixes

- [ ] **Root cause identified** (not just symptom fixed)
- [ ] **Regression test added** (test that would have caught this bug)
- [ ] **Similar patterns audited** (check if same bug exists elsewhere)
- [ ] **Documented in prevention guide** (`.opencode/context/development/preventing-regressions.md`)

### For New Features

- [ ] **Fallback logic defined** (what happens with insufficient data?)
- [ ] **Error paths tested** (what if API fails? what if data is null?)
- [ ] **Edge cases considered** (empty arrays, zero values, max values)

---

## Common Bug Patterns to Watch For

### 1. Use-Before-Define

```javascript
// ❌ Look for this pattern
function calculateSomething(data) {
    if (condition) {
        return result.value;  // result not declared yet!
    }
    const result = processData(data);
}

// ✅ Fix: Hoist declarations
function calculateSomething(data) {
    let result;
    
    // Early analysis
    if (condition) {
        // Can't return result here, need to restructure
    }
    
    result = processData(data);
    return result.value;
}
```

### 2. Scattered Variable Declarations

```javascript
// ❌ Variables declared throughout function
function longFunction() {
    const a = 1;
    // ... 50 lines ...
    const b = 2;
    // ... 50 lines ...
    const c = a + b;
}

// ✅ Hoist all declarations
function longFunction() {
    // Declarations
    let a, b, c;
    
    // Logic
    a = 1;
    // ...
    b = 2;
    // ...
    c = a + b;
}
```

### 3. Deep Nesting

```javascript
// ❌ More than 4 levels
if (condition1) {
    if (condition2) {
        for (let i = 0; i < 10; i++) {
            if (condition3) {
                // Level 4!
            }
        }
    }
}

// ✅ Extract helpers
function longFunction() {
    if (!condition1) return;
    if (!condition2) return;
    
    processItems(items);
}

function processItems(items) {
    for (let i = 0; i < 10; i++) {
        if (condition3) {
            // Handle logic
        }
    }
}
```

---

## Sign-off

### Author Checklist Complete
- [ ] All author items checked above

### Reviewer Approval
- [ ] All reviewer items checked above
- [ ] No red flags found
- [ ] Tests reviewed and approved
- [ ] Ready to merge

**Reviewer**: _______________  
**Date**: _______________  
**Comments**: _______________

---

## Resources

- **Prevention Guide**: `.opencode/context/development/preventing-regressions.md`
- **Testing Patterns**: `.opencode/context/testing/test-patterns.md`
- **Project Guidelines**: `AGENTS.md`
- **Test Framework**: `tests/AGENTS.md`

---

**Last Updated**: 2026-03-13  
**Version**: 1.0
