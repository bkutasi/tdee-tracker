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

        // If CV > threshold, use lower alpha for more smoothing
        return coefficientOfVariation > CV_THRESHOLD ? VOLATILE_ALPHA : DEFAULT_ALPHA;
    }

    /**
     * Get dynamic energy density based on body fat
     * 7716 kcal/kg is valid for obese (>30kg fat), but overestimates for lean individuals
     * @param {number} bodyFatKg - Estimated body fat in kg
     * @returns {number} Energy density in kcal/kg
     */
    function getEnergyDensity(bodyFatKg) {
        if (bodyFatKg === null || bodyFatKg === undefined) return CALORIES_PER_KG;
        if (bodyFatKg < 15) return 5500;   // Lean (~10kg fat)
        if (bodyFatKg < 25) return 6500;   // Average (~20kg fat)
        if (bodyFatKg < 35) return 7200;   // Overweight (~30kg fat)
        return CALORIES_PER_KG;             // Obese (30+kg fat)
    }

    /**
     * Get data quality warnings for TDEE calculations
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
        
        // Check for insufficient data
        if (entries.length < 7) {
            warnings.push(`More data needed for accurate TDEE (have ${entries.length} days, need 7+)`);
        }
        
        // Check for high weight variance
        const weights = entries.filter(e => e.weight !== null).map(e => e.weight);
        if (weights.length >= 3) {
            const stats = calculateStats(weights);
            const cv = stats.stdDev / stats.mean;
            if (cv > 0.03) { // 3% CV is high for weight
                warnings.push('High weight variance detected - may indicate water retention');
            }
        }
        
        // Check for gaps
        const calorieEntries = entries.filter(e => e.calories !== null && !isNaN(e.calories));
        if (calorieEntries.length < entries.length * 0.7) {
            warnings.push('Missing calorie data may affect accuracy');
        }
        
        // Check for plateau (optional - requires longer history)
        if (entries.length >= 14) {
            const recentWeights = weights.slice(-14);
            if (recentWeights.length >= 10) {
                const firstHalf = recentWeights.slice(0, Math.floor(recentWeights.length / 2));
                const secondHalf = recentWeights.slice(Math.floor(recentWeights.length / 2));
                const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                if (Math.abs(secondAvg - firstAvg) < 0.2) {
                    warnings.push('Weight plateau detected - consider metabolic adaptation');
                }
            }
        }
        
        return warnings;
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
    function calculateTDEE({ avgCalories, weightDelta, trackedDays, unit = 'kg', bodyFatKg = null }) {
        if (trackedDays === 0) return null;

        // Use dynamic energy density if body fat is provided
        let calPerUnit;
        if (unit === 'kg') {
            calPerUnit = getEnergyDensity(bodyFatKg);
        } else {
            calPerUnit = CALORIES_PER_LB;  // 3500 cal/lb is standard
        }

        // TDEE = intake + (surplus or deficit from weight change)
        // If weight went down, delta is negative, so we ADD to intake
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
     * Calculate EWMA weight delta between first and last entries
     * More robust than raw weight delta - smooths out daily fluctuations
     * @param {Object[]} processedEntries - Array of processed entries with ewmaWeight
     * @returns {number|null} EWMA-smoothed weight change, or null if insufficient data
     */
    function calculateEWMAWeightDelta(processedEntries) {
        // Find first and last entries with EWMA weight
        const withEWMA = processedEntries.filter(e => e.ewmaWeight !== null && e.ewmaWeight !== undefined);

        if (withEWMA.length < 2) return null;

        const firstEWMA = withEWMA[0].ewmaWeight;
        const lastEWMA = withEWMA[withEWMA.length - 1].ewmaWeight;

        return round(lastEWMA - firstEWMA, 3);
    }

    /**
     * Exclude calorie outliers from calculation
     * Detects "cheat days" that would skew the average
     * @param {number[]} calories - Array of calorie values
     * @param {number} threshold - Standard deviations for outlier detection (default: 2.5)
     * @returns {Object} { filteredCalories, filteredAvg, outliers, originalAvg }
     */
    function excludeCalorieOutliers(calories, threshold = 2.5) {
        if (calories.length < 3) {
            const avg = calories.length > 0
                ? round(calories.reduce((a, b) => a + b, 0) / calories.length, 0)
                : null;
            return {
                filteredCalories: calories,
                filteredAvg: avg,
                outliers: [],
                originalAvg: avg
            };
        }

        const stats = calculateStats(calories);
        const outliers = [];
        const filtered = [];

        for (const cal of calories) {
            if (Math.abs(cal - stats.mean) > (threshold * stats.stdDev)) {
                outliers.push(cal);
            } else {
                filtered.push(cal);
            }
        }

        const filteredAvg = filtered.length > 0
            ? round(filtered.reduce((a, b) => a + b, 0) / filtered.length, 0)
            : null;

        return {
            filteredCalories: filtered,
            filteredAvg,
            outliers,
            originalAvg: round(stats.mean, 0)
        };
    }

    /**
     * Calculate "Fast" TDEE - reactive 7-day estimate for dashboard
     * Uses EWMA weight delta and requires minimum tracked days
     * @param {Object[]} entries - Array of daily entries (should be last 7+ days)
     * @param {string} unit - 'kg' or 'lb'
     * @param {number} minDays - Minimum calorie-tracked days required
     * @returns {Object} { tdee, confidence, trackedDays, hasOutliers }
     */
    function calculateFastTDEE(entries, unit = 'kg', minDays = MIN_TRACKED_DAYS) {
        if (!entries || entries.length === 0) {
            return { tdee: null, confidence: 'none', trackedDays: 0, hasOutliers: false };
        }

        // Process entries to get EWMA weights
        const processed = processEntriesWithGaps(entries);

        // Get calorie entries
        const calorieEntries = entries.filter(e => e.calories !== null && !isNaN(e.calories));
        const trackedDays = calorieEntries.length;

        // Determine confidence level based on scientific tiers (Hall & Chow 2011)
        let confidence = 'none';
        let accuracy = null;
        if (trackedDays >= CONFIDENCE_TIERS.HIGH.minDays) {
            confidence = 'high';
            accuracy = CONFIDENCE_TIERS.HIGH.accuracy;
        } else if (trackedDays >= CONFIDENCE_TIERS.MEDIUM.minDays) {
            confidence = 'medium';
            accuracy = CONFIDENCE_TIERS.MEDIUM.accuracy;
        } else if (trackedDays >= CONFIDENCE_TIERS.LOW.minDays) {
            confidence = 'low';
            accuracy = CONFIDENCE_TIERS.LOW.accuracy;
        }

        // Return null TDEE if below minimum threshold
        if (trackedDays < minDays) {
            return { tdee: null, confidence, trackedDays, hasOutliers: false, neededDays: minDays - trackedDays, accuracy };
        }

        // Check for weight data
        const weightEntries = processed.filter(e => e.ewmaWeight !== null);
        if (weightEntries.length < 2) {
            return { tdee: null, confidence, trackedDays, hasOutliers: false };
        }

        // Calculate calories (with outlier detection)
        const calories = calorieEntries.map(e => e.calories);
        const calResult = excludeCalorieOutliers(calories);
        const avgCalories = calResult.filteredAvg;
        const hasOutliers = calResult.outliers.length > 0;

        // Calculate EWMA weight delta
        const weightDelta = calculateEWMAWeightDelta(processed);
        if (weightDelta === null) {
            return { tdee: null, confidence, trackedDays, hasOutliers };
        }

        // Calculate TDEE
        const tdee = calculateTDEE({
            avgCalories,
            weightDelta,
            trackedDays: entries.length, // Use total period length for proper scaling
            unit
        });

        return { tdee, confidence, trackedDays, hasOutliers, outliers: calResult.outliers, accuracy };
    }

    /**
     * Calculate "Smooth" TDEE - EWMA over weekly TDEEs for chart display
     * More stable but slightly lagging
     * @param {number[]} weeklyTdees - Array of weekly TDEE values (nulls are skipped)
     * @param {number} alpha - EWMA smoothing factor
     * @returns {number[]} Array of smoothed TDEE values
     */
    function calculateSmoothTDEEArray(weeklyTdees, alpha = DEFAULT_ALPHA) {
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
                const s = calculateEWMA(tdee, previousSmoothed, alpha);
                smoothed.push(s);
                previousSmoothed = s;
            }
        }

        return smoothed;
    }

    /**
     * Calculate "Stable" TDEE - uses linear regression on EWMA weights over longer window
     * Much more stable than single-week calculations, resistant to water/glycogen fluctuations
     * @param {Object[]} entries - Array of daily entries (should be 14+ days)
     * @param {string} unit - 'kg' or 'lb'
     * @param {number} windowDays - Window size for regression (default: 14)
     * @param {number} minDays - Minimum calorie-tracked days required
     * @returns {Object} { tdee, confidence, trackedDays, slope, hasLargeGap }
     */
    function calculateStableTDEE(entries, unit = 'kg', windowDays = 14, minDays = MIN_TRACKED_DAYS) {
        if (!entries || entries.length < 7) {
            return { tdee: null, confidence: 'none', trackedDays: 0 };
        }

        // Process entries to get EWMA weights
        const processed = processEntriesWithGaps(entries);

        // Detect large gaps in weight data (>2 consecutive days without weight)
        let hasLargeGap = false;
        let maxGap = 0;
        let consecutiveNoWeight = 0;
        for (const entry of entries) {
            if (entry.weight === null || entry.weight === undefined) {
                consecutiveNoWeight++;
                maxGap = Math.max(maxGap, consecutiveNoWeight);
            } else {
                consecutiveNoWeight = 0;
            }
        }
        hasLargeGap = maxGap > 2;

        // Get calorie entries
        const calorieEntries = entries.filter(e => e.calories !== null && !isNaN(e.calories));
        const trackedDays = calorieEntries.length;

        // Determine confidence based on scientific tiers AND gap presence
        let confidence = 'none';
        let accuracy = null;
        const windowCoverage = trackedDays / windowDays;
        if (hasLargeGap) {
            // Large gap reduces max confidence to 'low'
            if (trackedDays >= MIN_TRACKED_DAYS) {
                confidence = 'low';
                accuracy = CONFIDENCE_TIERS.LOW.accuracy;
            }
        } else if (trackedDays >= CONFIDENCE_TIERS.HIGH.minDays) {
            confidence = 'high';
            accuracy = CONFIDENCE_TIERS.HIGH.accuracy;
        } else if (trackedDays >= CONFIDENCE_TIERS.MEDIUM.minDays) {
            confidence = 'medium';
            accuracy = CONFIDENCE_TIERS.MEDIUM.accuracy;
        } else if (trackedDays >= CONFIDENCE_TIERS.LOW.minDays) {
            confidence = 'low';
            accuracy = CONFIDENCE_TIERS.LOW.accuracy;
        }


        if (trackedDays < minDays) {
            return { tdee: null, confidence, trackedDays, neededDays: minDays - trackedDays, hasLargeGap };
        }

        // Build regression data from EWMA weights
        const ewmaData = processed
            .filter(e => e.ewmaWeight !== null && e.ewmaWeight !== undefined)
            .map((e, i, arr) => {
                // Calculate day index from first entry
                const dayIndex = Math.round(
                    (new Date(e.date) - new Date(arr[0].date)) / (1000 * 60 * 60 * 24)
                );
                return { dayIndex, weight: e.ewmaWeight };
            });

        if (ewmaData.length < 2) {
            return { tdee: null, confidence, trackedDays, hasLargeGap };
        }

        // Linear regression on EWMA weights
        const n = ewmaData.length;
        const sumX = ewmaData.reduce((a, b) => a + b.dayIndex, 0);
        const sumY = ewmaData.reduce((a, b) => a + b.weight, 0);
        const sumXY = ewmaData.reduce((a, b) => a + (b.dayIndex * b.weight), 0);
        const sumXX = ewmaData.reduce((a, b) => a + (b.dayIndex * b.dayIndex), 0);

        const denominator = (n * sumXX - sumX * sumX);
        if (denominator === 0) {
            return { tdee: null, confidence, trackedDays, hasLargeGap };
        }

        const slope = (n * sumXY - sumX * sumY) / denominator;

        // Slope is kg/day. Positive = gaining, Negative = losing
        // Calculate average calories (with outlier exclusion)
        const calories = calorieEntries.map(e => e.calories);
        const calResult = excludeCalorieOutliers(calories);
        const avgCalories = calResult.filteredAvg;

        if (avgCalories === null) {
            return { tdee: null, confidence, trackedDays, hasLargeGap };
        }

        // TDEE = avgCalories - (slope * cal_per_unit)
        // If slope is negative (losing), we subtract negative = add
        // If slope is positive (gaining), we subtract positive = lower TDEE
        const calPerUnit = unit === 'kg' ? CALORIES_PER_KG : CALORIES_PER_LB;
        const tdee = round(avgCalories - (slope * calPerUnit), 0);

        return {
            tdee,
            confidence,
            trackedDays,
            slope: round(slope * 7, 3), // kg/week for display
            hasOutliers: calResult.outliers.length > 0,
            outliers: calResult.outliers,
            hasLargeGap,
            maxGap
        };
    }

    /**
     * Calculate slope of weight change using Linear Regression
     * @param {Object[]} entries - Array of entries with date and weight
     * @returns {number} Slope (weight change per day)
     */
    function calculateSlope(entries) {
        // Filter for entries with weight
        const data = entries
            .filter(e => e.weight !== null && !isNaN(e.weight))
            .map((e, i) => ({
                x: i, // We use index as a proxy for days if contiguous, but better to use date diff if gaps
                // However, for standard period calculation on processed contiguous array, index is fine.
                // NOTE: If entries are daily and sorted (even with gaps filled with null), 
                // we should map true day index relative to start.
                dayIndex: Math.round((new Date(e.date) - new Date(entries[0].date)) / (1000 * 60 * 60 * 24)),
                y: e.weight
            }));

        const n = data.length;
        if (n < 2) return 0; // Need at least 2 points for a line

        const sumX = data.reduce((a, b) => a + b.dayIndex, 0);
        const sumY = data.reduce((a, b) => a + b.y, 0);
        const sumXY = data.reduce((a, b) => a + (b.dayIndex * b.y), 0);
        const sumXX = data.reduce((a, b) => a + (b.dayIndex * b.dayIndex), 0);

        const denominator = (n * sumXX - sumX * sumX);
        if (denominator === 0) return 0; // Vertical line or single x point

        const slope = (n * sumXY - sumX * sumY) / denominator;
        return slope;
    }

    /**
     * Calculate TDEE for a specific period of entries using Linear Regression
     * @param {Object[]} entries - Array of daily entries (should be a contiguous range)
     * @param {string} unit - 'kg' or 'lb'
     * @returns {number|null} Estimated TDEE or null if insufficient data
     */
    function calculatePeriodTDEE(entries, unit = 'kg') {
        if (!entries || entries.length === 0) return null;

        // 1. Calculate Average Calories (ignore nulls)
        const calorieEntries = entries.filter(e => e.calories !== null && !isNaN(e.calories));
        if (calorieEntries.length === 0) return null;

        const avgCalories = calorieEntries.reduce((a, b) => a + b.calories, 0) / calorieEntries.length;

        // 2. Calculate Weight Slope
        const slope = calculateSlope(entries);

        // If slope is near 0 but we have weights, it means maintenance. 
        // If we have no weights (<2 data points), slope returns 0, which might mislead.
        // Let's check data point count inside calculateSlope or here.
        const weightEntries = entries.filter(e => e.weight !== null && !isNaN(e.weight));
        if (weightEntries.length < 2) return null; // Cannot estimate TDEE without weight trend

        // 3. Calculate Weight Delta for the period
        // TDEE formula expects total weight delta over the period to calculate deficit/surplus
        // Delta = Slope * Days
        const trackedDays = entries.length; // Length of the period for TDEE scaling
        const weightDelta = slope * trackedDays;

        // 4. Calculate TDEE
        return calculateTDEE({
            avgCalories,
            weightDelta,
            trackedDays, // Formula divides by trackedDays, so (Slope * Days) / Days = Slope * CalPerUnit + AvgCals
            // Actually wait, existing formula:
            // tdee = avgCalories + ((-weightDelta * calPerUnit) / trackedDays);
            // If weightDelta = Slope * trackedDays, then:
            // tdee = avgCalories + ((-Slope * trackedDays * calPerUnit) / trackedDays)
            // tdee = avgCalories - (Slope * calPerUnit)
            // This makes sense: Slope is Rate of Gain. 
            // Gains (Slope > 0) -> Subtract from Intake to get Maintenance.
            unit
        });
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
        calculateSlope,
        calculatePeriodTDEE,
        calculateBMR,
        calculateTheoreticalTDEE,

        // Robust TDEE (new)
        calculateFastTDEE,
        calculateStableTDEE,
        calculateEWMAWeightDelta,
        excludeCalorieOutliers,
        calculateSmoothTDEEArray,

        // Data processing
        processEntriesWithGaps,
        calculateWeeklySummary,
        detectOutliers,
        calculateStats,
        getAdaptiveAlpha,
        getEnergyDensity,
        getDataQualityWarnings,

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
        ROLLING_WINDOW,
        MIN_TRACKED_DAYS
    };
})();

// Export for Node.js testing (if running with Node)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculator;
}
