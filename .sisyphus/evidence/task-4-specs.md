# Task 4: Expected vs Actual TDEE Values Specification

**Date**: 2026-04-02  
**Based on**: Task 3 Root Cause Analysis (`.sisyphus/evidence/task-3-analysis.md`)  
**Research Standard**: Hall & Chow, 2011 (energy balance dynamics)

---

## Executive Summary

This specification defines the **expected behavior** for TDEE calculations in the TDEE Tracker application, based on physiological constraints and research-backed standards. The primary issue identified is that `calculatePeriodTDEE()` lacks validation present in `calculateTDEE()`, allowing impossible values to be displayed.

---

## 1. Physiological Bounds

### Valid TDEE Range

| Bound | Value | Rationale |
|-------|-------|-----------|
| **Minimum** | 800 kcal/day | Below basal metabolic rate (BMR) — human BMR typically 1200-1800 kcal/day |
| **Maximum** | 5000 kcal/day | Superhuman expenditure — elite athletes peak ~4000-4500 kcal/day |

### Validation Rules

```javascript
// MUST return null if outside physiological bounds
if (tdee < 800 || tdee > 5000) {
    return null;  // Impossible value
}
```

**Source**: Existing validation in `calculateTDEE()` at `js/calculator-tdee.js:156-160`

### When to Return NULL

TDEE calculations **MUST** return `null` in these scenarios:

| Scenario | Condition | Rationale |
|----------|-----------|-----------|
| **Insufficient Data** | `< 4 tracked days` | Statistically unreliable (per `MIN_TRACKED_DAYS`) |
| **Water Weight Detected** | Weight gain >1 kg/week without calorie surplus correlation | Temporary fluid retention, not tissue change |
| **Physiological Violation** | TDEE < 800 or > 5000 kcal/day | Biologically impossible |
| **No Weight Data** | All entries have `weight: null` | Cannot calculate delta |
| **No Calorie Data** | All entries have `calories: null` | Cannot compute energy balance |

---

## 2. Expected Values for User's Data

### 7-Day TDEE (2026-03-07 to 2026-03-13)

**Input Data** (from `sample_data_export.json`):

| Date | Weight (kg) | Calories | Notes |
|------|-------------|----------|-------|
| 2026-03-07 | 74.2 | 3300 | Creatine loading started |
| 2026-03-08 | 75.2 | 3550 | +1.0 kg (water) |
| 2026-03-09 | 75.2 | 3650 | Stable |
| 2026-03-10 | 75.6 | 3500 | Increased sodium |
| 2026-03-11 | 76.3 | 3300 | +0.7 kg |
| 2026-03-12 | 76.9 | 3300 | +0.6 kg |
| 2026-03-13 | 76.6 | null | -0.3 kg |

**Calculated Metrics**:
- Total Weight Change: **+2.4 kg** in 7 days
- Average Calories: **3433 kcal/day** (6 tracked days)
- Linear Slope: **+0.418 kg/day** (weight gain)

**Current Output** (BUG):
- `calculatePeriodTDEE()` returns: **209 kcal/day** ❌

**Expected Output**:
- **Should return: `null`** ✅

**Reason**: Weight gain of +2.4 kg/week is physiologically impossible as tissue gain. User notes indicate creatine loading ("Prev days had no creating, loading for 3 days with 10g/day") and increased sodium — both cause water retention. Linear regression interprets all weight change as tissue, producing impossible TDEE.

**Validation Rule**:
```javascript
// Water weight detection: >1 kg/week gain without calorie correlation
const weightGainPerWeek = 2.4;  // kg
if (weightGainPerWeek > 1.0) {
    // Check if calorie surplus supports this gain
    // 2.4 kg fat requires ~18,500 kcal surplus over 7 days = ~2640 kcal/day surplus
    // User averaged 3433 kcal — would need TDEE ~800 kcal/day to explain gain
    // This is impossible (below BMR), so weight gain is water, not tissue
    return null;  // Water weight detected
}
```

---

### 14-Day TDEE (2026-02-27 to 2026-03-13)

**Input Data** (from `sample_data_export.json`):
- Tracked Days: **12** (out of 14)
- Weight Change: **-0.520 kg** (76.8 → 76.6 kg, excluding null days)
- Average Calories: **3292 kcal/day**

**Current Output**:
- `calculatePeriodTDEE()` returns: **2679 kcal/day** (reasonable)
- Confidence: **none** (high volatility, CV=67%)

**Expected Output**:
- **TDEE Range: 2400-2900 kcal/day** ✅
- **Confidence: Low (40-59)** due to high volatility

**Reason**: 14-day window smooths out daily fluctuations. Value is within physiological bounds and consistent with user's activity level. However, high coefficient of variation (CV=67%) indicates unstable data — likely from varying sodium intake, creatine loading, and inconsistent tracking.

---

## 3. Confidence Scoring Criteria

### High Confidence (80-100)

