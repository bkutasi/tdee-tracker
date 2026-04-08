# Technical Debt Roadmap — TDEE Tracker

> Active issues, technical debt, gotchas, and open questions. Keep this alive.
> Migrated from `.opencode/context/project-intelligence/living-notes.md` on 2026-04-08.

## Current State

- **Version**: 3.0.1 (see AGENTS.md Section 17 for full history)
- **Tests**: 155+ passing (Node.js + browser runners)
- **Dependencies**: 0 (zero npm packages)
- **Live**: https://tdee.kutasi.dev

## What Works Well

- **EWMA Smoothing** (α=0.3) — Reduces daily weight noise effectively; tuned for daily weigh-ins
- **Conservative Gap Handling** — Excludes days without calorie data from TDEE calc; produces accurate estimates
- **Offline-First** — No backend dependencies; works entirely in browser
- **Test Coverage** — 155+ automated tests catch regressions before deployment
- **Modular Design** — Separation of concerns (calculator, storage, utils, ui/*, sync, auth)
- **Supabase Sync** — Offline-first with optimistic UI, background sync queue, multi-device support

## Technical Debt

| Item | Impact | Priority | Mitigation |
|------|--------|----------|------------|
| Floating-point precision (`0.0000002`) | Minor display inaccuracies | Low | Round intermediate calculations in `calculator.js` |
| CSS `!important` (4 instances in `styles.css`) | Style specificity issues | Low | Avoid adding more; refactor when touching related CSS |
| Test naming inconsistency (`.test.js` vs `test-*.js`) | Confusing file organization | Low | Normalize when refactoring |
| Large `index.html` (17k+ lines) | Harder to navigate | Low | Single file trade-off for simplicity; script loading order = dependency graph |

### Floating-Point Precision

**Root Cause**: JavaScript floating-point arithmetic without rounding intermediate steps.
**Proposed Solution**: Apply `Calculator.round()` to intermediate calculations in `js/calculator.js`.
**Effort**: Small. **Status**: Acknowledged.

## Gotchas for Maintainers

- **EWMA α=0.3** is tuned for daily weight data; changing requires recalibration against historical data
- **MIN_TRACKED_DAYS=4** is hardcoded in `calculator.js`; affects TDEE confidence thresholds
- **Conservative gap handling** excludes days without calorie data by design — this is intentional for accuracy
- **Tests must pass** before any calculation changes: `node tests/node-test.js`
- **Hybrid History**: Chart uses Theoretical TDEE when calculated TDEE has low confidence (prevents artificial dips)
- **DO NOT** call `Storage.saveEntry()` directly — use `Sync.saveWeightEntry()` (see AGENTS.md Section 2 anti-patterns)
- **DO NOT** deploy without incrementing `CACHE_VERSION` in `sw.js` AND `APP_VERSION` in `js/version.js`
- **DO NOT** introduce build tools (Webpack/Vite) or npm dependencies unless explicitly requested

## Open Questions / Future Enhancements

| Question | Status | Priority |
|----------|--------|----------|
| Data visualization improvements | Open | Medium |
| Optional cloud sync for backup | Open (Supabase sync exists in v3.0) | — |
| Weekly/monthly trend analysis | Open | Medium |
| Sophisticated outlier detection (beyond 2.5 std dev) | Open | Low |

### Priority Enhancements

1. **Improve floating-point handling** throughout `calculator.js`
2. **Add weekly/monthly trend analysis** with summary statistics
3. **Enhance outlier detection** (currently 2.5 std dev from mean)

## Related Files
- `AGENTS.md` — Full project knowledge base
- `js/calculator.js` — Core calculation engine
- `tests/node-test.js` — Automated test suite
