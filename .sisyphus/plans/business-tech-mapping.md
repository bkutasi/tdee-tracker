# Business ↔ Tech Bridge — TDEE Tracker

> How business needs translate to technical solutions.
> Migrated from `.opencode/context/project-intelligence/business-tech-bridge.md` on 2026-04-08.

## Core Mapping

| Business Need | Technical Solution | Why |
|---------------|-------------------|-----|
| Accurate weight tracking despite water/glycogen fluctuations | EWMA smoothing (α=0.3, ratio 0.3/0.7) | Exponentially weighted moving average reduces noise while preserving trends |
| No backend setup or server costs | LocalStorage persistence | Browser-native storage, zero infrastructure, works offline |
| Mobile accessibility without app store | PWA with manifest.json + service worker | Installable web app, works offline, no app store approval |
| Accurate TDEE despite irregular tracking | Conservative gap handling (excludes non-tracked days) | Prevents dilution of TDEE estimate with days lacking calorie data |
| Reliable TDEE with minimum data | MIN_TRACKED_DAYS=4 constant | Ensures statistical significance before showing estimate |
| Protection against cheat day skewing | excludeCalorieOutliers (>2.5 std dev) | Detects anomalous days that would distort TDEE |
| Fast response to metabolic changes | calculateFastTDEE (7-day window, EWMA delta) | Reactive TDEE using smoothed weight changes |
| Robust long-term estimation | calculateStableTDEE (14-day regression) | Regression on EWMA weights robust to fluctuations |

## Key Feature Mappings

### Weight Smoothing
- **Business**: Daily weight fluctuates 1-3 lbs due to water/glycogen, confusing users
- **Technical**: EWMA with α=0.3 in `calculateEWMA()` function
- **Connection**: Users see smooth trend line instead of noisy daily fluctuations, improving adherence

### Offline-First Architecture
- **Business**: Users want zero-setup tracking without creating accounts
- **Technical**: LocalStorage API in `storage.js`, no backend required
- **Connection**: Instant setup (open browser, start tracking), no server costs, data stays private on device

### Conservative TDEE Calculation
- **Business**: Users skip tracking some days; need accurate TDEE anyway
- **Technical**: Gap handling excludes non-tracked days from denominator
- **Connection**: TDEE remains accurate even with irregular tracking; no penalty for missed days

## Related Files
- `AGENTS.md` Sections 12-15 — Algorithms, constants, formulas
- `.sisyphus/plans/business-context.md` — Business problem and value proposition
- `.sisyphus/evidence/architecture-decisions.md` — Decision history with alternatives
