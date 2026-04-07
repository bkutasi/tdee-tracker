/**
 * TDEE Calculation Module
 * Total Daily Energy Expenditure estimation algorithms
 * 
 * Features:
 * - Energy balance TDEE formula
 * - Fast TDEE (7-day reactive estimate)
 * - Stable TDEE (14-day regression-based)
 * - Gap-adjusted TDEE calculations
 * - Outlier detection for data quality
 */

const TDEE = (function () {
    'use strict';

    // TDEE-specific constants
    const CALORIES_PER_KG = 7716;  // ~3500 cal/lb * 2.205
    const CALORIES_PER_LB = 3500;
    const DEFAULT_ALPHA = 0.3;     // EWMA smoothing factor
    const VOLATILE_ALPHA = 0.1;    // Reduced alpha for volatile periods (CV > 2%)
    const ROLLING_WINDOW = 4;      // Weeks for rolling TDEE
    const MIN_TRACKED_DAYS = 14;           // Minimum for stable TDEE (dashboard, research-backed)
    const MIN_WEEKLY_TRACKED_DAYS = 7;     // Minimum for weekly chart TDEE (practical minimum)
    const OUTLIER_THRESHOLD = 3;           // Standard deviations for outlier detection
    const VOLATILE_CV_THRESHOLD = 2; // CV percentage threshold for volatility

    // Scientific confidence tiers (research-backed standards)
    const CONFIDENCE_TIERS = {
        HIGH: { minDays: 28, minWeightChange: 0.5, accuracy: '±5-10%' },
        MEDIUM: { minDays: 14, minWeightChange: 0.3, accuracy: '±10-15%' },
        LOW: { minDays: 7, minWeightChange: 0.2, accuracy: '±15-25%' }
    };

    // Multi-factor confidence scoring weights (must sum to 1.0) - Research-backed from nutritional epidemiology
    const CONFIDENCE_WEIGHTS = {
        DURATION: 0.40,        // 40% weight - tracking duration
        COMPLETENESS: 0.25,    // 25% weight - data completeness
        VOLATILITY: 0.20,      // 20% weight - weight volatility (CV)
        WEEKEND_COVERAGE: 0.15 // 15% weight - weekend coverage
    };

    // Confidence score thresholds for tier mapping
    const CONFIDENCE_SCORE_TIERS = {
        HIGH: 80,    // Score >= 80
        MEDIUM: 60,  // Score 60-79
        LOW: 40,     // Score 40-59
        NONE: 0      // Score < 40
    };

    // Use consolidated utilities from Utils module (with fallback for Node.js testing)
    function getRoundFn() {
        if (typeof Utils !== 'undefined' && Utils.round) return Utils.round;
        return function(v, d = 2) {
            if (v === null || v === undefined || isNaN(v)) return null;
            const f = Math.pow(10, d);
            return Math.round((v + Number.EPSILON) * f) / f;
        };
    }
    
    function getCalculateStatsFn() {
        if (typeof Utils !== 'undefined' && Utils.calculateStats) return Utils.calculateStats;
        const roundFn = getRoundFn();
        return function(data) {
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
                mean: roundFn(mean, 4),
                stdDev: roundFn(Math.sqrt(variance), 4),
                min: roundFn(min, 4),
                max: roundFn(max, 4)
            };
        };
    }
    
    // Cache the functions
    const round = getRoundFn();
    const calculateStats = getCalculateStatsFn();

    // Delegate CV, volatility, and adaptive alpha to EWMA module for consistency
    // Use EWMA module if available, otherwise use inline implementations
    const calculateCV = (typeof EWMA !== 'undefined' && EWMA.calculateCV) ? EWMA.calculateCV : function(weights) {
        if (!weights || weights.length === 0) return null;
        const stats = calculateStats(weights);
        if (stats.mean === 0) return null;
        return round((stats.stdDev / stats.mean) * 100, 2);
    };

    const isVolatile = (typeof EWMA !== 'undefined' && EWMA.isVolatile) ? EWMA.isVolatile : function(cv, threshold = 2) {
        if (cv === null || cv === undefined) return false;
        return cv > threshold;
    };

    const getAdaptiveAlpha = (typeof EWMA !== 'undefined' && EWMA.getAdaptiveAlpha) ? EWMA.getAdaptiveAlpha : function(cv) {
        if (cv === null || !isVolatile(cv)) return DEFAULT_ALPHA;
        return VOLATILE_ALPHA;
    };

    const calculateEWMA = (typeof EWMA !== 'undefined' && EWMA.calculateEWMA) ? EWMA.calculateEWMA : function(current, previous, alpha = DEFAULT_ALPHA) {
        if (previous === null || previous === undefined) return round(current, 2);
        const result = (current * alpha) + (previous * (1 - alpha));
        return round(result, 2);
    };

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
     * Calculate TDEE from weight change and calorie intake
     * Uses energy balance equation: TDEE = intake - (Δweight × cal_per_unit / days)
     * @param {Object} params
     * @param {number} params.avgCalories - Average daily calorie intake
     * @param {number} params.weightDelta - Weight change (end - start)
     * @param {number} params.trackedDays - Number of days with calorie data
     * @param {string} params.unit - 'kg' or 'lb'
     * @param {number} params.bodyFatKg - Estimated body fat in kg (optional)
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
        const roundedTdee = round(tdee, 0);

        // P0-2: Physiological range validation (800-5000 kcal)
        // Human BMR alone is ~1200-1800 kcal/day. TDEE below 800 or above 5000 is impossible.
        if (roundedTdee < 800 || roundedTdee > 5000) {
            return null;
        }

        return roundedTdee;
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
     * Exclude calorie outliers from calculation
     * Detects "cheat days" that would skew the average
     * @param {number[]} calories - Array of calorie values
     * @param {number} threshold - Standard deviations for outlier detection (default: 2.5)
     * @returns {Object} { filteredCalories, filteredAvg, outliers, originalAvg }
     */
    function excludeCalorieOutliers(calories, threshold = 2.5) {
        if (calories.length === 0) {
            return { filteredCalories: [], filteredAvg: null, outliers: [], originalAvg: null };
        }

        if (calories.length < 3) {
            const avg = round(calories.reduce((a, b) => a + b, 0) / calories.length, 0);
            return { filteredCalories: calories, filteredAvg: avg, outliers: [], originalAvg: avg };
        }

        // Calculate stats and classify outliers in one pass
        const stats = calculateStats(calories);
        const thresholdValue = threshold * stats.stdDev;
        const outliers = [];
        const filtered = [];
        let filteredSum = 0;

        for (const cal of calories) {
            if (Math.abs(cal - stats.mean) > thresholdValue) {
                outliers.push(cal);
            } else {
                filtered.push(cal);
                filteredSum += cal;
            }
        }

        const filteredAvg = filtered.length > 0 ? round(filteredSum / filtered.length, 0) : null;

        return { filteredCalories: filtered, filteredAvg, outliers, originalAvg: round(stats.mean, 0) };
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
        const weightEntries = processed.filter(e => e.ewmaWeight !== null && e.ewmaWeight !== undefined);
        if (weightEntries.length < 2) {
            return { tdee: null, confidence, trackedDays, hasOutliers: false };
        }

        // Check for water weight (unreliable data from rapid fluctuations)
        const isWaterWeight = detectWaterWeight(entries);
        if (isWaterWeight) {
            // Water weight detected - return null, fall back to Stable TDEE (14-day)
            return { 
                tdee: null, 
                confidence, 
                trackedDays, 
                hasOutliers: false,
                isWaterWeight: true,
                reason: 'Water weight detected - rapid fluctuation without calorie correlation'
            };
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

        // Calculate CV for weight volatility detection
        const weights = processed.filter(e => e.ewmaWeight !== null).map(e => e.ewmaWeight);
        const cv = calculateCV(weights);
        const isWeightVolatile = isVolatile(cv);

        // Calculate TDEE
        const tdee = calculateTDEE({
            avgCalories,
            weightDelta,
            trackedDays: calorieEntries.length, // FIX: Use actual tracked days (days with calorie data)
            unit
        });

        // Calculate multi-factor confidence score
        const fastEntriesForConfidence = entries; // Pass original entries for logging consistency calc
        const confidenceResult = calculateMultiFactorConfidence({
            trackedDays,
            cv,
            rSquared: null, // Fast TDEE doesn't calculate R²
            entries: fastEntriesForConfidence
        });

        return { 
            tdee, 
            confidence, 
            confidenceScore: confidenceResult.confidenceScore,
            confidenceTier: confidenceResult.confidenceTier,
            confidenceBreakdown: confidenceResult.breakdown,
            trackedDays, 
            hasOutliers, 
            outliers: calResult.outliers, 
            accuracy,
            cv,
            isVolatile: isWeightVolatile
        };
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
     * Detect water weight from rapid weight fluctuations not supported by calorie intake
     * Based on Hall & Chow (2011), Kreitzman et al. (1992) - glycogen-water binding
     * @param {Object[]} entries - Array of daily entries with weight and calories
     * @returns {boolean} true if water weight detected (unreliable data)
     */
    function detectWaterWeight(entries) {
        if (!entries || entries.length < 7) {
            return false; // Need at least 7 days to detect weekly rate
        }

        const sortedEntries = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
        const weightEntries = sortedEntries.filter(e => e.weight !== null && !isNaN(e.weight));
        
        if (weightEntries.length < 2) {
            return false;
        }

        // Calculate weight change over the period
        const firstEntry = weightEntries[0];
        const lastEntry = weightEntries[weightEntries.length - 1];
        const firstWeight = firstEntry.weight;
        const lastWeight = lastEntry.weight;
        const daysDiff = (new Date(lastEntry.date) - new Date(firstEntry.date)) / (1000 * 60 * 60 * 24);
        
        if (daysDiff < 1) {
            return false; // Need at least 1 day difference
        }

        const weeksDiff = daysDiff / 7;
        const weightChangePerWeek = (lastWeight - firstWeight) / weeksDiff;

        // Physiological bounds for fat/muscle change (Hall & Chow, 2011)
        const MAX_GAIN_PER_WEEK = 0.5;  // kg/week (muscle + fat, natural lifter)
        const MAX_LOSS_PER_WEEK = 1.0;  // kg/week (aggressive cut, sustainable)

        // Check if weight change exceeds physiological bounds
        const exceedsGainBound = weightChangePerWeek > MAX_GAIN_PER_WEEK;
        const exceedsLossBound = weightChangePerWeek < -MAX_LOSS_PER_WEEK;

        if (!exceedsGainBound && !exceedsLossBound) {
            return false; // Weight change is within normal bounds
        }

        // Weight change exceeds physiological bounds - check if calorie intake supports it
        const calorieEntries = sortedEntries.filter(e => e.calories !== null && !isNaN(e.calories));
        if (calorieEntries.length === 0) {
            // No calorie data - assume water weight if change is extreme (>2kg/week)
            return Math.abs(weightChangePerWeek) > 2.0;
        }

        const avgCalories = calorieEntries.reduce((sum, e) => sum + e.calories, 0) / calorieEntries.length;
        
        // Calculate required calorie surplus/deficit for observed weight change
        // 1 kg fat/muscle = 7716 calories
        const requiredDailySurplus = (weightChangePerWeek * CALORIES_PER_KG) / 7;
        const impliedTDEE = avgCalories - requiredDailySurplus;

        // If implied TDEE is physiologically impossible, it's water weight
        const IMPOSSIBLE_TDEE_MIN = 800;   // Below BMR, impossible
        const IMPOSSIBLE_TDEE_MAX = 5000;  // Superhuman, impossible

        if (impliedTDEE < IMPOSSIBLE_TDEE_MIN || impliedTDEE > IMPOSSIBLE_TDEE_MAX) {
            return true; // Water weight detected
        }

        // Additional check: if weight change rate is extreme (>1.5x max bound), it's water weight
        // Even if implied TDEE is technically possible, such rapid change is unlikely to be real tissue
        const EXTREME_GAIN_THRESHOLD = MAX_GAIN_PER_WEEK * 2; // >1.0 kg/week gain
        const EXTREME_LOSS_THRESHOLD = -MAX_LOSS_PER_WEEK * 1.5; // <-1.5 kg/week loss
        
        if (weightChangePerWeek > EXTREME_GAIN_THRESHOLD || weightChangePerWeek < EXTREME_LOSS_THRESHOLD) {
            return true; // Extreme rate indicates water weight
        }

        // Additional check: sudden swing >2kg in 3 days (glycogen-water loading)
        if (daysDiff <= 3 && Math.abs(lastWeight - firstWeight) > 2.0) {
            return true; // Sudden swing indicates water retention
        }

        // Weight gain during reported calorie deficit (physiologically impossible as fat/muscle)
        if (weightChangePerWeek > 0.3 && avgCalories < 2000) {
            return true; // Gaining weight on low calories = water retention
        }

        return false;
    }

    /**
     * Detect large gaps in weight data (>2 consecutive days without weight)
     * @param {Object[]} entries - Array of daily entries
     * @returns {Object} { hasLargeGap, maxGap }
     */
    function detectWeightGaps(entries) {
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
        
        return {
            hasLargeGap: maxGap > 2,
            maxGap
        };
    }

    /**
     * Determine confidence level based on scientific tiers and gap presence
     * @param {number} trackedDays - Number of calorie-tracked days
     * @param {boolean} hasLargeGap - Whether large gaps exist in weight data
     * @param {number} windowDays - Window size for regression
     * @returns {Object} { confidence, accuracy }
     */
    function determineConfidenceLevel(trackedDays, hasLargeGap, _windowDays) {
        let confidence = 'none';
        let accuracy = null;
        
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
        
        return { confidence, accuracy };
    }

    /**
     * Calculate calorie-average fallback when insufficient weight data for energy balance
     * @param {Object[]} calorieEntries - Array of entries with calorie data
     * @param {number} minDays - Minimum tracked days required
     * @param {boolean} hasLargeGap - Whether large gaps exist
     * @returns {Object|null} Fallback result or null if not applicable
     */
    function calculateCalorieAverageFallback(calorieEntries, minDays, hasLargeGap) {
        // If we have at least 4 days of calorie data, use average as estimate
        if (calorieEntries.length < 4) {
            return null;
        }
        
        // Calculate calorie average with outlier exclusion
        const fallbackCalories = calorieEntries.map(e => e.calories);
        const calResultFallback = excludeCalorieOutliers(fallbackCalories);
        
        if (calResultFallback.filteredAvg > 0) {
            return {
                tdee: calResultFallback.filteredAvg,
                confidence: 'low',
                trackedDays: calorieEntries.length,
                neededDays: minDays - calorieEntries.length,
                hasLargeGap,
                fallback: 'calorie-average',
                note: 'Calorie-average estimate (insufficient weight data for energy balance calculation)'
            };
        }
        
        return null;
    }

    /**
     * Build regression data from EWMA weights with day indices
     * @param {Object[]} processed - Processed entries with EWMA weights
     * @returns {Object[]} Array of { dayIndex, weight } for regression
     */
    function buildRegressionData(processed) {
        return processed
            .filter(e => e.ewmaWeight !== null && e.ewmaWeight !== undefined)
            .map((e, i, arr) => {
                const dayIndex = Math.round(
                    (new Date(e.date) - new Date(arr[0].date)) / (1000 * 60 * 60 * 24)
                );
                return { dayIndex, weight: e.ewmaWeight };
            });
    }

    /**
     * Perform linear regression on EWMA weights (single pass)
     * @param {Object[]} ewmaData - Array of { dayIndex, weight }
     * @returns {Object|null} { slope } or null if cannot calculate
     */
    function performLinearRegression(ewmaData) {
        if (ewmaData.length < 2) {
            return null;
        }

        const n = ewmaData.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        
        for (const { dayIndex, weight } of ewmaData) {
            sumX += dayIndex;
            sumY += weight;
            sumXY += dayIndex * weight;
            sumXX += dayIndex * dayIndex;
        }

        const denominator = (n * sumXX - sumX * sumX);
        if (denominator === 0) {
            return null;
        }

        const slope = (n * sumXY - sumX * sumY) / denominator;
        return { slope };
    }

    /**
     * Calculate TDEE from slope and average calories
     * @param {number} avgCalories - Average daily calorie intake
     * @param {number} slope - Weight change slope (kg/day)
     * @param {string} unit - 'kg' or 'lb'
     * @returns {number} Estimated TDEE
     */
    function calculateTDEEFromSlope(avgCalories, slope, unit) {
        const calPerUnit = unit === 'kg' ? CALORIES_PER_KG : CALORIES_PER_LB;
        // TDEE = avgCalories - (slope * cal_per_unit)
        // If slope is negative (losing), we subtract negative = add
        // If slope is positive (gaining), we subtract positive = lower TDEE
        return round(avgCalories - (slope * calPerUnit), 0);
    }

    /**
     * Build the final Stable TDEE result object with all metrics
     * @param {Object} params - Result parameters
     * @returns {Object} Complete TDEE result
     */
    function buildStableTDEEResult(params) {
        const {
            tdee,
            confidence,
            trackedDays,
            slope,
            hasLargeGap,
            maxGap,
            cv,
            isWeightVolatile,
            rSquared,
            fitQuality,
            confidenceResult,
            calResult
        } = params;

        return {
            tdee,
            confidence,
            confidenceScore: confidenceResult.confidenceScore,
            confidenceTier: confidenceResult.confidenceTier,
            confidenceBreakdown: confidenceResult.breakdown,
            trackedDays,
            slope: round(slope * 7, 3), // kg/week for display
            hasOutliers: calResult.outliers.length > 0,
            outliers: calResult.outliers,
            hasLargeGap,
            maxGap,
            cv,
            isVolatile: isWeightVolatile,
            rSquared,
            fitQuality
        };
    }

    /**
     * Validate minimum data requirements for stable TDEE
     * @param {Object[]} entries - Array of daily entries
     * @returns {boolean} True if valid
     */
    function _validateStableTDEEData(entries) {
        return entries && entries.length >= 7;
    }

    /**
     * Prepare data for stable TDEE calculation
     * @param {Object[]} entries - Array of daily entries
     * @returns {Object} Processed data
     */
    function _prepareStableTDEEData(entries) {
        const processed = processEntriesWithGaps(entries);
        const { hasLargeGap, maxGap } = detectWeightGaps(entries);
        const calorieEntries = entries.filter(e => e.calories !== null && !isNaN(e.calories));
        const trackedDays = calorieEntries.length;
        
        return { processed, hasLargeGap, maxGap, calorieEntries, trackedDays };
    }

    /**
     * Calculate regression-based TDEE from slope and calories
     * @param {Object} data - Prepared data
     * @param {string} unit - 'kg' or 'lb'
     * @returns {Object|null} TDEE result or null
     */
    function _calculateRegressionTDEE(data, unit) {
        // Build regression data
        const ewmaData = buildRegressionData(data.processed);
        if (ewmaData.length < 2) return null;

        // Perform linear regression
        const regressionResult = performLinearRegression(ewmaData);
        if (!regressionResult) return null;

        // Calculate average calories
        const calories = data.calorieEntries.map(e => e.calories);
        const calResult = excludeCalorieOutliers(calories);
        if (calResult.filteredAvg === null) return null;

        // Calculate TDEE
        const tdee = calculateTDEEFromSlope(calResult.filteredAvg, regressionResult.slope, unit);
        
        return { tdee, slope: regressionResult.slope, calResult, ewmaData, entries: data.calorieEntries };
    }

    /**
     * Calculate metrics for stable TDEE result
     * @param {Object} data - Prepared data
     * @param {Object} tdeeData - TDEE calculation data
     * @returns {Object} Metrics object
     */
    function _calculateStableTDEEMetrics(data, tdeeData) {
        const weights = data.processed.filter(e => e.ewmaWeight !== null).map(e => e.ewmaWeight);
        const cv = calculateCV(weights);
        const isWeightVolatile = isVolatile(cv);
        const rSquared = calculateRSquared(tdeeData.ewmaData);
        const fitQuality = getFitQuality(rSquared);
        
        return { cv, isWeightVolatile, rSquared, fitQuality };
    }

    /**
     * Handle fallback for insufficient tracked days
     * @param {Object} data - Prepared data
     * @param {number} minDays - Minimum days required
     * @param {string} confidence - Confidence level
     * @returns {Object|null} Fallback result or null
     */
    function _handleStableTDEEFallback(data, minDays, confidence) {
        const fallbackResult = calculateCalorieAverageFallback(data.calorieEntries, minDays, data.hasLargeGap);
        if (fallbackResult) {
            return fallbackResult;
        }
        return { tdee: null, confidence, trackedDays: data.trackedDays, neededDays: minDays - data.trackedDays, hasLargeGap: data.hasLargeGap };
    }

    /**
     * Build final stable TDEE result
     * @param {Object} data - Prepared data
     * @param {Object} tdeeResult - TDEE calculation result
     * @param {Object} metrics - Calculated metrics
     * @param {string} confidence - Confidence level
     * @returns {Object} Final result
     */
    function _buildFinalStableTDEE(data, tdeeResult, metrics, confidence) {
        const confidenceResult = calculateMultiFactorConfidence({
            trackedDays: data.trackedDays,
            cv: metrics.cv,
            rSquared: metrics.rSquared,
            entries: tdeeResult.entries
        });

        return buildStableTDEEResult({
            tdee: tdeeResult.tdee,
            confidence,
            trackedDays: data.trackedDays,
            slope: tdeeResult.slope,
            hasLargeGap: data.hasLargeGap,
            maxGap: data.maxGap,
            cv: metrics.cv,
            isWeightVolatile: metrics.isWeightVolatile,
            rSquared: metrics.rSquared,
            fitQuality: metrics.fitQuality,
            confidenceResult,
            calResult: tdeeResult.calResult
        });
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
        // Validate minimum data requirements
        if (!_validateStableTDEEData(entries)) {
            return { tdee: null, confidence: 'none', trackedDays: 0 };
        }

        // Check for water weight (unreliable data from rapid fluctuations)
        const isWaterWeight = detectWaterWeight(entries);
        if (isWaterWeight) {
            // Water weight detected - return null, data is unreliable
            return { 
                tdee: null, 
                confidence: 'none', 
                trackedDays: 0,
                isWaterWeight: true,
                reason: 'Water weight detected - rapid fluctuation without calorie correlation'
            };
        }

        // Prepare data
        const data = _prepareStableTDEEData(entries);
        
        // Determine confidence level
        const { confidence } = determineConfidenceLevel(data.trackedDays, data.hasLargeGap, windowDays);

        // Check if we need fallback
        if (data.trackedDays < minDays) {
            return _handleStableTDEEFallback(data, minDays, confidence);
        }

        // Calculate regression-based TDEE
        const tdeeResult = _calculateRegressionTDEE(data, unit);
        if (!tdeeResult || !tdeeResult.tdee) {
            return { tdee: null, confidence, trackedDays: data.trackedDays, hasLargeGap: data.hasLargeGap };
        }

        // Calculate metrics and build result
        const metrics = _calculateStableTDEEMetrics(data, tdeeResult);
        return _buildFinalStableTDEE(data, tdeeResult, metrics, confidence);
    }

    /**
     * Calculate linear regression coefficients (slope and intercept)
     * @param {Object[]} dataPoints - Array of {x, y} data points
     * @returns {Object|null} { slope, intercept } or null if insufficient data
     */
    function calculateLinearRegression(dataPoints) {
        if (!dataPoints || dataPoints.length < 2) {
            return null;
        }

        const n = dataPoints.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        for (const { x, y } of dataPoints) {
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        }

        const denominator = (n * sumXX - sumX * sumX);
        if (denominator === 0) {
            return null;
        }

        const slope = (n * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
    }

    /**
     * Calculate R² (coefficient of determination) for trend fit quality
     * R² = 1 - (SS_res / SS_tot) where SS_res = Σ(y - ŷ)², SS_tot = Σ(y - ȳ)²
     * @param {Object[]} dataPoints - Array of {x, y} data points (e.g., {dayIndex, weight})
     * @returns {number|null} R² value (0 to 1, where 1 = perfect linear fit), or null if cannot calculate
     */
    function calculateRSquared(dataPoints) {
        // Edge case: need at least 2 data points
        if (!dataPoints || dataPoints.length < 2) {
            return null;
        }

        // Calculate mean of y values (ȳ)
        let sumY = 0;
        for (const { y } of dataPoints) {
            sumY += y;
        }
        const meanY = sumY / dataPoints.length;

        // Calculate total sum of squares (SS_tot = Σ(y - ȳ)²)
        let ssTot = 0;
        for (const { y } of dataPoints) {
            ssTot += (y - meanY) ** 2;
        }

        // Edge case: zero variance (all y values are the same)
        if (ssTot === 0) {
            return null;
        }

        // Get linear regression line
        const regression = calculateLinearRegression(dataPoints);
        if (regression === null) {
            return null;
        }

        // Calculate residual sum of squares (SS_res = Σ(y - ŷ)²)
        let ssRes = 0;
        for (const { x, y } of dataPoints) {
            const yHat = regression.slope * x + regression.intercept;
            ssRes += (y - yHat) ** 2;
        }

        // R² = 1 - (SS_res / SS_tot)
        const rSquared = 1 - (ssRes / ssTot);
        return round(rSquared, 4);
    }

    /**
     * Get fit quality description based on R² value
     * @param {number} rSquared - R² value (0 to 1)
     * @returns {string|null} Fit quality: 'excellent' (>0.8), 'good' (0.6-0.8), 'fair' (0.4-0.6), 'poor' (<0.4), or null if rSquared is null
     */
    function getFitQuality(rSquared) {
        if (rSquared === null || rSquared === undefined) {
            return null;
        }

        if (rSquared > 0.8) {
            return 'excellent';
        } else if (rSquared > 0.6) {
            return 'good';
        } else if (rSquared > 0.4) {
            return 'fair';
        } else {
            return 'poor';
        }
    }

    /**
     * Calculate duration score using penalty-based system (research-backed)
     * Starting from 100, penalties applied based on tracking duration
     * @param {number} daysTracked - Number of tracked days
     * @returns {number} Score: 100 (28+), 85 (14-27), 70 (7-13), 40 (<7)
     */
    function getDaysTrackedScore(daysTracked) {
        if (daysTracked >= 28) return 100;  // Optimal duration, no penalty
        if (daysTracked >= 14) return 85;   // -15 penalty
        if (daysTracked >= 7) return 70;    // -30 penalty
        return 40;                           // -60 penalty (very insufficient)
    }

    /**
     * Calculate completeness score using penalty-based system (research-backed)
     * Starting from 100, penalties applied based on data completeness ratio
     * @param {number} trackedDays - Number of days with data
     * @param {number} totalDays - Total days in period
     * @returns {number} Score: 100 (≥85%), 75 (70-84%), 50 (<70%)
     */
    function getCompletenessScore(trackedDays, totalDays) {
        if (!totalDays || totalDays === 0) return 50;
        
        const completeness = trackedDays / totalDays;
        
        if (completeness >= 0.85) return 100;  // ≥85% complete, no penalty
        if (completeness >= 0.70) return 75;   // 70-84% complete, -25 penalty
        return 50;                              // <70% complete, -50 penalty
    }

    /**
     * Calculate CV score using penalty-based system (research-backed)
     * Starting from 100, penalties applied based on weight volatility
     * @param {number|null} cv - Coefficient of Variation percentage
     * @returns {number} Score: 100 (CV<0.2), 80 (0.2-0.3), 60 (>0.3)
     */
    function getCVScore(cv) {
        if (cv === null || cv === undefined) return 60; // Default to moderate score if unknown
        
        if (cv < 0.2) return 100;   // Low volatility, no penalty
        if (cv < 0.3) return 80;    // Moderate volatility, -20 penalty
        return 60;                   // High volatility, -40 penalty
    }

    /**
     * Calculate R² score (0-100 points)
     * Higher R² = better fit = higher score
     * @param {number|null} rSquared - R² value (0 to 1)
     * @returns {number} Score: 100 (R²>0.8), 70 (0.5-0.8), 40 (<0.5)
     */
    function getRSquaredScore(rSquared) {
        if (rSquared === null || rSquared === undefined) return 40; // Default to low score if unknown
        
        if (rSquared > 0.8) return 100;   // Excellent fit
        if (rSquared >= 0.5) return 70;   // Moderate fit
        return 40;                         // Poor fit
    }

    /**
     * Calculate weekend coverage score using penalty-based system (research-backed)
     * Starting from 100, penalties applied based on weekend day coverage
     * Weekend days are Saturday (6) and Sunday (0)
     * @param {Object[]} entries - Array of daily entries
     * @param {number} totalDays - Total days in tracking period
     * @returns {number} Score: 100 (≥50% weekends), 70 (<50%), 40 (0% weekends)
     */
    function getWeekendCoverageScore(entries, totalDays) {
        if (!entries || entries.length === 0 || totalDays <= 0) return 40;
        
        // Count expected weekends in period
        const expectedWeekends = Math.floor(totalDays / 7) * 2;
        if (expectedWeekends === 0) return 100; // Too short a period, no penalty
        
        // Count weekend days with entries
        let weekendDaysTracked = 0;
        for (const entry of entries) {
            const date = new Date(entry.date);
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
                weekendDaysTracked++;
            }
        }
        
        const weekendCoverage = weekendDaysTracked / expectedWeekends;
        
        if (weekendCoverage >= 0.5) return 100;  // ≥50% coverage, no penalty
        if (weekendCoverage > 0) return 70;      // <50% coverage, -30 penalty
        return 40;                                // 0% coverage, -60 penalty
    }

    /**
     * Calculate logging consistency score (0-100 points)
     * @param {Object[]} entries - Array of daily entries
     * @param {number} totalDays - Total days in tracking period
     * @returns {number} Score: percentage of days with both weight AND calories
     */
    function getLoggingConsistencyScore(entries, totalDays) {
        if (!entries || entries.length === 0 || totalDays <= 0) return 0;
        
        // Count days with both weight AND calories
        let daysWithBoth = 0;
        for (const entry of entries) {
            const hasWeight = entry.weight !== null && !isNaN(entry.weight);
            const hasCalories = entry.calories !== null && !isNaN(entry.calories);
            if (hasWeight && hasCalories) {
                daysWithBoth++;
            }
        }
        
        // Calculate percentage
        const consistency = (daysWithBoth / totalDays) * 100;
        return round(consistency, 0);
    }

    /**
     * Calculate multi-factor confidence score using research-backed 4-factor model
     * Factors: duration (40%), completeness (25%), volatility (20%), weekend coverage (15%)
     * Water weight detection applies additional -20 point penalty
     * @param {Object} tdeeResult - TDEE calculation result containing: trackedDays, entries, cv, rSquared, isWaterWeight
     * @returns {Object} { confidenceScore (0-100), confidenceTier (HIGH/MEDIUM/LOW/NONE), breakdown: { durationScore, completenessScore, volatilityScore, weekendScore } }
     */
    function calculateMultiFactorConfidence(tdeeResult) {
        if (!tdeeResult) {
            return {
                confidenceScore: 0,
                confidenceTier: 'NONE',
                breakdown: {
                    durationScore: 0,
                    completenessScore: 0,
                    volatilityScore: 0,
                    weekendScore: 0
                }
            };
        }

        // Extract data from TDEE result
        const trackedDays = tdeeResult.trackedDays || 0;
        const cv = tdeeResult.cv !== undefined ? tdeeResult.cv : null;
        const rSquared = tdeeResult.rSquared !== undefined ? tdeeResult.rSquared : null;
        const entries = tdeeResult.entries || [];
        const isWaterWeight = tdeeResult.isWaterWeight || false;
        
        // Calculate total days from entries (calendar span)
        let totalDays = trackedDays;
        if (entries.length > 0) {
            // Calculate calendar span from first to last entry
            const dates = entries.map(e => new Date(e.date).getTime()).filter(t => !isNaN(t));
            if (dates.length >= 2) {
                const minDate = Math.min(...dates);
                const maxDate = Math.max(...dates);
                const spanDays = Math.round((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
                totalDays = Math.max(spanDays, trackedDays);
            } else if (entries.length === 1) {
                totalDays = 1;
            }
        }

        // Calculate individual factor scores using penalty-based system
        const durationScore = getDaysTrackedScore(trackedDays);
        const completenessScore = getCompletenessScore(trackedDays, totalDays);
        const volatilityScore = getCVScore(cv);
        const weekendScore = getWeekendCoverageScore(entries, totalDays);

        // Calculate weighted average using new weights
        const weightedScore = 
            (durationScore * CONFIDENCE_WEIGHTS.DURATION) +
            (completenessScore * CONFIDENCE_WEIGHTS.COMPLETENESS) +
            (volatilityScore * CONFIDENCE_WEIGHTS.VOLATILITY) +
            (weekendScore * CONFIDENCE_WEIGHTS.WEEKEND_COVERAGE);

        // Apply water weight penalty (-20 points if detected)
        const waterWeightPenalty = isWaterWeight ? 20 : 0;
        const confidenceScore = Math.max(0, round(weightedScore - waterWeightPenalty, 0));

        // Map to confidence tier
        let confidenceTier;
        if (confidenceScore >= CONFIDENCE_SCORE_TIERS.HIGH) {
            confidenceTier = 'HIGH';
        } else if (confidenceScore >= CONFIDENCE_SCORE_TIERS.MEDIUM) {
            confidenceTier = 'MEDIUM';
        } else if (confidenceScore >= CONFIDENCE_SCORE_TIERS.LOW) {
            confidenceTier = 'LOW';
        } else {
            confidenceTier = 'NONE';
        }

        return {
            confidenceScore,
            confidenceTier,
            breakdown: {
                durationScore,
                completenessScore,
                volatilityScore,
                weekendScore
            }
        };
    }

    /**
     * Calculate slope of weight change using Linear Regression
     * @param {Object[]} entries - Array of entries with date and weight
     * @returns {number} Slope (weight change per day)
     */
    function calculateSlope(entries) {
        if (!entries || entries.length === 0) return 0;
        
        const startDate = new Date(entries[0].date);
        const data = entries
            .filter(e => e.weight !== null && !isNaN(e.weight))
            .map(e => ({
                dayIndex: Math.round((new Date(e.date) - startDate) / (1000 * 60 * 60 * 24)),
                weight: e.weight
            }));

        if (data.length < 2) return 0;

        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (const { dayIndex, weight } of data) {
            sumX += dayIndex;
            sumY += weight;
            sumXY += dayIndex * weight;
            sumXX += dayIndex * dayIndex;
        }

        const denominator = n * sumXX - sumX * sumX;
        if (denominator === 0) return 0;

        return (n * sumXY - sumX * sumY) / denominator;
    }

    /**
     * Calculate TDEE for a specific period of entries using Linear Regression
     * @param {Object[]} entries - Array of daily entries (should be a contiguous range)
     * @param {string} unit - 'kg' or 'lb'
     * @returns {number|null} Estimated TDEE or null if insufficient data
     */
    function calculatePeriodTDEE(entries, unit = 'kg') {
        if (!entries || entries.length === 0) return null;

        // Single pass: collect calories and check weight count
        let calorieSum = 0, calorieCount = 0, weightCount = 0;
        for (const entry of entries) {
            if (entry.calories !== null && !isNaN(entry.calories)) {
                calorieSum += entry.calories;
                calorieCount++;
            }
            if (entry.weight !== null && !isNaN(entry.weight)) {
                weightCount++;
            }
        }

        if (calorieCount === 0 || weightCount < 2) return null;

        const avgCalories = calorieSum / calorieCount;
        const slope = calculateSlope(entries);
        
        if (slope === 0 && weightCount < 2) return null;

        // TDEE = avgCalories - (slope * calPerUnit)
        const calPerUnit = unit === 'kg' ? CALORIES_PER_KG : CALORIES_PER_LB;
        const rawTdee = avgCalories - (slope * calPerUnit);

        // Physiological range validation (800-5000 kcal)
        // Human BMR alone is ~1200-1800 kcal/day. TDEE below 800 or above 5000 is impossible.
        if (rawTdee < 800 || rawTdee > 5000) {
            return null;
        }

        return round(rawTdee, 0);
    }

    // Public API
    return {
        // Core TDEE calculations
        calculateTDEE,
        calculateRollingTDEE,
        calculateSmoothedTDEE,
        calculateFastTDEE,
        calculateStableTDEE,
        calculatePeriodTDEE,
        calculateSlope,

        // Data processing
        processEntriesWithGaps,
        excludeCalorieOutliers,
        calculateSmoothTDEEArray,
        calculateEWMAWeightDelta,

        // Stable TDEE helpers (exported for testing)
        detectWeightGaps,
        determineConfidenceLevel,
        calculateCalorieAverageFallback,
        buildRegressionData,
        performLinearRegression,
        calculateTDEEFromSlope,
        buildStableTDEEResult,

        // Utilities (re-export from Utils/EWMA for convenience)
        calculateStats: Utils?.calculateStats || calculateStats,
        calculateEWMA: EWMA?.calculateEWMA || calculateEWMA,
        getAdaptiveAlpha: EWMA?.getAdaptiveAlpha || getAdaptiveAlpha,
        calculateCV: EWMA?.calculateCV || calculateCV,
        isVolatile: EWMA?.isVolatile || isVolatile,
        round: Utils?.round || round,
        getEnergyDensity,

        // CV calculation (weight volatility)
        calculateCV,
        isVolatile,
        getAdaptiveAlpha,

        // R² calculation (trend fit quality)
        calculateRSquared,
        getFitQuality,
        calculateLinearRegression,

        // Multi-factor confidence scoring
        calculateMultiFactorConfidence,
        getDaysTrackedScore,
        getCompletenessScore,
        getCVScore,
        getRSquaredScore,
        getLoggingConsistencyScore,
        getWeekendCoverageScore,

        // Constants (for testing)
        CALORIES_PER_KG,
        CALORIES_PER_LB,
        DEFAULT_ALPHA,
        VOLATILE_ALPHA,
        ROLLING_WINDOW,
        MIN_TRACKED_DAYS,
        MIN_WEEKLY_TRACKED_DAYS,
        OUTLIER_THRESHOLD,
        VOLATILE_CV_THRESHOLD,
        CONFIDENCE_TIERS,
        CONFIDENCE_WEIGHTS,
        CONFIDENCE_SCORE_TIERS
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.TDEE = TDEE;
}

// Export for Node.js testing (if running with Node)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TDEE;
}
