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

    // Use Utils module for rounding (Utils loads first in script order)

    /**
     * Calculate Exponentially Weighted Moving Average
     * @param {number} current - Current value
     * @param {number|null} previous - Previous EWMA value (null for first entry)
     * @param {number} alpha - Smoothing factor (0-1, higher = more weight to current)
     * @returns {number} Smoothed value
     */
    function calculateEWMA(current, previous, alpha = DEFAULT_ALPHA) {
        if (previous === null || previous === undefined) {
            return Utils.round(current, 2);
        }
        const result = (current * alpha) + (previous * (1 - alpha));
        return Utils.round(result, 2);
    }

    /**
     * Calculate coefficient of variation (CV) as percentage
     * @param {number[]} weights - Array of weights
     * @returns {number|null} CV as percentage, or null if cannot calculate
     */
    function calculateCV(weights) {
        if (!weights || weights.length === 0) return null;
        const stats = Utils.calculateStats(weights);
        if (stats.mean === 0) return null;
        return Utils.round((stats.stdDev / stats.mean) * 100, 2);
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

    // Public API
    return {
        // Core calculations
        calculateEWMA,
        getAdaptiveAlpha,

        // CV calculation helpers (for use by TDEE module)
        calculateCV,
        isVolatile,

        // Re-export utilities from Utils for convenience (Node.js compatible)
        calculateStats: Utils.calculateStats,
        round: Utils.round,
        calculateEWMAWeightDelta: Utils.calculateEWMAWeightDelta,

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
