<!-- Context: project-intelligence/business | Priority: high | Version: 1.0 | Updated: 2026-02-25 -->

# Business Domain

> Accurate TDEE tracking with EWMA smoothing — no backend required.

## Quick Reference

- **Purpose**: Understand why TDEE Tracker exists
- **Update When**: Business direction changes, new features shipped, pivot
- **Audience**: Developers needing context, stakeholders, product team

## Project Identity

```
Project Name: TDEE Tracker
Tagline: Accurate Total Daily Energy Expenditure tracking with EWMA smoothing
Problem: Weight tracking is noisy (water, glycogen), making TDEE estimation inaccurate
Solution: EWMA smoothing (α=0.3), conservative gap handling, offline-first PWA
```

## Target Users

| User Segment | Who They Are | What They Need | Pain Points |
|--------------|--------------|----------------|-------------|
| Primary | Fitness enthusiasts tracking weight & calories | Accurate TDEE without spreadsheets | Manual calculations, backend complexity |
| Secondary | People managing weight (loss/maintenance/gain) | Simple daily tracking | Inconsistent data, no trend visibility |

## Value Proposition

**For Users**:
- Accurate TDEE using EWMA weight smoothing (reduces water/glycogen noise)
- No backend required — LocalStorage persistence, works offline
- PWA — installable on mobile devices
- Conservative gap handling — excludes non-tracked days from calculations
- 29 automated tests ensure calculation accuracy

**For Business**:
- Zero infrastructure costs (no backend)
- Low maintenance (offline-first architecture)

## Success Metrics

| Metric | Definition | Target | Current |
|--------|------------|--------|---------|
| Calculation Accuracy | TDEE within ±5% of actual | ±5% | Validated via tests |
| User Retention | Consistent daily tracking | 70% week-over-week | TBD |
| Test Coverage | Passing automated tests | 100% | 29/29 passing |

## Business Model

```
Revenue Model: Open-source (no monetization planned)
Pricing Strategy: Free
Unit Economics: N/A (no backend costs)
Market Position: Most accurate consumer TDEE tracking without backend complexity
```

## Key Stakeholders

| Role | Name | Responsibility | Contact |
|------|------|----------------|---------|
| Product Owner | Developer | Vision, roadmap | N/A |
| Tech Lead | Developer | Architecture, code quality | N/A |

## Roadmap Context

**Current Focus**: Project intelligence initialization for AI agent context
**Next Milestone**: Core TDEE calculation engine with EWMA smoothing
**Long-term Vision**: Most accurate consumer TDEE tracking without backend complexity

## Business Constraints

- **No backend** — Must work entirely client-side (LocalStorage)
- **Offline-first** — Must function without network connectivity
- **PWA compatible** — Must be installable on mobile devices

## Onboarding Checklist

- [ ] Understand the problem statement (noisy weight data)
- [ ] Identify target users and their needs (accurate TDEE)
- [ ] Know the key value proposition (EWMA smoothing, offline-first)
- [ ] Understand success metrics (±5% accuracy, 29 tests)
- [ ] Know current business constraints (no backend, offline-first)

## Related Files

- `technical-domain.md` - How this business need is solved technically
- `business-tech-bridge.md` - Mapping between business and technical
- `decisions-log.md` - Business decisions with context
