/**
 * TDEE Calculator Engine
 * Core calculation algorithms for weight smoothing and TDEE estimation
 * 
 * Based on analysis of Improved_TDEE_Tracker.xlsx with mathematical improvements:
 * - EWMA weight smoothing (0.3/0.7 ratio)
 * - Rolling TDEE with 6-week window
 * - Adaptive smoothing for volatile periods
 * - Outlier detection for data quality
 * - Conservative gap handling (excludes non-tracked days from TDEE calc)
 */

const Calculator = (function () {
    'use strict';

    // Constants
    const CALORIES_PER_KG = 7716;  // ~3500 cal/lb * 2.205
    const CALORIES_PER_LB = 3500;
    const DEFAULT_ALPHA = 0.3;     // EWMA smoothing factor
    const VOLATILE_ALPHA = 0.1;   // Lower alpha for volatile periods
    const OUTLIER_THRESHOLD = 3;  // Standard deviations for outlier detection
    const ROLLING_WINDOW = 6;     // Weeks for rolling TDEE

    /**
     * Calculate Exponentially Weighted Moving Average
     * @param {number} current - Current value
     * @param {number|null} previous - Previous EWMA value (null for first entry)
     * @param {number} alpha - Smoothing factor (0-1, higher = more weight to current)
     * @returns {number} Smoothed value
     */
    function calculateEWMA(current, previous, alpha = DEFAULT_ALPHA) {
        if (previous === null || previous === undefined) {
            return round(current, 2);
        }
        const result = (current * alpha) + (previous * (1 - alpha));
        return round(result, 2);
    }

    /**
     * Calculate adaptive alpha based on recent volatility
     * @param {number[]} recentWeights - Last 7 days of weights
     * @returns {number} Alpha value (DEFAULT_ALPHA or VOLATILE_ALPHA)
     */
    function getAdaptiveAlpha(recentWeights) {
        if (recentWeights.length < 3) return DEFAULT_ALPHA;

        const stats = calculateStats(recentWeights);
        const coefficientOfVariation = stats.stdDev / stats.mean;

        // If CV > 2%, use lower alpha for more smoothing
        return coefficientOfVariation > 0.02 ? VOLATILE_ALPHA : DEFAULT_ALPHA;
    }

    /**
     * Calculate TDEE from weight change and calorie intake
     * Uses energy balance equation: TDEE = intake - (Δweight × cal_per_unit / days)
     * @param {Object} params
     * @param {number} params.avgCalories - Average daily calorie intake
     * @param {number} params.weightDelta - Weight change (end - start)
     * @param {number} params.trackedDays - Number of days with calorie data
     * @param {string} params.unit - 'kg' or 'lb'
     * @returns {number} Estimated TDEE
     */
    function calculateTDEE({ avgCalories, weightDelta, trackedDays, unit = 'kg' }) {
        if (trackedDays === 0) return null;

        const calPerUnit = unit === 'kg' ? CALORIES_PER_KG : CALORIES_PER_LB;

        // TDEE = intake + (surplus or deficit from weight change)
        // If weight went down, deltais negative, so we ADD to intake
        const tdee = avgCalories + ((-weightDelta * calPerUnit) / trackedDays);

        return round(tdee, 0);
    }

    /**
     * Calculate rolling TDEE average over multiple weeks
     * @param {Object[]} weeklyData - Array of week summaries
     * @param {number} windowSize - Number of weeks to average
     * @returns {number} Smoothed TDEE estimate
     */
    function calculateRollingTDEE(weeklyData, windowSize = ROLLING_WINDOW) {
        const validWeeks = weeklyData
            .filter(w => w.tdee !== null && !isNaN(w.tdee))
            .slice(-windowSize);

        if (validWeeks.length === 0) return null;

        const sum = validWeeks.reduce((acc, w) => acc + w.tdee, 0);
        return round(sum / validWeeks.length, 0);
    }

    /**
     * Calculate TDEE with EWMA smoothing (matches Excel BB column)
     * @param {number} currentTDEE - Current week's calculated TDEE
     * @param {number|null} previousSmoothedTDEE - Previous smoothed TDEE
     * @param {number} alpha - Smoothing factor
     * @returns {number} Smoothed TDEE
     */
    function calculateSmoothedTDEE(currentTDEE, previousSmoothedTDEE, alpha = DEFAULT_ALPHA) {
        return calculateEWMA(currentTDEE, previousSmoothedTDEE, alpha);
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
     * Handle missing/non-tracked days with conservative approach
     * Missing calorie days are excluded from TDEE calc, only weight contributes to EWMA
     * @param {Object[]} entries - Daily entries with date, weight, calories
     * @returns {Object} Processed data with gap info
     */
    function processEntriesWithGaps(entries) {
        const processed = [];
        let previousWeight = null;
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

            // Calculate EWMA even for weight-only entries
            if (hasWeight) {
                item.ewmaWeight = calculateEWMA(entry.weight, previousEWMA);
                previousEWMA = item.ewmaWeight;
                previousWeight = entry.weight;
            } else if (previousWeight !== null) {
                // Carry forward previous EWMA for full gaps
                item.ewmaWeight = previousEWMA;
            }

            processed.push(item);
        }

        return processed;
    }

    /**
     * Aggregate daily entries into weekly summary
     * @param {Object[]} dailyEntries - Processed daily entries
     * @returns {Object} Weekly summary with averages and TDEE
     */
    function calculateWeeklySummary(dailyEntries) {
        const weights = dailyEntries
            .filter(e => e.weight !== null)
            .map(e => e.weight);

        const calories = dailyEntries
            .filter(e => e.calories !== null)
            .map(e => e.calories);

        const trackedDays = calories.length;
        const totalDays = dailyEntries.length;

        const avgWeight = weights.length > 0
            ? round(weights.reduce((a, b) => a + b, 0) / weights.length, 2)
            : null;

        const avgCalories = calories.length > 0
            ? round(calories.reduce((a, b) => a + b, 0) / calories.length, 0)
            : null;

        // EWMA from last entry with weight
        const lastWithWeight = [...dailyEntries].reverse().find(e => e.ewmaWeight !== null);
        const ewmaWeight = lastWithWeight ? lastWithWeight.ewmaWeight : null;

        return {
            startDate: dailyEntries[0]?.date,
            endDate: dailyEntries[dailyEntries.length - 1]?.date,
            avgWeight,
            ewmaWeight,
            avgCalories,
            trackedDays,
            totalDays,
            confidence: round(trackedDays / totalDays, 2),
            hasGaps: trackedDays < totalDays
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
     * Calculate basic statistics
     * @param {number[]} data - Array of numbers
     * @returns {Object} { mean, stdDev, min, max }
     */
    function calculateStats(data) {
        if (data.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };

        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const squareDiffs = data.map(value => Math.pow(value - mean, 2));
        const variance = squareDiffs.reduce((a, b) => a + b, 0) / data.length;

        return {
            mean: round(mean, 4),
            stdDev: round(Math.sqrt(variance), 4),
            min: Math.min(...data),
            max: Math.max(...data)
        };
    }

    /**
     * Convert between units
     */
    function convertWeight(value, from, to) {
        if (from === to) return value;
        if (from === 'kg' && to === 'lb') return round(value * 2.20462, 2);
        if (from === 'lb' && to === 'kg') return round(value / 2.20462, 2);
        return value;
    }

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

    // Public API
    return {
        // Core calculations
        calculateEWMA,
        calculateTDEE,
        calculateRollingTDEE,
        calculateSmoothedTDEE,
        calculateDailyTarget,
        calculateWeeksToGoal,

        // Data processing
        processEntriesWithGaps,
        calculateWeeklySummary,
        detectOutliers,
        calculateStats,
        getAdaptiveAlpha,

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
        ROLLING_WINDOW
    };
})();

// Export for Node.js testing (if running with Node)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculator;
}
