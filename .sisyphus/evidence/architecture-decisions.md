# Architecture Decisions Log — TDEE Tracker

> Record of architectural decisions with rationale, alternatives considered, and rejection reasons.
> Migrated from `.opencode/context/project-intelligence/decisions-log.md` on 2026-04-08.

## Decision 1: Vanilla JavaScript over React/Vue

**Date**: 2026-01-10 | **Status**: Decided

**Decision**: Use vanilla ES6 modules with IIFE pattern, no framework or build tools.

**Rationale**: Zero build step, instant page load, simpler maintenance, no dependency management.

| Alternative | Why Rejected |
|-------------|-------------|
| React | Build step, bundle size, overhead — overkill for single-page app |
| Vue | Build step, runtime overhead — unnecessary complexity |
| Svelte | Compilation step still required — build step still required |

**Impact**: (+) Instant load, no build pipeline, trivial deployment. (−) Manual DOM management, harder to scale if app grows significantly.

---

## Decision 2: LocalStorage over Backend Database

**Date**: 2026-01-10 | **Status**: Decided

**Decision**: Browser LocalStorage API for all data persistence.

**Rationale**: Offline-first, zero server costs, instant setup, privacy (data stays on device).

| Alternative | Why Rejected |
|-------------|-------------|
| PostgreSQL | Requires backend, hosting costs — violates zero-setup goal |
| Firebase | Costs at scale, online required — ongoing costs, privacy concerns |
| IndexedDB | Complex API, browser inconsistencies — LocalStorage simpler for this use case |

**Impact**: (+) Zero infrastructure, works offline, instant setup, private. (−) No cross-device sync, storage limits (~5-10MB), device-bound. Risk: data loss if user clears browser data (mitigated by export feature).

---

## Decision 3: Conservative Gap Handling

**Date**: 2026-01-12 | **Status**: Decided

**Decision**: Exclude non-tracked days from TDEE calculation denominator.

**Rationale**: Prevents dilution of TDEE estimate; only days with calorie data count toward calculation.

| Alternative | Why Rejected |
|-------------|-------------|
| Use all calendar days | Dilutes accuracy with non-tracked days — inaccurate TDEE estimates |
| Impute missing days | Assumes maintenance calories (unreliable) — adds assumptions, less accurate |

**Impact**: (+) Accurate TDEE even with irregular tracking. (−) Requires MIN_TRACKED_DAYS=4 threshold. Risk: users with sparse tracking see fewer TDEE estimates.

---

## Decision 4: TDEE Formula Constant (7716 cal/kg)

**Date**: 2026-01-10 | **Status**: Decided

**Decision**: Use 7716 calories per kg of body weight.

**Rationale**: Based on Excel analysis: ~3500 cal/lb × 2.205 lb/kg = 7716 cal/kg.

| Alternative | Why Rejected |
|-------------|-------------|
| 7700 cal/kg | Less accurate — 7716 more precise |
| 3500 cal/lb only | Need metric support — requires conversion logic |

**Impact**: (+) Accurate energy balance calculation, supports both kg/lb. (−) None significant. Risk: individual variation in actual caloric deficit per kg lost.

---

## Decision 5: EWMA Ratio (0.3/0.7)

**Date**: 2026-01-10 | **Status**: Decided

**Decision**: EWMA with α=0.3 (current gets 30% weight, previous gets 70%).

**Rationale**: Balances responsiveness to real changes with noise reduction.

| Alternative | Why Rejected |
|-------------|-------------|
| α=0.5 | Too reactive to daily noise — shows too much fluctuation |
| α=0.1 | Slow to respond to real changes — delays feedback to user |

**Impact**: (+) Smooth trend line, responsive to real changes. (−) Still some lag in rapidly changing weight. Risk: may need recalibration for different tracking frequencies.

---

## Decision 6: MIN_TRACKED_DAYS=4

**Date**: 2026-01-12 | **Status**: Decided

**Decision**: Require at least 4 calorie-tracked days for TDEE calculation.

**Rationale**: Statistical significance threshold; fewer days produce unreliable estimates.

| Alternative | Why Rejected |
|-------------|-------------|
| 3 days | Too few data points, unreliable — high variance in estimates |
| 7 days | Delays feedback significantly — users wait too long |

**Impact**: (+) Prevents showing unreliable TDEE estimates. (−) Users must track 4+ days before seeing results. Risk: may discourage users wanting instant feedback.
