# Task 3: Root Cause Analysis - Impossible TDEE Values

**Date**: 2026-04-02  
**Analyst**: Sisyphus-Junior  
**Issue**: User reported 7-day TDEE showing 787 kcal/day (impossible value)

---

## Executive Summary

**ROOT CAUSE IDENTIFIED**: `calculatePeriodTDEE()` function lacks physiological range validation, allowing impossible TDEE values (< 800 or > 5000 kcal/day) to be displayed to users.

**Affected Code**: `js/calculator-tdee.js:1031-1056`  
**Missing Validation**: Lines 156-160 (present in `calculateTDEE` but absent in `calculatePeriodTDEE`)

---

## Data Analysis

### User's Last 7 Days Data (from sample_data_export.json)

| Date | Weight (kg) | Calories | Notes |
|------|-------------|----------|-------|
| 2026-03-07 | 74.2 | 3300 | Creatine loading |
| 2026-03-08 | 75.2 | 3550 | +1.0 kg water weight |
| 2026-03-09 | 75.2 | 3650 | Stable |
| 2026-03-10 | 75.6 | 3500 | Increased sodium |
| 2026-03-11 | 76.3 | 3300 | +0.7 kg |
| 2026-03-12 | 76.9 | 3300 | +0.6 kg |
| 2026-03-13 | 76.6 | null | -0.3 kg |

**Total Weight Change**: +2.4 kg in 7 days  
**Average Calories**: 3433 kcal/day (6 tracked days)

### Manual Calculation

**Step 1: Calculate Slope (Linear Regression)**
```
Day indices: 0, 1, 2, 3, 4, 5, 6
Weights: 74.2, 75.2, 75.2, 75.6, 76.3, 76.9, 76.6 kg

n = 7
sumX = 21
sumY = 530
sumXY = 1601.7
sumXX = 91

slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX²)
slope = (7 * 1601.7 - 21 * 530) / (7 * 91 - 21²)
slope = 81.9 / 196
slope = 0.418 kg/day (weight gain)
```

**Step 2: Calculate TDEE**
```
Formula: TDEE = avgCalories - (slope × calPerUnit)
TDEE = 3433 - (0.418 × 7716)
TDEE = 3433 - 3224
TDEE = 209 kcal/day
```

**Result**: 209 kcal/day (PHYSIOLOGICALLY IMPOSSIBLE)

---

## Root Cause Identification

### Missing Validation

The `calculateTDEE` function (line 140-163) includes physiological range validation:

```javascript
// js/calculator-tdee.js:156-160
// P0-2: Physiological range validation (800-5000 kcal)
// Human BMR alone is ~1200-1800 kcal/day. TDEE below 800 or above 5000 is impossible.
if (roundedTdee < 800 || roundedTdee > 5000) {
    return null;
}
```

However, `calculatePeriodTDEE` (line 1031-1056) **lacks this validation**:

```javascript
// js/calculator-tdee.js:1053-1055
// TDEE = avgCalories - (slope * calPerUnit)
const calPerUnit = unit === 'kg' ? CALORIES_PER_KG : CALORIES_PER_LB;
return round(avgCalories - (slope * calPerUnit), 0);  // ← NO VALIDATION!
```

### Why This Produces Wrong Values

1. **Water/Glycogen Fluctuations**: User's notes indicate creatine loading ("Prev days had no creating, loading for 3 days with 10g/day") and increased sodium

2. **Linear Regression Interprets All Weight Change as Fat/Muscle**: 
   - 2.4 kg gain in 7 days = 0.418 kg/day
   - At 7716 kcal/kg, this implies 3224 kcal/day surplus
   - Formula subtracts this from intake: 3433 - 3224 = 209 kcal/day TDEE

3. **Reality**: Most weight gain is water retention from creatine/sodium, not actual tissue gain

4. **Missing Safeguard**: Without the 800-5000 kcal range check, impossible values are returned

---

## Impact Analysis

### Affected Features

1. **7-Day Trend Display** (`js/ui/dashboard.js:311`)
   ```javascript
   tdee = Calculator.calculatePeriodTDEE(periodEntries, weightUnit);
   ```

2. **14-Day Trend Display** (same code path)

3. **Weekly View TDEE** (likely uses same function)

### User Impact

- **Misleading Data**: Users see impossible TDEE values (209-787 kcal/day)
- **Loss of Trust**: App appears broken or unreliable
- **Poor Decisions**: Users might drastically increase calories based on wrong TDEE

---

## Evidence

### Calculated vs Expected

| Metric | Calculated | Expected | Status |
|--------|------------|----------|--------|
| 7-Day TDEE | 209 kcal/day | null (water weight) | ❌ FAIL |
| Physiological Range | 209 < 800 | Should return null | ❌ FAIL |
| Validation Present | NO | YES (in calculateTDEE) | ❌ FAIL |

### Debug Output

From Task 1 debug script (`.sisyphus/evidence/task-1-debug-output.txt`):
- 7-Day TDEE via `calculateFastTDEE`: **null** (correctly rejected due to < 7 tracked days)
- 14-Day TDEE via `calculateStableTDEE`: **2679 kcal/day** (reasonable, but confidence=none)

**Note**: The 7-Day Trend in the UI uses `calculatePeriodTDEE`, NOT `calculateFastTDEE`, which is why it shows impossible values.

---

## Recommended Fix

Add physiological range validation to `calculatePeriodTDEE`:

```javascript
// js/calculator-tdee.js:1053-1056 (modified)
// TDEE = avgCalories - (slope * calPerUnit)
const calPerUnit = unit === 'kg' ? CALORIES_PER_KG : CALORIES_PER_LB;
const tdee = round(avgCalories - (slope * calPerUnit), 0);

// P0-2: Physiological range validation (800-5000 kcal)
if (tdee < 800 || tdee > 5000) {
    return null;
}

return tdee;
```

---

## Files Referenced

| File | Lines | Purpose |
|------|-------|---------|
| `js/calculator-tdee.js` | 140-163 | `calculateTDEE` with validation |
| `js/calculator-tdee.js` | 1031-1056 | `calculatePeriodTDEE` WITHOUT validation |
| `js/calculator-tdee.js` | 997-1022 | `calculateSlope` (linear regression) |
| `js/ui/dashboard.js` | 285-339 | `renderTrends` (calls calculatePeriodTDEE) |
| `sample_data_export.json` | 20-61 | User's last 7 days data |

---

## Conclusion

**Root Cause**: Missing physiological range validation in `calculatePeriodTDEE()` at `js/calculator-tdee.js:1055`

**Severity**: HIGH - Produces impossible TDEE values that mislead users

**Fix Priority**: P0-Critical (blocks user trust, produces demonstrably wrong data)

**Next Steps**: Implement fix in Task 4 (add validation to calculatePeriodTDEE)
