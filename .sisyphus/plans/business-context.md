# Business Context — TDEE Tracker

> Why this app exists, who it's for, and what success looks like.
> Migrated from `.opencode/context/project-intelligence/business-domain.md` on 2026-04-08.

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | TDEE Tracker |
| **Tagline** | Accurate Total Daily Energy Expenditure tracking with EWMA smoothing |
| **Problem** | Weight tracking is noisy (water, glycogen), making TDEE estimation inaccurate |
| **Solution** | EWMA smoothing (α=0.3), conservative gap handling, offline-first PWA |

## Target Users

| Segment | Who | Needs | Pain Points |
|---------|-----|-------|-------------|
| **Primary** | Fitness enthusiasts tracking weight & calories | Accurate TDEE without spreadsheets | Manual calculations, backend complexity |
| **Secondary** | People managing weight (loss/maintenance/gain) | Simple daily tracking | Inconsistent data, no trend visibility |

## Value Proposition

**For Users:**
- Accurate TDEE using EWMA weight smoothing (reduces water/glycogen noise)
- No backend required — LocalStorage persistence, works offline
- PWA — installable on mobile devices
- Conservative gap handling — excludes non-tracked days from calculations
- Automated tests ensure calculation accuracy

**For Business:**
- Zero infrastructure costs (no backend)
- Low maintenance (offline-first architecture)
- Open-source, free

## Success Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Calculation Accuracy | TDEE within ±5% of actual | ±5% |
| User Retention | Consistent daily tracking | 70% week-over-week |
| Test Coverage | Passing automated tests | 100% |

## Business Constraints

- **No backend** — Must work entirely client-side (LocalStorage)
- **Offline-first** — Must function without network connectivity
- **PWA compatible** — Must be installable on mobile devices
- **Open-source** — No monetization planned

## Live Demo

https://tdee.kutasi.dev
