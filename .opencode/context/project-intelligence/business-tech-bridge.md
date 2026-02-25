<!-- Context: project-intelligence/bridge | Priority: high | Version: 1.1 | Updated: 2026-02-25 -->

# Business ↔ Tech Bridge

> Document how TDEE Tracker business needs translate to technical solutions.

## Core Mapping

| Business Need | Technical Solution | Why This Mapping |
|---------------|-------------------|------------------|
| Accurate weight tracking despite water/glycogen fluctuations | EWMA smoothing (α=0.3, ratio 0.3/0.7) | Exponentially weighted moving average reduces noise while preserving trends |
| No backend setup or server costs | LocalStorage persistence (no database) | Browser-native storage, zero infrastructure, works offline |
| Mobile accessibility without app store | PWA with manifest.json + service worker | Installable web app, works offline, no app store approval |
| Accurate TDEE despite irregular tracking | Conservative gap handling (excludes non-tracked days) | Prevents dilution of TDEE estimate with days lacking calorie data |
| Reliable TDEE with minimum data | MIN_TRACKED_DAYS=4 constant | Ensures statistical significance before showing estimate |
| Protection against cheat day skewing | excludeCalorieOutliers (>2.5 std dev) | Detects anomalous days that would distort TDEE |
| Fast response to metabolic changes | calculateFastTDEE (7-day window, EWMA delta) | Reactive TDEE using smoothed weight changes |
| Robust long-term estimation | calculateStableTDEE (14-day regression) | Regression on EWMA weights robust to fluctuations |

## Key Feature Mappings

### Feature: Weight Smoothing

**Business Context**: Daily weight fluctuates 1-3 lbs due to water/glycogen, confusing users

**Technical Implementation**: EWMA with α=0.3 in `calculateEWMA()` function

**Connection**: Users see smooth trend line instead of noisy daily fluctuations, improving adherence

### Feature: Offline-First Architecture

**Business Context**: Users want zero-setup tracking without creating accounts

**Technical Implementation**: LocalStorage API in `storage.js`, no backend required

**Connection**: Instant setup (open browser, start tracking), no server costs, data stays private on device

### Feature: Conservative TDEE Calculation

**Business Context**: Users skip tracking some days; need accurate TDEE anyway

**Technical Implementation**: Gap handling excludes non-tracked days from denominator

**Connection**: TDEE remains accurate even with irregular tracking; no penalty for missed days

## Related Files

- `business-domain.md` - Business problem and value proposition
- `technical-domain.md` - Technical stack and architecture
- `../project/tdee-algorithms.md` - Detailed calculation formulas
