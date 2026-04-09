# Final QA Learnings

## QA Results (2026-04-07)
**VERDICT: APPROVE** — 13/13 tests pass

## Key Findings

### TDEE Calculations
- **7-Day Fast TDEE**: Returns `null` with `confidence: "none"` — correct behavior when insufficient tracked days (6 tracked, needs 8+)
- **14-Day Stable TDEE**: Returns 3323 kcal with `confidence: "low"` — within physiological bounds (800-5000), uses calorie-average fallback due to insufficient weight-calorie correlation days
- **Physiological validation**: Correctly returns `null` for impossible TDEE values (tested with 10kg weight swing)

### Water Weight Detection
- `detectWaterWeight()` is an internal function in `calculator-tdee.js`, NOT exposed on `Calculator` or `TDEE` public API
- Water weight detection works internally — 7-day TDEE returns null when data is unreliable
- The creatine loading spike (+2.4kg/week) in sample data causes TDEE to return null rather than impossible values

### Confidence Scoring
- `calculateMultiFactorConfidence` is exported on `TDEE` module, not `Calculator`
- Sample data shows `confidence: "low"` for 14-day period (11 tracked days out of 14)
- Confidence correctly reflects data quality

### UI Behavior
- UI correctly shows "Need 14 more days" when sample data is stale (ends 2026-03-13, today is 2026-04-07)
- Current weight (76.2 kg) displays correctly from EWMA calculation
- Dashboard falls back gracefully when no recent data exists
- **Important**: Dashboard takes last 14 days from TODAY, not from last entry date. Stale data = empty recent window.

### Edge Cases
- Null weight entries (3): Handled correctly, excluded from calculations
- Null calorie entries (5): Handled correctly, don't break TDEE calculation
- Empty state: Shows "—" placeholders correctly

### Module Exports
- `Calculator`: calculateFastTDEE, calculateStableTDEE, calculatePeriodTDEE, processEntriesWithGaps, etc.
- `TDEE`: calculateMultiFactorConfidence, calculateFastTDEE, calculateStableTDEE, etc.
- `detectWaterWeight` is INTERNAL to calculator-tdee.js, not publicly exposed

### Playwright Setup
- Chrome not available at /opt/google/chrome/chrome
- Use Playwright's bundled Chromium at `~/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome`
- Port 8080 was occupied by qBittorrent, used 9876 instead
