## Agent Guidelines
- **Precision**: Fix floating-point issues (`0.0000002`) wherever found.
- **Verification**: Always verify changes with small test scripts or by modifying `tests/`.
- **Style**: Maintain the vanilla JS structure. Do not introduce build tools (Webpack/Vite) unless explicitly requested.
- **Testing**: Always test changes with the test suite and small test scripts. Never use browser tool - rely on automated tests.
- **Commit Messages**: Always- **Commit Messages**: Always commit after changes. Use conventional commit messages. And commit after you tested successfully.
- **Gemini.md**: Update this file after every change, or important insights.
- **Python scripting**: Use Python 3.12. with venv with `python3 -m venv env` and `source venv/bin/activate`.

## Project Structure
- `js/calculator.js` - EWMA, TDEE calculation, gap handling (core math)
- `js/storage.js` - LocalStorage persistence with import/export
- `js/utils.js` - Date handling, validation, helpers
- `js/ui/*.js` - UI components (dashboard, entries, weekly, chart, settings)
- `tests/node-test.js` - Quick Node.js test runner (29 tests)
- `tests/test-runner.html` - Full browser test suite

## Key Formulas (from Excel)
- **EWMA**: `current * 0.3 + previous * 0.7`
- **TDEE**: `avgCalories + ((-weightDelta * 7716) / trackedDays)` (kg)
- **4-week rolling TDEE**: Smoothed average over 4 weeks
- **Gap handling**: Conservative mode - excludes non-tracked days from TDEE calc

## Robust TDEE Functions (Jan 2026)
- **calculateFastTDEE**: 7-day reactive TDEE using EWMA weight delta, min 4 tracked days
- **calculateStableTDEE**: 14-day sliding window regression on EWMA weights, robust to water/glycogen
- **calculateEWMAWeightDelta**: Smoothed weight change (first/last EWMA values)
- **excludeCalorieOutliers**: Detects cheat days >2.5 std dev from mean
- **calculateSmoothTDEEArray**: EWMA smoothing over weekly TDEEs for chart
- **MIN_TRACKED_DAYS**: Constant (4) - minimum calorie-tracked days for valid TDEE
- **Confidence levels**: high (6+ days), medium (4-5 days), low (<4 days or >2 day weight gap)
- **Theoretical TDEE**: Fallback using Mifflin-St Jeor BMR * Activity Level when data is missing.
- **Hybrid History**: Chart uses Theoretical TDEE when calculated TDEE has low confidence (missing days), preventing artificially low dips.