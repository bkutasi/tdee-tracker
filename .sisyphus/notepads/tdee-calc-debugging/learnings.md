
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
