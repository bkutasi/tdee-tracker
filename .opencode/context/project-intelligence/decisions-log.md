<!-- Context: project-intelligence/decisions | Priority: high | Version: 1.1 | Updated: 2026-02-25 -->

# Decisions Log

> Record TDEE Tracker architectural decisions with full context.

## Decision 1: Vanilla JavaScript over React/Vue

**Date**: 2026-01-10
**Status**: Decided
**Owner**: Project Team

### Context
Need simple, fast-loading TDEE tracker without build complexity

### Decision
Use vanilla ES6 modules with IIFE pattern, no framework or build tools

### Rationale
Zero build step, instant page load, simpler maintenance, no dependency management

### Alternatives Considered
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| React | Large ecosystem, familiar | Build step, bundle size, overhead | Overkill for single-page app |
| Vue | Easier learning curve | Build step, runtime overhead | Unnecessary complexity |
| Svelte | No runtime, small bundle | Compilation step, newer ecosystem | Build step still required |

### Impact
**Positive**: Instant load, no build pipeline, trivial deployment
**Negative**: Manual DOM management, less component reusability
**Risk**: Harder to scale if app grows significantly

---

## Decision 2: LocalStorage over Backend Database

**Date**: 2026-01-10
**Status**: Decided
**Owner**: Project Team

### Context
Users want zero-setup TDEE tracking without accounts or servers

### Decision
Browser LocalStorage API for all data persistence

### Rationale
Offline-first, zero server costs, instant setup, privacy (data stays on device)

### Alternatives Considered
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| PostgreSQL | Robust, queries, sync | Requires backend, hosting costs | Violates zero-setup goal |
| Firebase | Easy setup, sync | Costs at scale, online required | Ongoing costs, privacy concerns |
| IndexedDB | More storage, structured | Complex API, browser inconsistencies | LocalStorage simpler for this use case |

### Impact
**Positive**: Zero infrastructure, works offline, instant setup, private
**Negative**: No cross-device sync, storage limits (~5-10MB), device-bound
**Risk**: Data loss if user clears browser data (mitigated by export feature)

---

## Decision 3: Conservative Gap Handling

**Date**: 2026-01-12
**Status**: Decided
**Owner**: Project Team

### Context
Users don't track calories every single day; need accurate TDEE despite gaps

### Decision
Exclude non-tracked days from TDEE calculation denominator

### Rationale
Prevents dilution of TDEE estimate; only days with calorie data count toward calculation

### Alternatives Considered
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Use all calendar days | Simple, consistent | Dilutes accuracy with non-tracked days | Inaccurate TDEE estimates |
| Impute missing days | Uses all data | Assumes maintenance calories (unreliable) | Adds assumptions, less accurate |
| Conservative (chosen) | Accurate, honest | Requires minimum tracked days | Most accurate approach |

### Impact
**Positive**: Accurate TDEE even with irregular tracking
**Negative**: Requires MIN_TRACKED_DAYS=4 threshold
**Risk**: Users with sparse tracking see fewer TDEE estimates

---

## Decision 4: TDEE Formula Constant (7716 cal/kg)

**Date**: 2026-01-10
**Status**: Decided
**Owner**: Project Team

### Context
Need energy balance equation constant for TDEE calculation

### Decision
Use 7716 calories per kg of body weight

### Rationale
Based on Excel analysis: ~3500 cal/lb × 2.205 lb/kg = 7716 cal/kg

### Alternatives Considered
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| 7700 cal/kg | Round number | Less accurate | 7716 more precise |
| 3500 cal/lb only | Simple for imperial | Requires conversion logic | Need metric support |

### Impact
**Positive**: Accurate energy balance calculation, supports both kg/lb
**Negative**: None significant
**Risk**: Individual variation in actual caloric deficit per kg lost

---

## Decision 5: EWMA Ratio (0.3/0.7)

**Date**: 2026-01-10
**Status**: Decided
**Owner**: Project Team

### Context
Weight data is noisy due to water retention, glycogen, sodium

### Decision
EWMA with α=0.3 (current gets 30% weight, previous gets 70%)

### Rationale
Balances responsiveness to real changes with noise reduction

### Alternatives Considered
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| α=0.5 | More responsive | Too reactive to daily noise | Shows too much fluctuation |
| α=0.1 | Very smooth | Slow to respond to real changes | Delays feedback to user |
| α=0.3 (chosen) | Balanced | Trade-off between both | Optimal balance |

### Impact
**Positive**: Smooth trend line, responsive to real changes
**Negative**: Still some lag in rapidly changing weight
**Risk**: May need recalibration for different tracking frequencies

---

## Decision 6: MIN_TRACKED_DAYS=4

**Date**: 2026-01-12
**Status**: Decided
**Owner**: Project Team

### Context
Need minimum data threshold for valid TDEE estimate

### Decision
Require at least 4 calorie-tracked days for TDEE calculation

### Rationale
Statistical significance threshold; fewer days produce unreliable estimates

### Alternatives Considered
| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| 3 days | Faster feedback | Too few data points, unreliable | High variance in estimates |
| 7 days | More reliable | Delays feedback significantly | Users wait too long |
| 4 days (chosen) | Balanced | Still some variance | Good balance of speed/accuracy |

### Impact
**Positive**: Prevents showing unreliable TDEE estimates
**Negative**: Users must track 4+ days before seeing results
**Risk**: May discourage users wanting instant feedback

---

## Related Files

- `technical-domain.md` - Technical stack and architecture
- `business-tech-bridge.md` - Business needs to solutions mapping
- `../project/tdee-algorithms.md` - Calculation algorithm details
