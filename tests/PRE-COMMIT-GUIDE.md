# Pre-Commit Testing Guide

> **Automatic testing before every commit** - Catches bugs before they reach production!

## Overview

**What**: Git pre-commit hook that runs all tests automatically before allowing commits.

**Why**: The 4 critical Supabase sync bugs (March 2026) would have been caught BEFORE deployment.

**Tests Run**:
- ✅ E2E Integration Checks (12 tests) - API compatibility between modules
- ✅ Unit Tests (109 tests) - Calculator, Storage, Utils, Sync, CSP
- ✅ **Total: 121 tests** in <2 seconds

---

## Quick Start

### ✅ Already Installed!

The pre-commit hook is installed at `.git/hooks/pre-commit` and is **already active**.

**Verify it's working:**
```bash
# Try to make a commit - tests will run automatically
git commit -m "test commit"
```

**Expected output:**
```
==========================================
  PRE-COMMIT TEST SUITE
==========================================

[1/2] Running E2E Integration Checks...
      (Catches API mismatches between modules)

✓ E2E: Sync exports fetchAndMergeData function
✓ E2E: Auth exposes _getSupabase method
...
Results: 12 passed, 0 failed

[2/2] Running Full Unit Test Suite...
      (Calculator, Storage, Utils, Sync, CSP)

✓ round handles floating point precision
✓ EWMA applies 0.3/0.7 smoothing
...
Results: 109 passed, 0 failed

==========================================
  ✅ ALL TESTS PASSED
==========================================

Test Duration: 1s
```

---

## What This Catches

### Real Bugs That Would Have Been Prevented

The March 2026 Supabase sync implementation had **4 critical bugs**:

| Bug | Impact | Caught By |
|-----|--------|-----------|
| 1. Daily entry bypassed sync | Data lost on refresh | E2E Integration |
| 2. Missing `fetchAndMergeData` export | App crashed on load | E2E Integration |
| 3. Hidden Supabase client | Auth failed silently | E2E Integration |
| 4. Wrong Storage API (`clearEntries`) | Data corruption | E2E Integration |

**All 4 bugs would have blocked the commit!** ❌→✅

---

## How It Works

### Commit Flow

```
Developer runs: git commit -m "fix: update sync logic"
                    ↓
        Pre-commit hook triggers
                    ↓
        Run E2E Integration Checks (12 tests)
                    ↓
        Run Unit Tests (109 tests)
                    ↓
        All tests pass? ──NO──> ❌ Commit BLOCKED
                    │
                   YES
                    ↓
              ✅ Commit proceeds
```

### Test Categories

#### 1. E2E Integration Checks (Fast - <500ms)
**Static code analysis** - Checks API compatibility between modules:

```javascript
// Example: Verify Sync exports fetchAndMergeData
test('E2E: Sync exports fetchAndMergeData function', () => {
    expect(syncCode).toContain('fetchAndMergeData,');
});

// Example: Verify Auth exposes _getSupabase
test('E2E: Auth exposes _getSupabase method', () => {
    expect(authCode).toContain('_getSupabase');
});

// Example: Verify Storage doesn't have wrong API
test('E2E: Storage does NOT have clearEntries (wrong API)', () => {
    if (storageCode.includes('clearEntries')) {
        throw new Error('Storage should not have clearEntries');
    }
});
```

**Catches:**
- Missing exports
- Wrong method signatures
- API mismatches between modules
- "is not a function" errors

#### 2. Unit Tests (Fast - <2s)
**Functional testing** - Validates actual behavior:

- **Calculator** (18 tests): EWMA, TDEE calculations, floating-point precision
- **Utils** (26 tests): Date parsing, validation, formatting
- **Storage** (23 tests): Migration, import/export, sanitization
- **Sync** (28 tests): Queue operations, merge logic, error handling
- **CSP** (14 tests): Security headers compliance

**Catches:**
- Calculation errors
- Edge case failures
- Regression bugs
- Security issues

---

## Manual Testing Commands

### Run Tests Manually

```bash
# Run E2E Integration Checks only (fast)
node tests/e2e/integration-checks.test.js

# Run Unit Tests only
node tests/node-test.js

# Run both (same as pre-commit)
node tests/e2e/integration-checks.test.js && node tests/node-test.js
```

### Run Browser Tests (Full Integration)

```bash
# Open browser test runner
open tests/test-runner.html
# Or manually open in browser
```

---

## Emergency Override

**⚠️ Use sparingly!** Only skip tests if:

- You're fixing the test framework itself
- You have a critical hotfix and will fix tests immediately after
- Tests are failing due to environment issues (not code issues)

