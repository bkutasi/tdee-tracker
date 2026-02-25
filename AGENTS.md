<!-- Context: agent/guidelines | Priority: critical | Version: 1.0 | Updated: 2026-02-25 -->

# Agent Guidelines

> Comprehensive guidelines for AI agents working on TDEE Tracker

## Core Principles

**Precision**: Fix floating-point issues (`0.0000002`) wherever found
**Verification**: Always verify changes with test scripts or `tests/` modifications
**Style**: Maintain vanilla JS structure. Do NOT introduce build tools (Webpack/Vite) unless explicitly requested
**Testing**: Always test with test suite. Never use browser tools - rely on automated tests
**Commits**: Always commit after changes. Use conventional commit messages. Commit after successful tests

## Project Structure

| File | Purpose | Lines |
|------|---------|-------|
| `js/calculator.js` | EWMA, TDEE calculation, gap handling (core math) | 724 |
| `js/storage.js` | LocalStorage persistence with import/export | - |
| `js/utils.js` | Date handling, validation, helpers | - |
| `js/ui/*.js` | UI components (dashboard, entries, weekly, chart, settings) | - |
| `tests/node-test.js` | Quick Node.js test runner (29 tests) | - |
| `tests/test-runner.html` | Full browser test suite | - |
| `index.html` | Main application | 16,805 |

## Key Formulas

**EWMA**: `current * 0.3 + previous * 0.7`
**TDEE**: `avgCalories + ((-weightDelta * 7716) / trackedDays)` (kg)
**4-week rolling TDEE**: Smoothed average over 4 weeks
**Gap handling**: Conservative mode - excludes non-tracked days from TDEE calc

## TDEE Functions

| Function | Purpose | Window |
|----------|---------|--------|
| `calculateFastTDEE` | 7-day reactive TDEE using EWMA weight delta | 7 days |
| `calculateStableTDEE` | 14-day sliding window regression on EWMA weights | 14 days |
| `calculateEWMAWeightDelta` | Smoothed weight change (first/last EWMA values) | Period |
| `excludeCalorieOutliers` | Detects cheat days >2.5 std dev from mean | - |
| `calculateSmoothTDEEArray` | EWMA smoothing over weekly TDEEs for chart | Variable |

## Constants

- **MIN_TRACKED_DAYS**: 4 (minimum calorie-tracked days for valid TDEE)
- **CALORIES_PER_KG**: 7716 (~3500 cal/lb × 2.205)
- **CALORIES_PER_LB**: 3500
- **DEFAULT_ALPHA**: 0.3 (EWMA smoothing factor)
- **VOLATILE_ALPHA**: 0.1 (for volatile periods, CV > 2%)

## Confidence Levels

| Level | Criteria | Accuracy |
|-------|----------|----------|
| High | 6+ tracked days | ±5% |
| Medium | 4-5 tracked days | ±10% |
| Low | <4 days or >2 day weight gap | Unreliable |

## Fallback Methods

**Theoretical TDEE**: Mifflin-St Jeor BMR × Activity Level (when data missing)

**Hybrid History**: Chart uses Theoretical TDEE when calculated TDEE has low confidence (prevents artificially low dips)

## Testing Requirements

- Run `node tests/node-test.js` before committing calculation changes
- 29 tests must pass (calculator, storage, utils, BMR)
- Never skip testing - automated tests catch regressions
- Browser tests available in `tests/test-runner.html`

## Python Scripting

Use Python 3.12 with venv:
```bash
python3 -m venv env
source venv/bin/activate
```

## Related Documentation

- `.opencode/context/project-intelligence/` - Business and technical domain docs
- `.opencode/context/project/tdee-algorithms.md` - Detailed algorithm specifications
- `tests/` - Test suite documentation

---

> **Note**: This file supersedes `GEMINI.md`. `GEMINI.md` kept for backward compatibility.
