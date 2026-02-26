# UI Components

> Dashboard, charts, entry forms, settings. Vanilla JS with manual DOM manipulation.

## Overview

**Files**: 6 UI modules (components, dailyEntry, weeklyView, dashboard, settings, chart).
**Pattern**: IIFE modules, direct DOM access, no virtual DOM.
**Dependencies**: `Calculator`, `Storage`, `Utils`, `Components` (shared utilities).

## Structure

```
js/ui/
├── components.js     # Shared UI utilities, modals, theme (158 lines)
├── dailyEntry.js     # Weight/calorie input form (182 lines)
├── weeklyView.js     # Weekly summary table (169 lines)
├── dashboard.js      # Stats cards, TDEE display (270 lines)
├── settings.js       # User preferences, units, theme (185 lines)
└── chart.js          # TDEE history chart (513 lines)
```

## Where to Look

| Task | File | Key Functions |
|------|------|---------------|
| Shared DOM helpers | `components.js` | `createElement`, `openModal`, `applyTheme` |
| Daily input form | `dailyEntry.js` | `init`, `render`, `handleSave` |
| Weekly table | `weeklyView.js` | `init`, `renderWeek`, `calculateWeekSummary` |
| Stats dashboard | `dashboard.js` | `init`, `updateStats`, `renderTrends` |
| Settings modal | `settings.js` | `init`, `saveSettings`, `exportData` |
| TDEE chart | `chart.js` | `init`, `renderChart`, `drawTDEEHistory` |

## Code Map

| Symbol | File | Lines | Purpose |
|--------|------|-------|---------|
| `Components.openModal` | `components.js:45` | 8 | Modal dialog manager |
| `Components.applyTheme` | `components.js:90` | 15 | Theme switching (light/dark/system) |
| `DailyEntry.init` | `dailyEntry.js:15` | 20 | Form initialization, event listeners |
| `DailyEntry.handleSave` | `dailyEntry.js:60` | 25 | Validate and save entry |
| `WeeklyView.renderWeek` | `weeklyView.js:40` | 30 | Render week row with stats |
| `Dashboard.updateStats` | `dashboard.js:50` | 35 | Update all stat cards |
| `Chart.renderChart` | `chart.js:100` | 50 | Canvas-based TDEE chart |
| `Settings.saveSettings` | `settings.js:70` | 20 | Persist user preferences |

## Conventions

**Module Pattern**:
```javascript
const Dashboard = (function () {
    'use strict';
    
    // DOM element cache
    let statsCard, tdeeDisplay, confidenceBadge;
    
    function init() {
        // Cache DOM elements
        statsCard = document.getElementById('dashboard');
        // Bind events
        bindEvents();
    }
    
    function bindEvents() {
        // Event handlers
    }
    
    function updateStats() {
        // Read from Storage, update DOM
    }
    
    return { init, updateStats };
})();
```

**DOM Caching**: Cache elements in module closure on `init()`, don't re-query.
**Event Binding**: Bind in `init()` or dedicated `bindEvents()`, never inline.
**State Management**: Read from `Storage`, compute with `Calculator`, render to DOM.

## Anti-Patterns

- ❌ **DO NOT** use frameworks (React, Vue) — vanilla JS only
- ❌ **DO NOT** use build tools — direct script loading
- ❌ **DO NOT** query DOM repeatedly — cache in `init()`
- ❌ **DO NOT** inline event handlers — use `addEventListener`
- ❌ **DO NOT** mutate state directly — always go through `Storage` module
- ❌ **DO NOT** hardcode theme colors — use CSS variables

## Unique Styles

**Theme System**:
```javascript
// Theme stored in localStorage, applied on init
const settings = Storage.getSettings();
Components.applyTheme(settings.theme || 'system');

// Themes: 'light', 'dark', 'system'
// CSS variables handle color switching
```

**Modal Pattern**:
```javascript
// All modals managed by Components module
Components.openModal('settings-modal');
Components.closeModal('settings-modal');

// Modal HTML defined in index.html, hidden by default
```

**Chart Rendering**:
```javascript
// Canvas-based, no chart library
const ctx = document.getElementById('tdee-chart').getContext('2d');
Chart.renderChart(ctx, tdeeHistory);

// Custom drawing: lines, labels, grid, tooltips
```

**Keyboard Shortcuts** (global, in `app.js`):
```javascript
// Ctrl/Cmd + S → Save entry
// Ctrl/Cmd + , → Open settings
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('save-entry-btn')?.click();
    }
});
```

## CSS Integration

**Stylesheet**: `css/styles.css` (2245 lines)
**Pattern**: BEM-like naming, CSS variables for theming.

```css
/* Theme variables */
:root {
    --bg-primary: #0d1117;
    --text-primary: #c9d1d9;
    --accent: #58a6ff;
}

/* Component classes */
.stat-card { }
.stat-card.primary { }
.stat-label { }
.stat-value { }
```

**Technical Debt**: 4 `!important` rules in `styles.css` — avoid adding more.

## Testing

**Browser Tests**: `tests/test-runner.html` (full UI integration tests)
**Node.js Tests**: Limited (UI requires browser environment)

```bash
# Run browser tests
open tests/test-runner.html

# Test dashboard rendering
# See tests/node-test.js (dashboard-related tests skipped in Node.js)
```

**Test Strategy**:
- Manual testing for visual components
- Automated tests for logic (calculator, storage)
- Browser tests for integration (localStorage + DOM)

## Notes

- **chart.js**: 513 lines (largest UI file) — complexity hotspot
- **components.js**: Shared utilities used by all other UI modules
- **No mocking**: UI tests require real browser environment
- **Accessibility**: ARIA labels on buttons, keyboard navigation support
