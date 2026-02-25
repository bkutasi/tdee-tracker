<!-- Context: project-intelligence/notes | Priority: high | Version: 1.0 | Updated: 2026-02-25 -->

# Living Notes

> Active issues, technical debt, open questions, and insights for TDEE Tracker. Keep this alive.

## Current State

- **Status**: Working PWA with 29 passing automated tests
- **Core Engine**: `js/calculator.js` (724 lines) - EWMA smoothing, TDEE calculation, gap handling
- **Persistence**: LocalStorage with JSON import/export
- **PWA**: Installable (manifest.json, sw.js), offline-first architecture
- **Test Suite**: `tests/node-test.js` (Node.js runner), `tests/test-runner.html` (browser)
- **Architecture**: Modular (calculator, storage, utils, ui/* components)

---

## What Works Well

- **EWMA Smoothing** (α=0.3) - Reduces daily weight noise effectively; tuned for daily weigh-ins
- **Conservative Gap Handling** - Excludes days without calorie data from TDEE calc; produces accurate estimates
- **Offline-First** - No backend dependencies; works entirely in browser
- **Test Coverage** - 29 automated tests catch regressions before deployment
- **Modular Design** - Separation of concerns (calculator, storage, utils, ui/*)

---

## Technical Debt

| Item | Impact | Priority | Mitigation |
|------|--------|----------|------------|
| Floating-point precision (`0.0000002`) | Minor display inaccuracies | Low | Round intermediate calculations |
| No cross-device sync | Users can't backup across devices | Medium | Export/import JSON exists |
| Large `index.html` (16,805 lines) | Harder to navigate | Low | Single file trade-off for simplicity |

### Floating-Point Precision

*Priority*: Low  
*Impact*: Minor display inaccuracies in EWMA calculations and TDEE formulas  
*Root Cause*: JavaScript floating-point arithmetic without rounding intermediate steps  
*Proposed Solution*: Apply `round()` to intermediate calculations in `js/calculator.js`  
*Effort*: Small  
*Status*: Acknowledged

---

## Gotchas for Maintainers

- **EWMA α=0.3** is tuned for daily weight data; changing requires recalibration against historical data
- **MIN_TRACKED_DAYS=4** is hardcoded in `calculator.js`; affects TDEE confidence thresholds
- **Conservative gap handling** excludes days without calorie data by design; this is intentional for accuracy
- **Tests must pass** before any calculation changes: `node tests/node-test.js`
- **Hybrid History**: Chart uses Theoretical TDEE when calculated TDEE has low confidence (prevents artificial dips)

---

## Open Questions / Future Enhancements

| Question | Stakeholders | Status | Next Action |
|----------|--------------|--------|-------------|
| Data visualization improvements | Users | Open | Explore chart.js enhancements |
| Optional cloud sync for backup | Users | Open | Design spec needed |
| Weekly/monthly trend analysis | Users | Open | Define metrics and UI |
| Sophisticated outlier detection | Developers | Open | Beyond current 2.5 std dev |

### Priority Enhancements

1. **Improve floating-point handling** throughout `calculator.js`
2. **Add weekly/monthly trend analysis** with summary statistics
3. **Consider optional cloud sync** (R2/KV) for backup without losing offline-first
4. **Enhance outlier detection** (currently 2.5 std dev from mean)

---

## Archive (Resolved Items)

*No resolved items yet.*

---

## Related Files

- `GEMINI.md` - Agent guidelines and key formulas
- `js/calculator.js` - Core calculation engine
- `tests/node-test.js` - Automated test suite
- `.opencode/context/core/standards/project-intelligence.md` - Standards reference
