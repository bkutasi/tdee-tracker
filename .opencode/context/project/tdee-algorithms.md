<!-- Context: project/algorithms | Priority: critical | Version: 1.0 | Updated: 2026-02-25 -->

# TDEE Calculation Algorithms

> Core calculation algorithms from `js/calculator.js` (724 lines)

## Constants

```javascript
CALORIES_PER_KG = 7716    // ~3500 cal/lb × 2.205
CALORIES_PER_LB = 3500
DEFAULT_ALPHA = 0.3       // EWMA smoothing factor
VOLATILE_ALPHA = 0.1      // For volatile periods (CV > 2%)
MIN_TRACKED_DAYS = 4      // Minimum for valid TDEE
```

## Core Formulas

### EWMA Smoothing
```javascript
// Formula: current * 0.3 + previous * 0.7
calculateEWMA(current, previous, alpha = 0.3)
```
**Purpose**: Smooth weight data to reduce water/glycogen noise

### TDEE Energy Balance
```javascript
// Formula: avgCalories + ((-weightDelta * 7716) / trackedDays)
calculateTDEE({ avgCalories, weightDelta, trackedDays, unit })
```
**Purpose**: Estimate TDEE from calorie intake and weight change

### Rolling TDEE Average
```javascript
calculateRollingTDEE(weeklyData, windowSize = 4)
```
**Purpose**: 4-week smoothed average of weekly TDEE values

## Algorithm Functions

### calculateFastTDEE (Reactive)
- **Window**: 7-day reactive TDEE
- **Method**: EWMA weight delta
- **Requires**: Min 4 tracked days
- **Purpose**: Quick response to metabolic changes

### calculateStableTDEE (Robust)
- **Window**: 14-day sliding window
- **Method**: Regression on EWMA weights
- **Purpose**: Robust to water/glycogen fluctuations

### calculateEWMAWeightDelta
- **Calculation**: Difference between first and last EWMA values
- **Purpose**: Smoothed weight change over period

### excludeCalorieOutliers
- **Threshold**: >2.5 standard deviations from mean
- **Purpose**: Detect cheat days that would skew TDEE

### calculateSmoothTDEEArray
- **Method**: EWMA smoothing over weekly TDEEs
- **Purpose**: Smooth chart history visualization

## Confidence Levels

| Level | Criteria | Reliability |
|-------|----------|-------------|
| High | 6+ tracked days | ±5% accuracy |
| Medium | 4-5 tracked days | ±10% accuracy |
| Low | <4 days OR >2 day weight gap | Unreliable |

## Gap Handling Strategy

**Conservative Mode**: Excludes non-tracked days from TDEE calculation

**Rationale**: Prevents dilution of estimate with days lacking calorie data

**Implementation**: Only days with both weight and calorie data count toward `trackedDays`

## Fallback Methods

### Theoretical TDEE
```javascript
// Formula: Mifflin-St Jeor BMR × Activity Level
```
**Used When**: Insufficient tracking data (<4 days)

**Purpose**: Provide baseline estimate when no data available

### Hybrid History
**Strategy**: Use Theoretical TDEE when calculated TDEE has low confidence

**Purpose**: Prevent artificially low dips in chart history

**Implementation**: Chart shows theoretical TDEE for gaps, calculated TDEE for tracked periods

## Related Files

- `js/calculator.js` - Full implementation (724 lines)
- `tests/calculator.test.js` - Algorithm tests
- `../project-intelligence/decisions-log.md` - Decision context for algorithms
