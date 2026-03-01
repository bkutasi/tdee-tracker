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
    const CV_THRESHOLD = 0.02;     // Coefficient of variation threshold (2%)

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
     * Calculate basic statistics (single pass for mean/min/max)
     * @param {number[]} data - Array of numbers
     * @returns {Object} { mean, stdDev, min, max }
     */
    function calculateStats(data) {
        if (data.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };

        // Single pass for sum, min, max
        let sum = 0, min = Infinity, max = -Infinity;
        for (const value of data) {
            sum += value;
            if (value < min) min = value;
            if (value > max) max = value;
        }
        const mean = sum / data.length;

        // Second pass for variance (necessary)
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

        // Utilities (exported for use by other modules)
        calculateStats,
        round,

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
