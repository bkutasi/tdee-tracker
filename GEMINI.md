## Agent Guidelines
- **Precision**: Fix floating-point issues (`0.0000002`) wherever found.
- **Verification**: Always verify changes with small test scripts or by modifying `tests/`.
- **Style**: Maintain the vanilla JS structure. Do not introduce build tools (Webpack/Vite) unless explicitly requested.
- **Testing**: Always test changes with the test suite and small test scripts. Never use browser tool - rely on automated tests.
- **Commit Messages**: Use conventional commit messages. And commit after you tested successfully.
- **Gemini.md**: Update this file after every change, or important insights.

## Project Structure
- `js/calculator.js` - EWMA, TDEE calculation, gap handling (core math)
- `js/storage.js` - LocalStorage persistence with import/export
- `js/utils.js` - Date handling, validation, helpers
- `js/ui/*.js` - UI components (dashboard, entries, weekly, chart, settings)
- `tests/node-test.js` - Quick Node.js test runner (15 tests)
- `tests/test-runner.html` - Full browser test suite

## Key Formulas (from Excel)
- **EWMA**: `current * 0.3 + previous * 0.7`
- **TDEE**: `avgCalories + ((-weightDelta * 7716) / trackedDays)` (kg)
- **6-week rolling TDEE**: Smoothed average over 6 weeks
- **Gap handling**: Conservative mode - excludes non-tracked days from TDEE calc