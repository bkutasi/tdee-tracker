# ESLint Fix Plan - CI Deployment Blocker

**Created**: 2026-03-30  
**Priority**: HIGH - Blocking deployments  
**Issue**: 62 ESLint problems (1 error, 61 warnings) blocking CI/CD

---

## Problem Analysis

### Current State
- **ESLint Configs**: 2 conflicting configs (`.eslintrc.json` + `eslint.config.js`)
- **CI ESLint Version**: Latest v9+ (flat config preferred)
- **Pre-commit Hook**: Shows warnings but doesn't block
- **CI Behavior**: Blocks on ESLint errors

### Breakdown of 62 Problems

| Severity | Count | Impact |
|----------|-------|--------|
| **ERROR** | 1 | Blocks CI - MUST FIX |
| **WARNING** | 61 | Noise - Fix or suppress |

### Critical Issues (ERROR)
1. `utils.js:10` - `AppConstants` used before defined (`no-use-before-define`)

### High-Priority Warnings (Real Issues)
1. `sync.js:22` - Unused eslint-disable directive
2. `sync.js:81` - `supabase` declared but never used
3. `sync.js:86-93` - `AppConstants` block-scoped-var (6 instances)
4. `utils.js:10,70-91,157,279,454` - `AppConstants` block-scoped-var (11 instances)
5. `sync-debug.js:241` - Function expected no return value (`consistent-return`)

### Medium-Priority Warnings (Code Quality)
1. Unused variables: `App`, `error`, `weightUnit`, `weightSum`, `migrated`, `user`, etc.
2. `prefer-const`: `let` should be `const` (6 instances)
3. `max-depth`: Nested blocks too deep (chart-data.js)
4. `no-return-assign`: Arrow function returning assignment (2 instances)
5. Missing radix parameter (settings.js)

### Low-Priority Warnings (Style)
1. Unused function params: `event`, `user`, `e`, `error`, `type`, `weightUnit`, etc.
2. Unused assignments: `emailInput`, `sendLinkButton`, `logoutButton`, etc.

---

## TODOs

### Phase 1: Fix Critical ERROR (Blocks CI)
- [x] **1.1**: Fix `utils.js:10` - Move `AppConstants` definition before usage OR disable rule for IIFE pattern

### Phase 2: Fix High-Priority Warnings (Real Bugs)
- [x] **2.1**: Fix `sync.js:22` - Remove unused eslint-disable directive
- [x] **2.2**: Fix `sync.js:81` - Remove or use `supabase` variable
- [x] **2.3**: Fix `sync.js:86-93` - `AppConstants` block-scoped-var issues
- [x] **2.4**: Fix `utils.js` - `AppConstants` block-scoped-var (11 instances)
- [x] **2.5**: Fix `sync-debug.js:241` - `consistent-return` issue

### Phase 3: Fix Medium-Priority Warnings (Code Quality)
- [x] **3.1**: Remove unused variables across all files (App, error, weightUnit, etc.)
- [x] **3.2**: Change `let` to `const` where appropriate (6 instances)
- [x] **3.3**: Refactor deep nesting in `chart-data.js` (max-depth)
- [x] **3.4**: Fix `no-return-assign` in `chart-render.js` and `utils.js` (2 instances)
- [x] **3.5**: Add radix parameter in `settings.js`

### Phase 4: Suppress Low-Priority Warnings (Vanilla JS Pattern)
- [x] **4.1**: Update `eslint.config.js` to relax rules for IIFE pattern:
  - `no-unused-vars`: Change to "off" for function params (common in event handlers)
  - `block-scoped-var`: Change to "off" (IIFE modules expose globals)
  - `max-depth`: Increase to 6 or turn off (chart rendering needs depth)
  - `no-return-assign`: Change to "off" (common pattern in vanilla JS)
  - `prefer-const`: Keep as "warn" but don't block

### Phase 5: Pre-commit Hook Enforcement
- [x] **5.1**: Update `.git/hooks/pre-commit` to block on ESLint errors (not just warnings)
- [x] **5.2**: Add ESLint auto-fix step to pre-commit

### Phase 6: CI/CD Consistency
- [x] **6.1**: Pin ESLint version in CI (avoid "latest" instability)
- [x] **6.2**: Ensure CI uses `eslint.config.js` (flat config)
- [x] **6.3**: Add ESLint auto-fix suggestion in CI output

### Phase 7: Cleanup
- [x] **7.1**: Remove `.eslintrc.json` (legacy config, conflicts with flat config)
- [x] **7.2**: Document ESLint rules in AGENTS.md
- [x] **7.3**: Run `npx eslint js/ --fix` for auto-fixable issues

---

## Final Verification Wave

### F1: Code Quality Gate
- [x] ESLint passes with 0 errors
- [x] ESLint warnings ≤ 20 (acceptable for vanilla JS IIFE pattern)
- [x] All auto-fixable issues resolved

### F2: Test Suite Gate
- [x] `node tests/node-test.js` passes (80+ tests)
- [x] Browser tests pass (155+ tests)
- [x] No regressions introduced

### F3: Pre-commit Hook Gate
- [x] Pre-commit hook blocks on ESLint errors
- [x] Pre-commit hook allows commits with warnings only
- [x] Hook runs in <30 seconds

### F4: Deployment Gate
- [x] CI/CD pipeline passes (lint → test → e2e → deploy)
- [x] Deployment to https://tdee.kutasi.dev succeeds
- [x] No ESLint errors in GitHub Actions logs

---

## Dependencies

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
  ↓         ↓         ↓         ↓         ↓         ↓         ↓
ERROR     HIGH      MEDIUM    STYLE     HOOK      CI        CLEANUP
```

**Parallelizable**: Phase 3 tasks (independent files)  
**Sequential**: Phase 1 must complete first (blocks CI)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking IIFE pattern | Low | High | Test after each phase |
| Over-suppressing rules | Medium | Medium | Keep error-level rules strict |
| CI config mismatch | Medium | High | Test CI locally with act |
| Pre-commit too strict | Low | Low | Allow --no-verify escape hatch |

---

## Success Metrics

- ✅ CI/CD unblocked (deployments succeed)
- ✅ Pre-commit hook enforces quality
- ✅ ESLint warnings reduced by 80% (61 → ≤12)
- ✅ Zero ESLint errors
- ✅ All tests passing
- ✅ No regressions in functionality
