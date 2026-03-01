/**
 * TDEE Calculator Engine - Coordinator Module
 * Re-exports functionality from EWMA and TDEE sub-modules
 * 
 * This module maintains backward compatibility by exposing the same
 * Calculator global API while delegating to specialized sub-modules.
 * 
 * Based on analysis of Improved_TDEE_Tracker.xlsx with mathematical improvements:
 * - EWMA weight smoothing (0.3/0.7 ratio)
 * - Rolling TDEE with 6-week window
 * - Adaptive smoothing for volatile periods
 * - Outlier detection for data quality
 * - Conservative gap handling (excludes non-tracked days from TDEE calc)
 */

// Load sub-modules (Node.js compatibility)
// In browser, EWMA and TDEE are loaded via script tags before this file
let _EWMA, _TDEE;
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment - use require
    _EWMA = require('./calculator-ewma.js');
    _TDEE = require('./calculator-tdee.js');
} else {
    // Browser environment - use globals
    _EWMA = (typeof _EWMA !== 'undefined') ? EWMA : null;
    _TDEE = (typeof _TDEE !== 'undefined') ? TDEE : null;
}

const Calculator = (function () {
    'use strict';

    // Main constants (re-exported for backward compatibility)
    const CALORIES_PER_KG = 7716;  // ~3500 cal/lb * 2.205
    const CALORIES_PER_LB = 3500;
    const DEFAULT_ALPHA = 0.3;     // EWMA smoothing factor
    const VOLATILE_ALPHA = 0.1;   // Lower alpha for volatile periods
    const OUTLIER_THRESHOLD = 3;  // Standard deviations for outlier detection
    const ROLLING_WINDOW = 4;     // Weeks for rolling TDEE (reduced from 6 for faster response)
    const MIN_TRACKED_DAYS = 4;   // Minimum calorie-tracked days required for valid TDEE
    const CV_THRESHOLD = 0.02;    // Coefficient of variation threshold for volatility detection (2%)

    // Scientific confidence tiers (Hall & Chow 2011)
    const CONFIDENCE_TIERS = {
        HIGH: { minDays: 14, minWeightChange: 0.5, accuracy: '±5-10%' },
        MEDIUM: { minDays: 7, minWeightChange: 0.3, accuracy: '±10-15%' },
        LOW: { minDays: 4, minWeightChange: 0.2, accuracy: '±15-25%' }
    };

    /**
     * Get data quality warnings for TDEE calculations (single pass)
     * @param {Object[]} entries - Array of daily entries
     * @param {string} weightUnit - 'kg' or 'lb'
     * @returns {string[]} Array of warning messages
     */
    function getDataQualityWarnings(entries, weightUnit = 'kg') {
        const warnings = [];
        
        if (!entries || entries.length === 0) {
            warnings.push('No data available');
            return warnings;
        }
        
        // Single pass to collect weights and calories
        let weightCount = 0, calorieCount = 0, weightSum = 0;
        const recentWeights = [];
        
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            if (entry.weight !== null) {
                weightCount++;
                weightSum += entry.weight;
                if (i >= entries.length - 14) recentWeights.push(entry.weight);
            }
            if (entry.calories !== null && !isNaN(entry.calories)) {
                calorieCount++;
            }
        }
        
        // Check for insufficient data
        if (entries.length < 7) {
            warnings.push(`More data needed for accurate TDEE (have ${entries.length} days, need 7+)`);
        }
        
        // Check for high weight variance
        if (weightCount >= 3) {
            const stats = calculateStats(entries.filter(e => e.weight !== null).map(e => e.weight));
            const cv = stats.stdDev / stats.mean;
            if (cv > 0.03) {
                warnings.push('High weight variance detected - may indicate water retention');
            }
        }
        
        // Check for gaps
        if (calorieCount < entries.length * 0.7) {
            warnings.push('Missing calorie data may affect accuracy');
        }
        
        // Check for plateau (only if we have enough recent weights)
        if (recentWeights.length >= 10) {
            const mid = Math.floor(recentWeights.length / 2);
            const firstAvg = recentWeights.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
            const secondAvg = recentWeights.slice(mid).reduce((a, b) => a + b, 0) / (recentWeights.length - mid);
            if (Math.abs(secondAvg - firstAvg) < 0.2) {
                warnings.push('Weight plateau detected - consider metabolic adaptation');
            }
        }
        
        return warnings;
    }

    /**
     * Calculate daily calorie target based on TDEE and deficit/surplus
     * @param {number} tdee - Current TDEE estimate
     * @param {number} targetPercent - Deficit (-) or surplus (+) as percentage (e.g., -0.2 for 20% deficit)
     * @returns {number} Daily calorie target
     */
    function calculateDailyTarget(tdee, targetPercent) {
        if (!tdee) return null;
        const target = tdee * (1 + targetPercent);
        return round(target, 0);
    }

    /**
     * Calculate weeks until goal weight is reached
     * @param {number} currentWeight - Current weight
     * @param {number} goalWeight - Target weight
     * @param {number} weeklyRate - Weekly weight change rate (positive = gain)
     * @returns {number|null} Weeks to goal, or null if not applicable
     */
    function calculateWeeksToGoal(currentWeight, goalWeight, weeklyRate) {
        if (weeklyRate === 0) return null;

        const delta = goalWeight - currentWeight;

        // If we're gaining when we should be losing (or vice versa)
        if ((delta > 0 && weeklyRate < 0) || (delta < 0 && weeklyRate > 0)) {
            return null;
        }

        return Math.abs(Math.round(delta / weeklyRate));
    }

    /**
     * Aggregate daily entries into weekly summary (single pass)
     * @param {Object[]} dailyEntries - Processed daily entries
     * @returns {Object} Weekly summary with averages and TDEE
     */
    function calculateWeeklySummary(dailyEntries) {
        let weightSum = 0, calorieSum = 0, weightCount = 0, calorieCount = 0;
        let ewmaWeight = null;

        for (const entry of dailyEntries) {
            if (entry.weight !== null) {
                weightSum += entry.weight;
                weightCount++;
                ewmaWeight = entry.ewmaWeight;
            }
            if (entry.calories !== null) {
                calorieSum += entry.calories;
                calorieCount++;
            }
        }

        return {
            startDate: dailyEntries[0]?.date,
            endDate: dailyEntries[dailyEntries.length - 1]?.date,
            avgWeight: weightCount > 0 ? round(weightSum / weightCount, 2) : null,
            ewmaWeight,
            avgCalories: calorieCount > 0 ? round(calorieSum / calorieCount, 0) : null,
            trackedDays: calorieCount,
            totalDays: dailyEntries.length,
            confidence: round(calorieCount / dailyEntries.length, 2),
            hasGaps: calorieCount < dailyEntries.length
        };
    }

    /**
     * Detect statistical outliers using Z-score
     * @param {number[]} data - Array of values
     * @param {number} threshold - Number of standard deviations
     * @returns {Object[]} Array with outlier flags
     */
    function detectOutliers(data, threshold = OUTLIER_THRESHOLD) {
        if (data.length < 3) return data.map((v, i) => ({ value: v, index: i, isOutlier: false }));

        const stats = calculateStats(data);

        return data.map((value, index) => ({
            value,
            index,
            isOutlier: Math.abs(value - stats.mean) > (threshold * stats.stdDev),
            zScore: round((value - stats.mean) / stats.stdDev, 2)
        }));
    }

    /**
     * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
     * Uses Utils.Result pattern for consistent error handling
     * @param {number} weight - Weight in kg
     * @param {number} height - Height in cm
     * @param {number} age - Age in years
     * @param {string} gender - 'male', 'female', or 'other'
     * @returns {{valid: boolean, bmr: number|null, error?: string, code?: string}} BMR result with validation status
     */
    function calculateBMR(weight, height, age, gender) {
        // Validate age
        if (!age || age < 1 || age > 120) {
            return {
                valid: false,
                error: 'Age must be between 1 and 120 years',
                bmr: null,
                code: 'INVALID_AGE'
            };
        }

        // Validate height
        if (!height || height < 50 || height > 250) {
            return {
                valid: false,
                error: 'Height must be between 50 and 250 cm',
                bmr: null,
                code: 'INVALID_HEIGHT'
            };
        }

        // Validate weight
        if (!weight || weight < 20 || weight > 500) {
            return {
                valid: false,
                error: 'Weight must be between 20 and 500 kg',
                bmr: null,
                code: 'INVALID_WEIGHT'
            };
        }

        // Validate gender
        const validGenders = ['male', 'female', 'other'];
        if (!gender || !validGenders.includes(gender.toLowerCase())) {
            return {
                valid: false,
                error: 'Gender must be male, female, or other',
                bmr: null,
                code: 'INVALID_GENDER'
            };
        }
        const normalizedGender = gender.toLowerCase();

        // Mifflin-St Jeor Equation
        // Men: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
        // Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
        // Other: Average of male and female formulas

        let bmr = (10 * weight) + (6.25 * height) - (5 * age);

        if (normalizedGender === 'male') {
            bmr += 5;
        } else if (normalizedGender === 'other') {
            // Average of male and female formulas: (5 - 161) / 2 = -78
            bmr -= 78;
        } else {
            bmr -= 161;
        }

        return {
            valid: true,
            bmr: round(bmr, 0)
        };
    }

    /**
     * Calculate Theoretical TDEE based on BMR and Activity Level
     * @param {number|{valid: boolean, bmr: number|null}} bmr - Calculated BMR (supports old number format and new object format)
     * @param {number} activityLevel - Activity multiplier (1.2 to 1.9)
     * @returns {number|null} Theoretical TDEE
     */
    function calculateTheoreticalTDEE(bmr, activityLevel) {
        // Handle both old format (number) and new format (object with valid/bmr)
        const bmrValue = bmr?.bmr ?? bmr;
        if (!bmrValue || !activityLevel) return null;
        return round(bmrValue * activityLevel, 0);
    }

    /**
     * Convert between weight units
     */
    function convertWeight(value, from, to) {
        if (from === to) return value;
        if (from === 'kg' && to === 'lb') return round(value * 2.20462, 2);
        if (from === 'lb' && to === 'kg') return round(value / 2.20462, 2);
        return value;
    }

    /**
     * Convert between calorie units
     */
    function convertCalories(value, from, to) {
        if (from === to) return value;
        if (from === 'cal' && to === 'kj') return round(value * 4.184, 0);
        if (from === 'kj' && to === 'cal') return round(value / 4.184, 0);
        return value;
    }

    /**
     * Round to specified decimal places (handles floating-point precision)
     * @param {number} value - Value to round
     * @param {number} decimals - Decimal places
     * @returns {number} Rounded value
     */
    function round(value, decimals = 2) {
        if (value === null || value === undefined || isNaN(value)) return null;
        const factor = Math.pow(10, decimals);
        return Math.round((value + Number.EPSILON) * factor) / factor;
    }

    /**
     * Round to nearest multiple (like Excel MROUND)
     * @param {number} value - Value to round
     * @param {number} multiple - Multiple to round to
     * @returns {number} Rounded value
     */
    function mround(value, multiple = 10) {
        if (value === null || value === undefined || isNaN(value)) return null;
        return Math.round(value / multiple) * multiple;
    }

    /**
     * Calculate basic statistics (single pass for mean/min/max)
     * Delegates to EWMA module for consistency
     * @param {number[]} data - Array of numbers
     * @returns {Object} { mean, stdDev, min, max }
     */
    function calculateStats(data) {
        // Use EWMA module if available, otherwise use inline implementation
        if (typeof _EWMA !== 'undefined' && _EWMA.calculateStats) {
            return _EWMA.calculateStats(data);
        }
        
        // Fallback inline implementation
        if (data.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };

        let sum = 0, min = Infinity, max = -Infinity;
        for (const value of data) {
            sum += value;
            if (value < min) min = value;
            if (value > max) max = value;
        }
        const mean = sum / data.length;

        let sumSqDiff = 0;
        for (const value of data) {
            sumSqDiff += (value - mean) ** 2;
        }
        const variance = sumSqDiff / data.length;

        return {
            mean: round(mean, 4),
            stdDev: round(Math.sqrt(variance), 4),
            min: round(min, 4),
            max: round(max, 4)
        };
    }

    // Public API - Re-export from sub-modules and local functions
    return {
        // Core calculations (re-exported from EWMA module)
        calculateEWMA: function(current, previous, alpha) {
            if (typeof _EWMA !== 'undefined' && _EWMA.calculateEWMA) {
                return _EWMA.calculateEWMA(current, previous, alpha);
            }
            // Fallback inline implementation
            if (previous === null || previous === undefined) {
                return round(current, 2);
            }
            const result = (current * (alpha || DEFAULT_ALPHA)) + (previous * (1 - (alpha || DEFAULT_ALPHA)));
            return round(result, 2);
        },
        
        getAdaptiveAlpha: function(recentWeights) {
            if (typeof _EWMA !== 'undefined' && _EWMA.getAdaptiveAlpha) {
                return _EWMA.getAdaptiveAlpha(recentWeights);
            }
            // Fallback inline implementation
            if (!recentWeights || recentWeights.length < 3) return DEFAULT_ALPHA;
            const stats = calculateStats(recentWeights);
            const cv = stats.stdDev / stats.mean;
            return cv > CV_THRESHOLD ? VOLATILE_ALPHA : DEFAULT_ALPHA;
        },
        
        calculateEWMAWeightDelta: function(processedEntries) {
            if (typeof _EWMA !== 'undefined' && _EWMA.calculateEWMAWeightDelta) {
                return _EWMA.calculateEWMAWeightDelta(processedEntries);
            }
            // Fallback inline implementation
            const withEWMA = processedEntries.filter(e => e.ewmaWeight !== null && e.ewmaWeight !== undefined);
            if (withEWMA.length < 2) return null;
            const firstEWMA = withEWMA[0].ewmaWeight;
            const lastEWMA = withEWMA[withEWMA.length - 1].ewmaWeight;
            return round(lastEWMA - firstEWMA, 3);
        },

        // TDEE calculations (re-exported from TDEE module)
        calculateTDEE: function(params) {
            if (typeof _TDEE !== 'undefined' && _TDEE.calculateTDEE) {
                return _TDEE.calculateTDEE(params);
            }
            // Fallback inline implementation
            if (params.trackedDays === 0) return null;
            const calPerUnit = params.unit === 'kg' ? CALORIES_PER_KG : CALORIES_PER_LB;
            const tdee = params.avgCalories + ((-params.weightDelta * calPerUnit) / params.trackedDays);
            return round(tdee, 0);
        },
        
        calculateRollingTDEE: function(weeklyData, windowSize) {
            if (typeof _TDEE !== 'undefined' && _TDEE.calculateRollingTDEE) {
                return _TDEE.calculateRollingTDEE(weeklyData, windowSize);
            }
            // Fallback inline implementation
            const validWeeks = weeklyData.filter(w => w.tdee !== null && !isNaN(w.tdee)).slice(-windowSize);
            if (validWeeks.length === 0) return null;
            const sum = validWeeks.reduce((acc, w) => acc + w.tdee, 0);
            return round(sum / validWeeks.length, 0);
        },
        
        calculateSmoothedTDEE: function(currentTDEE, previousSmoothedTDEE, alpha) {
            if (typeof _TDEE !== 'undefined' && _TDEE.calculateSmoothedTDEE) {
                return _TDEE.calculateSmoothedTDEE(currentTDEE, previousSmoothedTDEE, alpha);
            }
            // Fallback to EWMA
            return Calculator.calculateEWMA(currentTDEE, previousSmoothedTDEE, alpha);
        },
        
        calculateFastTDEE: function(entries, unit, minDays) {
            if (typeof _TDEE !== 'undefined' && _TDEE.calculateFastTDEE) {
                return _TDEE.calculateFastTDEE(entries, unit, minDays);
            }
            // Fallback implementation would go here (omitted for brevity)
            return { tdee: null, confidence: 'none', trackedDays: 0, hasOutliers: false };
        },
        
        calculateStableTDEE: function(entries, unit, windowDays, minDays) {
            if (typeof _TDEE !== 'undefined' && _TDEE.calculateStableTDEE) {
                return _TDEE.calculateStableTDEE(entries, unit, windowDays, minDays);
            }
            // Fallback implementation would go here (omitted for brevity)
            return { tdee: null, confidence: 'none', trackedDays: 0 };
        },
        
        calculateSmoothTDEEArray: function(weeklyTdees, alpha) {
            if (typeof _TDEE !== 'undefined' && _TDEE.calculateSmoothTDEEArray) {
                return _TDEE.calculateSmoothTDEEArray(weeklyTdees, alpha);
            }
            // Fallback inline implementation
            const smoothed = [];
            let previousSmoothed = null;
            for (const tdee of weeklyTdees) {
                if (tdee === null || isNaN(tdee)) {
                    smoothed.push(null);
                    continue;
                }
                if (previousSmoothed === null) {
                    smoothed.push(tdee);
                    previousSmoothed = tdee;
                } else {
                    const s = Calculator.calculateEWMA(tdee, previousSmoothed, alpha);
                    smoothed.push(s);
                    previousSmoothed = s;
                }
            }
            return smoothed;
        },
        
        calculatePeriodTDEE: function(entries, unit) {
            if (typeof _TDEE !== 'undefined' && _TDEE.calculatePeriodTDEE) {
                return _TDEE.calculatePeriodTDEE(entries, unit);
            }
            // Fallback implementation would go here
            return null;
        },
        
        calculateSlope: function(entries) {
            if (typeof _TDEE !== 'undefined' && _TDEE.calculateSlope) {
                return _TDEE.calculateSlope(entries);
            }
            // Fallback implementation would go here
            return 0;
        },

        // Data processing (re-exported from TDEE module)
        processEntriesWithGaps: function(entries) {
            if (typeof _TDEE !== 'undefined' && _TDEE.processEntriesWithGaps) {
                return _TDEE.processEntriesWithGaps(entries);
            }
            // Fallback inline implementation
            const processed = [];
            let previousEWMA = null;
            for (const entry of entries) {
                const hasWeight = entry.weight !== null && !isNaN(entry.weight);
                const hasCalories = entry.calories !== null && !isNaN(entry.calories);
                const item = {
                    date: entry.date,
                    weight: hasWeight ? entry.weight : null,
                    calories: hasCalories ? entry.calories : null,
                    isGap: !hasCalories,
                    weightOnly: hasWeight && !hasCalories,
                };
                if (hasWeight) {
                    item.ewmaWeight = Calculator.calculateEWMA(entry.weight, previousEWMA);
                    previousEWMA = item.ewmaWeight;
                }
                processed.push(item);
            }
            return processed;
        },
        
        excludeCalorieOutliers: function(calories, threshold) {
            if (typeof _TDEE !== 'undefined' && _TDEE.excludeCalorieOutliers) {
                return _TDEE.excludeCalorieOutliers(calories, threshold);
            }
            // Fallback implementation would go here
            return { filteredCalories: calories, filteredAvg: null, outliers: [], originalAvg: null };
        },

        // Local functions (remain in calculator.js)
        calculateDailyTarget,
        calculateWeeksToGoal,
        calculateWeeklySummary,
        detectOutliers,
        calculateStats,
        getDataQualityWarnings,
        calculateBMR,
        calculateTheoreticalTDEE,

        // Unit conversion
        convertWeight,
        convertCalories,

        // Utilities
        round,
        mround,

        // Constants (for testing)
        CALORIES_PER_KG,
        CALORIES_PER_LB,
        DEFAULT_ALPHA,
        VOLATILE_ALPHA,
        OUTLIER_THRESHOLD,
        ROLLING_WINDOW,
        MIN_TRACKED_DAYS,
        CV_THRESHOLD,
        CONFIDENCE_TIERS
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.Calculator = Calculator;
}

// Export for Node.js testing (if running with Node)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculator;
}