| Criterion | Requirement |
|-----------|-------------|
| **Days Tracked** | ≥14 days |
| **Completeness** | ≥85% (missing ≤2 days) |
| **Volatility (CV)** | <0.2 (stable weight/calories) |
| **Weekend Coverage** | ≥50% of weekends tracked |
| **Physiological Bounds** | TDEE within 800-5000 kcal/day |
| **Water Weight** | No rapid gains/losses (>1 kg/week) |

**Example**: 14 consecutive days, CV=0.15, TDEE=2500 kcal → Confidence=92

---

### Medium Confidence (60-79)

| Criterion | Requirement |
|-----------|-------------|
| **Days Tracked** | 7-13 days |
| **Completeness** | 70-84% (missing 2-4 days) |
| **Volatility (CV)** | 0.2-0.3 (moderate fluctuation) |
| **Physiological Bounds** | TDEE within 800-5000 kcal/day |

**Example**: 10 days tracked, CV=0.25, TDEE=2700 kcal → Confidence=68

---

### Low Confidence (40-59)

| Criterion | Requirement |
|-----------|-------------|
| **Days Tracked** | 4-6 days |
| **Completeness** | <70% (missing >4 days) |
| **Volatility (CV)** | >0.3 (high fluctuation) |
| **Physiological Bounds** | TDEE within 800-5000 kcal/day |

**Example**: 5 days tracked, CV=0.45, TDEE=2400 kcal → Confidence=48

**User's 14-Day Data Falls Here**: Despite 12 days tracked, CV=67% (>0.3) reduces confidence to **Low**.

---

### Very Low / None (<40)

| Criterion | Requirement |
|-----------|-------------|
| **Days Tracked** | <4 days |
| **Water Weight** | Detected (>1 kg/week without calorie correlation) |
| **Physiological Bounds** | Violated (TDEE <800 or >5000) |
| **Data Quality** | Mostly null weights or calories |

**User's 7-Day Data Falls Here**: Water weight detected (+2.4 kg/week), calculated TDEE=209 kcal (below 800 minimum) → **Should return null, not a value with low confidence**.

---

## 4. Validation Rules Specification

### Rule 1: Minimum Data Requirement

```javascript
// MUST have at least 4 tracked days
if (trackedDays < 4) {
    return null;
}
```

**Rationale**: Fewer than 4 days provides statistically unreliable trend data.

---

### Rule 2: Physiological Range Check

```javascript
// MUST validate TDEE is within human physiological bounds
if (tdee < 800 || tdee > 5000) {
    return null;
}
```

**Rationale**: BMR alone is 1200-1800 kcal/day for adults. TDEE includes activity, so minimum is ~800 (sedentary fasting) and maximum ~5000 (elite athlete extreme activity).

**Research Source**: Hall KD, Chow CC. Estimating changes in free-living energy intake and its confidence interval. Am J Clin Nutr. 2011;94(1):66-74.

---

### Rule 3: Water Weight Detection

```javascript
// SHOULD detect rapid weight changes inconsistent with calorie intake
const maxPhysiologicalGain = 0.5;  // kg/week (fat/muscle)
const maxPhysiologicalLoss = 1.0;  // kg/week (fat/muscle)

if (weightChangePerWeek > maxPhysiologicalGain || weightChangePerWeek < -maxPhysiologicalLoss) {
    // Check if calorie intake supports this change
    const requiredSurplus = weightChangePerWeek * CALORIES_PER_KG / 7;
    const expectedTdee = avgCalories - requiredSurplus;
    
    if (expectedTdee < 800 || expectedTdee > 5000) {
        return null;  // Water weight, not tissue change
    }
}
```

**Rationale**: Rapid weight changes (>0.5 kg gain or >1.0 kg loss per week) are typically water/glycogen, not fat/muscle. Creatine loading can cause 1-3 kg water retention in first week.

---

### Rule 4: Data Completeness

```javascript
// SHOULD warn if completeness < 70%
const completeness = trackedDays / totalDays;
if (completeness < 0.7) {
    // Reduce confidence score
    confidence = Math.min(confidence, 60);
}
```

**Rationale**: Gaps in data reduce reliability of trend analysis.

---

### Rule 5: Outlier Detection

```javascript
// SHOULD exclude calorie outliers before calculation
const { mean, stdDev } = calculateStats(calorieValues);
const threshold = mean + (OUTLIER_THRESHOLD * stdDev);  // 3 std devs

const filteredCalories = calories.filter(c => c < threshold);
```

**Rationale**: Single-day extremes (e.g., 8000 kcal cheat day) skew averages and produce wrong TDEE.

---

## 5. Expected Behavior Summary

### For User's Specific Data

| Period | Current Output | Expected Output | Status |
|--------|----------------|-----------------|--------|
| **7-Day TDEE** | 209 kcal/day | `null` (water weight) | ❌ BUG |
| **14-Day TDEE** | 2679 kcal/day | 2400-2900 kcal/day, Confidence=Low | ✅ Acceptable |
| **Physiological Check** | Missing | Applied (800-5000 range) | ❌ BUG |
| **Water Weight Detection** | Missing | Applied (>1 kg/week) | ❌ BUG |

