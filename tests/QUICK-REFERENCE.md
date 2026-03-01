# Pre-Commit Testing - Quick Reference

## 🚀 Quick Start

**It's already installed!** Just commit normally:

```bash
git commit -m "your commit message"
```

Tests run automatically. If they pass, commit succeeds! ✅

---

## 📋 Commands

### Run Tests Manually

```bash
# All tests (same as pre-commit)
node tests/e2e/integration-checks.test.js && node tests/node-test.js

# E2E Integration Checks only (fast)
node tests/e2e/integration-checks.test.js

# Unit Tests only
node tests/node-test.js

# Browser tests (full integration)
open tests/test-runner.html
```

### Emergency Override

```bash
# Skip pre-commit (use sparingly!)
git commit --no-verify -m "critical fix"

# ⚠️ Fix tests immediately after!
```

---

## ✅ What Gets Tested

| Category | Tests | Catches |
|----------|-------|---------|
| **E2E Integration** | 12 | API mismatches, missing exports |
| **Calculator** | 18 | TDEE calculations, EWMA, floating-point |
| **Utils** | 26 | Date parsing, validation, formatting |
| **Storage** | 23 | Migration, import/export, sanitization |
| **Sync** | 28 | Queue operations, merge logic |
| **CSP** | 14 | Security headers compliance |
| **TOTAL** | **121** | **Comprehensive coverage** |

---

## 🐛 Real Bugs Caught

These would have been blocked before deployment:

1. ❌ Missing `fetchAndMergeData` export
2. ❌ Hidden `Auth._getSupabase()` method
3. ❌ Wrong Storage API (`clearEntries`, `addEntry`)
4. ❌ Daily entry bypassing Sync module

---

## ⏱️ Performance

- **E2E Checks:** ~300ms
- **Unit Tests:** ~1.5s
- **Total:** <2 seconds

---

## 🔧 Troubleshooting

### Hook not running?
```bash
chmod +x .git/hooks/pre-commit
```

### Tests failing?
```bash
# Find failing tests
node tests/e2e/integration-checks.test.js
node tests/node-test.js

# Fix code, then commit
```

### Need to disable temporarily?
```bash
mv .git/hooks/pre-commit .git/hooks/pre-commit.disabled
# Re-enable later:
mv .git/hooks/pre-commit.disabled .git/hooks/pre-commit
```

---

## 📚 Documentation

- **Full Guide:** `tests/PRE-COMMIT-GUIDE.md`
- **E2E Tests:** `tests/e2e/README.md`
- **Session Summary:** `.tmp/tasks/pre-commit-testing/SESSION-SUMMARY.md`

---

## 💡 Best Practices

✅ **DO:**
- Fix failing tests immediately
- Add integration checks for new cross-module dependencies
- Run tests manually before large commits

❌ **DON'T:**
- Skip tests to "save time"
- Modify tests without fixing code
- Use `--no-verify` regularly

---

## 🎯 Success Criteria

Before each commit:
- [ ] E2E Integration Checks pass (12/12)
- [ ] Unit Tests pass (109/109)
- [ ] No test errors or warnings
- [ ] Code changes are tested

---

**Remember:** 2 seconds of testing saves hours of debugging! ⏱️→💥→✅