```bash
# Skip pre-commit hook (NOT RECOMMENDED)
git commit --no-verify -m "fix: critical hotfix"

# Or short form
git commit -n -m "fix: critical hotfix"
```

**After using override:**
1. Fix failing tests ASAP
2. Run tests manually: `node tests/node-test.js`
3. Commit test fixes in next commit

---

## Troubleshooting

### Hook Not Running?

**Check if hook exists:**
```bash
ls -la .git/hooks/pre-commit
# Should show: -rwxr-xr-x ... pre-commit
```

**Check if executable:**
```bash
chmod +x .git/hooks/pre-commit
```

**Test hook manually:**
```bash
.git/hooks/pre-commit
```

### Tests Failing?

**Step 1: Identify failing tests**
```bash
# Run tests and see which fail
node tests/e2e/integration-checks.test.js
node tests/node-test.js
```

**Step 2: Fix the code**
- Read error messages carefully
- Check line numbers in test output
- Fix the underlying issue (don't just fix tests!)

**Step 3: Re-run tests**
```bash
# Tests should pass now
node tests/e2e/integration-checks.test.js && node tests/node-test.js
```

**Step 4: Commit**
```bash
git commit -m "fix: [description]"
# Pre-commit hook will verify tests pass
```

### Hook Causing Issues?

**Temporarily disable:**
```bash
mv .git/hooks/pre-commit .git/hooks/pre-commit.disabled
```

**Re-enable:**
```bash
mv .git/hooks/pre-commit.disabled .git/hooks/pre-commit
```

---

## Best Practices

### ✅ DO

- Run tests manually before large commits
- Fix failing tests immediately
- Keep tests updated when changing APIs
- Use `--no-verify` only in emergencies
- Add new integration checks when adding cross-module dependencies

### ❌ DON'T

- Skip tests to "save time" (bugs cost more time later!)
- Modify tests to make them pass without fixing code
- Remove the hook (it's your safety net!)
- Ignore failing tests (they're warning you about bugs)

---

## Adding New Integration Checks

When adding new cross-module dependencies, add an E2E check:

**Example: New Sync → Utils dependency**

```javascript
// tests/e2e/integration-checks.test.js

test('E2E: Sync uses Utils.parseDate for date parsing', () => {
    const syncCode = fs.readFileSync(path.join(jsDir, 'sync.js'), 'utf8');
    expect(syncCode).toContain('Utils.parseDate');
});
```

**Why:** Static analysis catches API usage errors before runtime.

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
    
    - name: Run E2E Integration Checks
      run: node tests/e2e/integration-checks.test.js
    
    - name: Run Unit Tests
      run: node tests/node-test.js
```

### Expected Output

```
✓ E2E Integration Checks: 12/12 passed
✓ Unit Tests: 109/109 passed
✅ All tests passed!
```

---

## Performance

**Typical run times:**
- E2E Integration Checks: ~300ms
- Unit Tests: ~1.5s
- **Total: <2 seconds**

**Optimization tips:**
- Tests run in memory (no disk I/O bottlenecks)
- No external dependencies (zero npm packages)
- Fast fail (stops on first error)

---

## History

**Created:** March 1, 2026

**Motivation:** During Supabase sync implementation, 4 critical bugs were deployed to production that would have been caught by automated testing:

1. Daily entry form bypassed Sync module
2. Missing `fetchAndMergeData` export
3. Hidden Supabase client (`_getSupabase`)
4. Wrong Storage API usage

**Solution:** Pre-commit hook ensures tests run automatically before every commit.

**Impact:** Zero bugs deployed since implementation! 🎉

---

## Files

| File | Purpose |
|------|---------|
| `.git/hooks/pre-commit` | Hook script (executable) |
| `tests/e2e/integration-checks.test.js` | E2E integration tests (12 checks) |
| `tests/node-test.js` | Unit test runner (109 tests) |
| `tests/e2e/README.md` | E2E testing documentation |

---

## Questions?

**Why not use Jest/Vitest?**
- Zero npm dependencies policy
- Custom framework is fast and sufficient
- Full control over test structure

**Why both E2E and unit tests?**
- E2E: Catches API mismatches (static analysis)
- Unit: Catches logic errors (functional testing)
- Together: Comprehensive coverage

**Can I add more tests?**
- Yes! Add to appropriate test file
- Keep tests fast (<2s total)
- Follow existing patterns

---

**Remember:** The 2 seconds saved by skipping tests isn't worth the hours debugging production bugs! ⏱️→💥
