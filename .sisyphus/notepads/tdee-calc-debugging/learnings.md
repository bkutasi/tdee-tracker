
## Task 1: Debug TDEE Script (2026-04-02)

### Created Script
- `scripts/debug-tdee.js` - Loads sample_data_export.json and calculates 7-day and 14-day TDEE

### Key Learnings

#### Module Loading Pattern
Modules must be loaded as globals before requiring dependent modules:
```javascript
global.Utils = require('../js/utils.js');
global.EWMA = require('../js/calculator-ewma.js');
const TDEE = require('../js/calculator-tdee.js');
```

This is required because `calculator-tdee.js` references `Utils` and `EWMA` during module initialization (line 1085-1087).

#### Sample Data Analysis
- 106 total entries (2025-11-23 to 2026-03-13)
- 103 entries with weight
- 101 entries with calories

#### 7-Day TDEE Results
- Tracked Days: 6 (below minimum of 7 for valid calculation)
- EWMA Delta: -1.330 kg (weight loss over 7 days)
- Average Calories: 3433 kcal
- **Result: null** (insufficient tracked days)

#### 14-Day TDEE Results
- Tracked Days: 12
- EWMA Delta: -0.520 kg
- Average Calories: 3292 kcal
- Slope: 0.5560 kg/day (positive = weight gain trend)
- CV: 67.00% (very high volatility)
- Has Large Gap: true
- **Result: 2679 kcal/day**

#### Discrepancy Analysis
- 7-day TDEE returns null because only 6 days have calorie data (needs min 7)
- 14-day TDEE returns 2679 kcal/day despite high volatility (CV 67%)
- High CV indicates unstable weight data, reducing confidence in TDEE estimate

### Output Location
- Evidence: `.sisyphus/evidence/task-1-debug-output.txt`

---

## Task 2: Research-Backed Test Scenarios (2026-04-02)

### Added 5 Test Scenarios to tests/calculator.test.js

#### Scenario 1: Maintenance (PASS)
- **Setup**: 14 days, stable weight (±0.1kg), 2500 cal/day
- **Expected**: TDEE ≈ 2500 kcal/day
- **Result**: PASS - TDEE calculated correctly (2400-2600 range)
- **Confidence**: medium (due to slight weight fluctuations)

#### Scenario 2: Cutting (PASS)
- **Setup**: 14 days, linear weight loss (0.5kg/week), 2000 cal/day
- **Expected**: TDEE ≈ 2554 kcal/day (2000 + 554 deficit)
- **Result**: PASS - TDEE in expected range (2450-2650)

#### Scenario 3: Bulking (PASS)
- **Setup**: 14 days, linear weight gain (0.5kg/week), 3000 cal/day
- **Expected**: TDEE ≈ 2446 kcal/day (3000 - 554 surplus)
- **Result**: PASS - TDEE in expected range (2350-2550)

#### Scenario 4: Water Weight Spike (FAIL - EXPECTED)
- **Setup**: 14 days, sudden +2.4kg spike at day 7, constant 2500 cal/day
- **Expected**: TDEE = null (unreliable data, water retention)
- **Result**: FAIL - Returns TDEE = 894 kcal/day (incorrectly confident)
- **Gap Identified**: No water weight detection logic exists

#### Scenario 5: Gap Handling (FAIL - EXPECTED)
- **Setup**: 21 days with 2-3 missing days/week (Mon, Tue, Thu, Sat only)
- **Expected**: TDEE calculated, hasLargeGap = true, reduced confidence
- **Result**: FAIL - hasLargeGap = false (gaps not detected)
- **Gap Identified**: Gap detection not working for intermittent tracking

### Test Output Location
- Evidence: `.sisyphus/evidence/task-2-failing-tests.txt`

### Key Findings
1. **Basic TDEE calculations work** (scenarios 1-3 pass)
2. **Water weight detection missing** - sudden +2.4kg/week produces false TDEE
3. **Gap detection missing** - intermittent tracking not flagged
4. **TDD approach validated** - tests fail as expected, proving gaps exist

### Next Steps (Future Tasks)
- Implement water weight detection (CV threshold, sudden change detection)
- Implement gap detection (consecutive missing days, tracking frequency)
- Add confidence reduction for unreliable data patterns
