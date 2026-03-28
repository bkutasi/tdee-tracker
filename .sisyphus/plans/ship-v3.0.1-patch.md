# Ship v3.0.1-patch — Phase 1 Critical Fixes + Settings Menu

**Created**: 2026-03-28T17:49:27Z  
**Priority**: 🔴 CRITICAL  
**Estimated Time**: 30 minutes  
**Release**: v3.0.1-patch

---

## Executive Summary

Ship already-implemented fixes that are ready but blocked by test runner issues.

**What's Done**:
- ✅ Phase 1 Critical Fixes (5/5 fixes implemented, 60+ tests created)
- ✅ Settings Menu UI (8/8 subtasks complete, tests created)

**What's Blocking**:
- ⚠️ `calculator-ewma.js` Node.js compatibility (Utils reference error)
- ⚠️ Test load order in `node-test.js`
- ⚠️ Missing `calculator-ewma.js` in browser test runner

**Solution**: Fix 3 small issues → Run tests → Commit → Deploy

---

## TODOs

### Critical Blockers (Must Fix First)

- [ ] **Fix calculator-ewma.js Node.js compatibility**
  - File: `js/calculator-ewma.js`
  - Lines: 143-144
  - Change: Add `typeof Utils !== 'undefined'` check before accessing Utils
  - Verify: `node tests/node-test.js` runs without ReferenceError

- [ ] **Fix node-test.js load order**
  - File: `tests/node-test.js`
  - Lines: 92-95
  - Change: Move `global.Utils = Utils` BEFORE `require('./calculator.js')`
  - Verify: Calculator module loads successfully

- [ ] **Add calculator-ewma.js to test-runner.html**
  - File: `tests/test-runner.html`
  - Location: After `<script src="../js/utils.js"></script>`
  - Verify: Browser tests load all calculator modules

### Verification (Must Pass)

- [ ] **Run Node.js tests**
  - Command: `node tests/node-test.js`
  - Expected: All tests pass (81+ tests including 23 Phase 1)
  - Time: ~2 seconds

- [ ] **Run browser tests**
  - Command: `open tests/test-runner.html`
  - Expected: All tests pass (155+ tests including 37 Phase 1)
  - Time: ~10 seconds

- [ ] **Manual verification**
  - Check: No console errors in browser
  - Check: Sync status shows correct behavior
  - Check: Settings menu renders correctly

### Commit & Deploy

- [ ] **Increment version numbers**
  - File: `sw.js` line 7 → `CACHE_VERSION = '1.0.1'`
  - File: `js/version.js` line 10 → `APP_VERSION = '1.0.1'`
  - Verify: Both files match

- [ ] **Commit Phase 1 fixes**
  - Files: `js/sync.js`, `js/app.js`, `js/ui/settings.js`, `tests/phase1*.test.js`
  - Message: `fix: Phase 1 critical sync/validation fixes (v3.0.1-patch)`

- [ ] **Commit Settings Menu**
  - Files: `index.html`, `css/styles.css`, `js/ui/settings.js`, `tests/ui/settings.test.js`
  - Message: `feat: simplify settings menu UI (remove export dropdown, fix alignment)`

- [ ] **Push to GitHub**
  - Command: `git push origin master`
  - Verify: GitHub Actions tests pass

- [ ] **Deploy to Cloudflare Pages**
  - Command: `wrangler pages deploy . --project-name=tdee-tracker`
  - Verify: Deployment successful
  - URL: https://tdee.kutasi.dev

---

## Final Verification Wave

### F1: Automated Tests
- [ ] `node tests/node-test.js` passes (81+ tests)
- [ ] Browser tests pass (155+ tests)
- [ ] Zero console errors

### F2: Code Quality
- [ ] No TypeScript/ESLint errors
- [ ] Follows existing patterns (IIFE modules)
- [ ] No new dependencies added

### F3: Functionality
- [ ] Weight validation rejects null/undefined/NaN
- [ ] ID validation rejects invalid IDs
- [ ] Auth race condition fixed (data loads on first load)
- [ ] Clear data clears sync queue first
- [ ] Import triggers sync
- [ ] Settings menu renders correctly (no export dropdown)

### F4: Deployment
- [ ] Version incremented in sw.js and version.js
- [ ] Committed with proper messages
- [ ] Pushed to GitHub
- [ ] Deployed to Cloudflare Pages
- [ ] Live demo accessible

---

## Context Files

- `.tmp/tasks/phase1-critical-fixes/INSTRUCTIONS.md`
- `.tmp/tasks/phase1-critical-fixes/HARVEST-REPORT.md`
- `.tmp/tasks/settings-menu-fix/EXECUTION_PLAN.md`
- `PHASE1-TEST-STATUS.md`
- `.opencode/context/project/sync-challenges.md`

---

## Rollback Plan

If issues found after deployment:
```bash
git reset --hard HEAD~2
wrangler pages deploy . --project-name=tdee-tracker
```

---

## Notes

- All 5 Phase 1 fixes already implemented (verified in code)
- Settings menu already complete (8/8 subtasks)
- Only blocker is calculator-ewma.js compatibility
- This is a PATCH release — no new features, only bug fixes
