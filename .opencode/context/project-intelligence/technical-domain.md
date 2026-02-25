<!-- Context: project-intelligence/technical | Priority: high | Version: 1.1 | Updated: 2026-02-25 -->

# Technical Domain

> TDEE Tracker technical foundation, architecture, and key decisions.

## Quick Reference

- **Purpose**: Understand how TDEE Tracker works technically
- **Update When**: Stack changes, new features, refactoring
- **Audience**: Developers, contributors

## Primary Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Language | Vanilla JavaScript | ES6+ | No build tools, instant load |
| Runtime | Browser | Modern browsers | Client-side only, no Node.js required |
| Storage | LocalStorage API | Native | Offline-first, no server costs |
| PWA | manifest.json + sw.js | Native | Installable on mobile devices |
| Testing | Node.js test runner | Built-in | 29 tests in tests/node-test.js |

## Architecture Pattern

```
Type: Client-side only (no backend)
Pattern: Module pattern with IIFE (Immediately Invoked Function Expressions)
Entry: js/app.js → initializes UI modules and calculator
```

### Why This Architecture?

- **Simplicity**: No build step, no framework overhead
- **Offline-first**: Works without internet, data stays local
- **Instant setup**: Clone repo, open index.html in browser
- **Zero costs**: No server, no database, no hosting fees

## Project Structure

```
tdee-tracker/
├── index.html          # Main application (16,805 lines)
├── manifest.json       # PWA manifest
├── sw.js               # Service worker
├── js/
│   ├── app.js          # Entry point, module initialization
│   ├── calculator.js   # Core: EWMA, TDEE calc, gap handling (724 lines)
│   ├── storage.js      # LocalStorage persistence, import/export
│   ├── utils.js        # Date handling, validation, helpers
│   └── ui/             # UI components (dashboard, entries, weekly, chart, settings)
└── tests/
    ├── node-test.js    # 29 tests (Node.js runner)
    └── [browser tests]
```

**Key Modules**:
- `js/calculator.js` - Core math: EWMA smoothing (α=0.3), TDEE algorithms, conservative gap handling
- `js/storage.js` - LocalStorage wrapper with JSON import/export
- `js/ui/*.js` - Component-based UI (dashboard, entries list, weekly view, chart, settings)

## Key Technical Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Vanilla JS over React/Vue | No build tools, instant load, simpler codebase | Faster development, zero dependencies |
| LocalStorage over backend | Offline-first, no server costs, instant setup | Data stays on device, no sync complexity |
| Conservative gap handling | Exclude non-tracked days from TDEE calc | More accurate calorie estimates |
| EWMA smoothing (α=0.3) | Reduces water/glycogen noise in weight data | Smoother trend lines, better insights |

## Integration Points

| System | Purpose | Protocol | Direction |
|--------|---------|----------|-----------|
| LocalStorage API | Persist entries, settings | Native browser API | Internal |
| Browser File API | Import/export JSON backups | Native | Inbound/Outbound |

## Technical Constraints

| Constraint | Origin | Impact |
|------------|--------|--------|
| Browser storage limits | ~5-10MB per origin | Sufficient for years of daily entries |
| No cross-device sync | LocalStorage only | User must manually export/import |
| Single-device only | By design | Simpler architecture, no backend |

## Development Environment

```
Setup: Clone repo, open index.html in browser
Requirements: Modern browser (Chrome, Firefox, Safari)
Testing: node tests/node-test.js (29 tests)
No build step required
```

## Deployment

```
Environment: Static hosting (GitHub Pages, Netlify, or local file://)
Platform: Any static file server
CI/CD: None required
PWA: Installable on mobile devices via manifest.json + sw.js
```

## Related Files

- `business-domain.md` - Why TDEE Tracker exists
- `decisions-log.md` - Full decision history with alternatives
