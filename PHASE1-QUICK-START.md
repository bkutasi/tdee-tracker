# Phase 1 Tests — Quick Start

## Run Tests (3 Ways)

### Option 1: Quick Test (Node.js)
```bash
node tests/node-test.js
```
**Runs**: 23 Phase 1 tests + 80+ existing tests  
**Time**: ~2 seconds  
**Best for**: Quick verification during development

### Option 2: Full Suite (Browser)
```bash
open tests/test-runner.html
```
**Runs**: 60+ Phase 1 tests + 155+ existing tests  
**Time**: ~10 seconds  
**Best for**: Complete verification before commit

### Option 3: Dedicated Script
```bash
./scripts/run-phase1-tests.sh
```
**Runs**: All Node.js tests with Phase 1 summary  
**Time**: ~2 seconds  
**Best for**: Final verification before deployment

---

## Expected Output

```
========================================
  Phase 1 Validation Tests
  Testing 5 Critical Fixes
========================================

Running Node.js tests...

=== Phase 1: Weight Validation (Fix #1) ===

✓ rejects entry with null weight
✓ rejects entry with undefined weight
✓ rejects entry with NaN weight
✓ accepts entry with valid weight
✓ does not queue entry with null weight when authenticated
✓ queues entry with valid weight when authenticated

=== Phase 1: ID Validation (Fix #2) ===

✓ rejects delete with null ID
✓ rejects delete with empty string ID
✓ rejects delete with whitespace ID
✓ accepts delete with valid string ID
✓ does not queue delete with null ID

=== Phase 1: Clear Queue Integration (Fix #4) ===

✓ clears sync queue before clearing storage
✓ handles clear data when Sync module not available

=== Phase 1: Import Sync Integration (Fix #5) ===

✓ imports data successfully
✓ handles empty import data
✓ handles invalid JSON
✓ handles missing entries field

=== Phase 1: Validation Edge Cases ===

✓ handles entry with missing calories
✓ handles delete with tab character in ID
✓ handles delete with newline in ID

=== Phase 1: Integration Tests ===

✓ full workflow: create, update, delete with validation
✓ validation prevents invalid operations
✓ multiple valid operations queue correctly

========================================
Phase 1 Results: 23 passed, 0 failed
========================================

✅ All Phase 1 tests passed!

Phase 1 Fixes Verified:
  ✓ Fix #1: Weight validation in saveWeightEntry()
  ✓ Fix #2: ID validation in deleteWeightEntry()
  ✓ Fix #3: Auth race condition in app.js
  ✓ Fix #4: Clear queue before clear data
  ✓ Fix #5: Import triggers sync
```

---

## Test Files

| File | Tests | Environment |
|------|-------|-------------|
| `tests/phase1-node.test.js` | 23 | Node.js |
| `tests/phase1-validation.test.js` | 37 | Browser |
| **Total** | **60** | **Both** |

---

## Fixes Tested

| Fix # | File | Function | Tests |
|-------|------|----------|-------|
| #1 | `js/sync.js` | `saveWeightEntry()` | 10 browser + 6 Node.js |
| #2 | `js/sync.js` | `deleteWeightEntry()` | 9 browser + 5 Node.js |
| #3 | `js/app.js` | `init()` | Code verified |
| #4 | `js/ui/settings.js` | `clearData()` | 3 browser + 2 Node.js |
| #5 | `js/ui/settings.js` | `importData()` | 6 browser + 4 Node.js |

---

## Troubleshooting

### Test Fails with "Cannot find module"
```bash
# Make sure you're in project root
cd /media/nvme/projects/tdee-tracker

# Run from root directory
node tests/node-test.js
```

### Script Not Executable
```bash
chmod +x scripts/run-phase1-tests.sh
./scripts/run-phase1-tests.sh
```

### Browser Tests Not Loading
```bash
# Open in browser directly
open tests/test-runner.html

# Or check file exists
ls -la tests/phase1-validation.test.js
```

---

## Before Commit Checklist

- [ ] Run `node tests/node-test.js` — all pass
- [ ] Run `open tests/test-runner.html` — all pass
- [ ] No new console errors
- [ ] Git status clean (except intended changes)

---

## After Commit

- [ ] Push to GitHub
- [ ] Verify GitHub Actions tests pass
- [ ] Deploy to Cloudflare Pages (if on master branch)

---

**Questions?** See `PHASE1-TEST-STATUS.md` for complete documentation.