---

## 6. Implementation Requirements

### Fix Priority: P0-Critical

**Affected Function**: `calculatePeriodTDEE()` at `js/calculator-tdee.js:1031-1056`

**Required Changes**:

1. **Add physiological range validation** (lines 1053-1056):
   ```javascript
   const tdee = round(avgCalories - (slope * calPerUnit), 0);
   
   // P0-2: Physiological range validation (800-5000 kcal)
   if (tdee < 800 || tdee > 5000) {
       return null;
   }
   
   return tdee;
   ```

2. **Add water weight detection** (before TDEE calculation):
   ```javascript
   // Detect rapid weight changes inconsistent with physiology
   const weightChangePerWeek = slope * 7;  // Convert daily slope to weekly
   if (weightChangePerWeek > 1.0 || weightChangePerWeek < -1.0) {
       // Check if calorie intake supports this change
       const impliedTdee = avgCalories - (slope * calPerUnit);
       if (impliedTdee < 800 || impliedTdee > 5000) {
           return null;  // Water weight detected
       }
   }
   ```

3. **Add minimum tracked days validation**:
   ```javascript
   if (trackedDays < 4) {
       return null;
   }
   ```

---

## 7. Test Cases

### Test Case 1: Water Weight (7-Day)

```javascript
// Input: User's last 7 days (creatine loading)
const entries = [
    { date: '2026-03-07', weight: 74.2, calories: 3300 },
    { date: '2026-03-08', weight: 75.2, calories: 3550 },
    { date: '2026-03-09', weight: 75.2, calories: 3650 },
    { date: '2026-03-10', weight: 75.6, calories: 3500 },
    { date: '2026-03-11', weight: 76.3, calories: 3300 },
    { date: '2026-03-12', weight: 76.9, calories: 3300 },
    { date: '2026-03-13', weight: 76.6, calories: null }
];

// Expected: null (water weight detected)
const result = calculatePeriodTDEE(entries, 'kg');
assert(result === null, 'Should return null for water weight');
```

---

### Test Case 2: Physiological Bounds Violation

```javascript
// Input: Impossible TDEE scenario
const entries = [
    { date: '2026-03-01', weight: 75.0, calories: 2000 },
    { date: '2026-03-02', weight: 76.5, calories: 2000 },  // +1.5 kg in 1 day
    { date: '2026-03-03', weight: 77.0, calories: 2000 },
    { date: '2026-03-04', weight: 77.5, calories: 2000 }
];

// Expected: null (TDEE would be < 800)
const result = calculatePeriodTDEE(entries, 'kg');
assert(result === null, 'Should return null for impossible TDEE');
```

---

### Test Case 3: Valid 14-Day TDEE

```javascript
// Input: User's 14-day data (reasonable values)
const entries = [ /* 14 days from sample_data_export.json */ ];

// Expected: 2400-2900 kcal/day
const result = calculatePeriodTDEE(entries, 'kg');
assert(result >= 2400 && result <= 2900, 'TDEE should be in expected range');
```

---

## 8. References

### Research Sources

1. **Hall KD, Chow CC.** Estimating changes in free-living energy intake and its confidence interval. *Am J Clin Nutr*. 2011;94(1):66-74.
   - Validates energy balance equation
   - Establishes confidence intervals for TDEE estimates

2. **Thomas DM, et al.** A mathematical model of weight change with adaptation. *Diabetes Obes Metab*. 2009;11 Suppl 1:1-8.
   - Dynamic energy density model
   - Physiological bounds for weight change rates

3. **Mifflin MD, et al.** A new predictive equation for resting energy expenditure in healthy individuals. *Am J Clin Nutr*. 1990;51(2):241-247.
   - BMR estimation (supports 800 kcal minimum)

### Code References

| File | Lines | Purpose |
|------|-------|---------|
| `js/calculator-tdee.js` | 140-163 | `calculateTDEE()` with validation |
| `js/calculator-tdee.js` | 1031-1056 | `calculatePeriodTDEE()` WITHOUT validation |
| `sample_data_export.json` | 20-61 | User's 7-day data |
| `sample_data_export.json` | 20-103 | User's 14-day data |

---

## 9. Success Criteria

This specification is complete when:

- [x] Physiological bounds defined (800-5000 kcal/day)
- [x] Expected 7-day TDEE range defined (null for user's data)
- [x] Expected 14-day TDEE range defined (2400-2900 kcal/day)
- [x] Confidence scoring criteria documented (High/Medium/Low/None)
- [x] Validation rules specified (when to return null vs valid values)
- [x] Test cases provided for implementation verification

---

**Next Step**: Implement fixes in `calculatePeriodTDEE()` to match this specification.

**Last Updated**: 2026-04-02  
**Author**: Sisyphus-Junior
