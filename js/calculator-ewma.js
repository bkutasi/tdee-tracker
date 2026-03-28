/**
 * EWMA (Exponentially Weighted Moving Average) Module
 * Weight smoothing algorithms with adaptive volatility handling
 * 
 * Features:
 * - EWMA smoothing with configurable alpha
 * - Adaptive alpha based on weight volatility (CV)
 * - EWMA weight delta calculation
 */

const EWMA = (function () {
    'use strict';

    // EWMA-specific constants
    const DEFAULT_ALPHA = 0.3;     // Standard smoothing factor
    const VOLATILE_ALPHA = 0.1;    // Reduced alpha for volatile periods
    const CV_THRESHOLD = 2;        // Coefficient of variation threshold (2%)

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
     * Calculate coefficient of variation (CV) as percentage
     * @param {number[]} weights - Array of weights
     * @returns {number|null} CV as percentage, or null if cannot calculate
     */
    function calculateCV(weights) {
        if (!weights || weights.length === 0) return null;
        const stats = calculateStats(weights);
        if (stats.mean === 0) return null;
        return round((stats.stdDev / stats.mean) * 100, 2);
    }

    /**
     * Determine if weight data is volatile based on CV threshold
     * @param {number} cv - Coefficient of Variation percentage
     * @returns {boolean} True if volatile (CV > threshold)
     */
    function isVolatile(cv) {
        return cv !== null && cv > CV_THRESHOLD;
    }

    /**
     * Calculate adaptive alpha based on recent volatility
     * @param {number[]} recentWeights - Last 7 days of weights
     * @returns {number} Alpha value (DEFAULT_ALPHA or VOLATILE_ALPHA)
     */
    function getAdaptiveAlpha(recentWeights) {
        if (!recentWeights || recentWeights.length < 3) return DEFAULT_ALPHA;
        
        const cv = calculateCV(recentWeights);
        
        // If CV is null or not volatile, use default alpha
        if (!isVolatile(cv)) {
            return DEFAULT_ALPHA;
        }
        // Volatile periods: use lower alpha for more smoothing
        return VOLATILE_ALPHA;
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

    // Public API
    return {
        // Core calculations
        calculateEWMA,
        getAdaptiveAlpha,
        calculateEWMAWeightDelta,
        
        // CV calculation helpers (for use by TDEE module)
        calculateCV,
        isVolatile,

        // Re-export utilities from Utils for convenience (Node.js compatible)
        calculateStats: (typeof Utils !== 'undefined' && Utils?.calculateStats) || calculateStats,
        round: (typeof Utils !== 'undefined' && Utils?.round) || round,

        // Constants (for testing)
        DEFAULT_ALPHA,
        VOLATILE_ALPHA,
        CV_THRESHOLD
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.EWMA = EWMA;
}

// Export for Node.js testing (if running with Node)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EWMA;
}
