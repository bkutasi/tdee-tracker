# TDEE Tracker

> Total Daily Energy Expenditure Tracker — Vanilla JavaScript PWA with offline support

[![Deploy to Cloudflare Pages](https://github.com/bkutasi/tdee-tracker/actions/workflows/deploy.yml/badge.svg)](https://github.com/bkutasi/tdee-tracker/actions/workflows/deploy.yml)
[![Tests](https://img.shields.io/badge/tests-80+-blue)](tests/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success)](package.json)

**Live Demo**: https://tdee.kutasi.dev

---

## Features

- 📊 **TDEE Calculation** — EWMA smoothing, regression analysis, confidence scoring
- 📈 **Progress Tracking** — Weight trends, calorie intake, theoretical vs actual TDEE
- 📱 **PWA Support** — Install on any device, works offline
- 💾 **LocalStorage** — All data stored locally, export/import JSON
- 🧮 **80+ Automated Tests** — Comprehensive test suite ensures reliability
- ⚡ **Zero Dependencies** — Pure vanilla JavaScript, no npm packages

---

## Quick Start

### Run Locally

```bash
# Clone the repository
git clone https://github.com/bkutasi/tdee-tracker.git
cd tdee-tracker

# Open in browser (no build step required)
open index.html

# Or serve with a local server
npx serve .
```

### Run Tests

```bash
# Node.js test runner
node tests/node-test.js

# Or use the shell script
./run-tests.sh
```

---

## Project Structure

```
tdee-tracker/
├── index.html          # Main application (17k lines)
├── js/
│   ├── app.js          # Initialization coordinator
│   ├── calculator.js   # TDEE algorithms (EWMA, regression)
│   ├── storage.js      # LocalStorage wrapper
│   ├── utils.js        # Date/validation helpers
│   └── ui/             # Dashboard, chart, entries components
├── css/styles.css      # All styles (2.2k lines)
├── tests/              # 80+ automated tests
├── sw.js               # Service worker (PWA offline support)
├── manifest.json       # PWA manifest
└── icons/              # App icons
```

---

## Architecture

**Module Pattern**: IIFE (Immediately Invoked Function Expression) with strict mode  
**Script Loading**: Manual dependency graph in HTML (utils → calculator → storage → ui → app)  
**Data Persistence**: LocalStorage with JSON export/import  
**Testing**: Custom test framework with Node.js and browser runners  

### Key Modules

| Module | File | Purpose |
|--------|------|---------|
| `Calculator` | `js/calculator.js` | Core TDEE engine (EWMA, regression, confidence) |
| `Storage` | `js/storage.js` | LocalStorage persistence, import/export |
| `Utils` | `js/utils.js` | Date parsing, validation, formatting |
| `Dashboard` | `js/ui/dashboard.js` | Stats cards, TDEE display |
| `Chart` | `js/ui/chart.js` | TDEE history visualization |

---

## Deployment

### Cloudflare Pages (Production)

This project is deployed to Cloudflare Pages with automated CI/CD:

- **Production URL**: https://tdee.kutasi.dev
- **Backup URL**: https://tdee-tracker.pages.dev
- **Deployment**: Automatic on push to `master` branch
- **Test Gating**: Deployment blocked if tests fail
- **Preview Deployments**: Automatic for feature branches

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for setup instructions.

### Deploy Manually

```bash
# Install wrangler CLI
npm install -g wrangler

# Authenticate
wrangler login

# Deploy to Cloudflare Pages
wrangler pages deploy . --project-name=tdee-tracker --branch=master
```

---

## Development

### Prerequisites

- Node.js 18+ (for running tests)
- Modern browser with DevTools
- wrangler CLI (for deployment)

### Running Tests

```bash
# Run all tests
node tests/node-test.js

# Run with verbose output
node tests/node-test.js --verbose

# Browser test runner
open tests/test-runner.html
```

### Test Coverage

| Category | Coverage | Tests |
|----------|----------|-------|
| Calculator | 100% | EWMA, regression, confidence, outliers |
| Storage | 95% | CRUD operations, import/export |
| Utils | 90% | Date parsing, validation, formatting |
| UI Components | 85% | Dashboard, chart, entries |

---

## Key Formulas

### EWMA (Exponentially Weighted Moving Average)

```javascript
current = calories * 0.3 + previous * 0.7
```

### TDEE Calculation

```javascript
TDEE = avgCalories + ((-weightDelta * 7716) / trackedDays)
// 7716 = calories per kg of body weight
```

### Confidence Levels

| Days Tracked | Confidence | Margin of Error |
|--------------|------------|-----------------|
| 6+ days | High | ±5% |
| 4-5 days | Medium | ±10% |
| <4 days | Low | ±15% |

---

## Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `MIN_TRACKED_DAYS` | 4 | Minimum for valid TDEE |
| `CALORIES_PER_KG` | 7716 | Energy density (3500 cal/lb × 2.205) |
| `DEFAULT_ALPHA` | 0.3 | EWMA smoothing factor |
| `VOLATILE_ALPHA` | 0.1 | Reduced alpha for volatile periods |
| `OUTLIER_THRESHOLD` | 3 | Std devs for calorie outlier detection |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`node tests/node-test.js`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Pull Request Requirements

- ✅ All tests passing
- ✅ Code follows existing patterns (IIFE modules, strict mode)
- ✅ No npm dependencies added
- ✅ Browser compatibility maintained (no ES6 modules)

---

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Deployment guide, CI/CD setup, troubleshooting
- **[AGENTS.md](AGENTS.md)** — Agent guidelines, code map, conventions
- **[GEMINI.md](GEMINI.md)** — Legacy documentation (deprecated)

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Mobile Safari | iOS 14+ | ✅ Full |
| Chrome Mobile | Android 9+ | ✅ Full |

---

## Performance

| Metric | Value |
|--------|-------|
| Bundle Size | ~50KB (gzipped) |
| First Contentful Paint | <1s |
| Time to Interactive | <2s |
| Lighthouse Score | 95+ |
| Offline Support | ✅ Full |

---

## License

MIT License — See LICENSE file for details

---

## Acknowledgments

- TDEE algorithms based on peer-reviewed nutrition science
- EWMA smoothing adapted from financial time series analysis
- Test framework inspired by QUnit and Jest

---

**Last Updated**: 2026-02-26  
**Version**: 1.0
