/**
 * Chart Data Module
 * Data preparation and transformation for TDEE/weight chart
 * No external dependencies - pure data processing
 */

const ChartData = (function () {
    'use strict';

    /**
     * Extract and transform chart data from entries
     * @param {number} days - Number of days to display
     * @param {object} settings - User settings (weightUnit, etc.)
     * @returns {object} Chart data: { weights, tdees, labels }
     */
    function getChartData(days, settings) {
        const weightUnit = settings.weightUnit || 'kg';
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const contextStartDate = new Date(startDate);
        contextStartDate.setDate(contextStartDate.getDate() - 7);

        // Get all entries needed including context
        const entries = Storage.getEntriesInRange(
            Utils.formatDate(contextStartDate),
            Utils.formatDate(endDate)
        );
        
        const processed = Calculator.processEntriesWithGaps(entries);

        // Group by week for smoother display
        const weeklyData = groupByWeek(processed, settings, startDate);

        // Extract EWMA weights and TDEEs
        const weights = [];
        const tdees = [];
        const labels = [];

        for (const week of weeklyData) {
            if (week.ewmaWeight !== null) {
                weights.push(week.ewmaWeight);
                tdees.push(week.tdee);
                labels.push(week.label);
            }
        }
        
        console.log('[ChartData.getChartData] Extracted', weights.length, 'EWMA weights for chart');

        return { weights, tdees, labels };
    }

    /**
     * Group entries by week and calculate weekly summaries
     * @param {array} entries - Processed entries with gaps
     * @param {object} settings - User settings
     * @param {Date} displayStartDate - Start date for display (excludes context weeks)
     * @returns {array} Weekly data with EWMA weights and TDEE
     */
    function groupByWeek(entries, settings, displayStartDate) {
        const weightUnit = settings.weightUnit || 'kg';
        const weeks = {};
        const sortedEntries = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));

        for (const entry of sortedEntries) {
            const weekStart = Utils.formatDate(Utils.getWeekStart(entry.date));
            if (!weeks[weekStart]) {
                weeks[weekStart] = { entries: [], label: '', weekStartDate: weekStart };
            }
            weeks[weekStart].entries.push(entry);
            weeks[weekStart].label = weekStart;
        }

        const result = [];
        const sortedWeeks = Object.keys(weeks).sort();
        const displayStartStr = Utils.formatDate(displayStartDate);

        for (let i = 0; i < sortedWeeks.length; i++) {
            const weekKey = sortedWeeks[i];

            // Skip weeks before our display start (they were just for context)
            if (weekKey < displayStartStr) continue;

            const weekData = weeks[weekKey];
            const summary = Calculator.calculateWeeklySummary(weekData.entries);

            let tdee = null;

            // Build 14-day context: need previous week's entries + current week
            // Since we sorted keys, i-1 is the previous week
            let contextEntries = [...weekData.entries];
            if (i > 0) {
                const prevWeekKey = sortedWeeks[i - 1];
                contextEntries = [...weeks[prevWeekKey].entries, ...weekData.entries];
            }

            // Calculate 14-day Stable TDEE
            if (contextEntries.length >= 7) {
                const stableResult = Calculator.calculateStableTDEE(contextEntries, weightUnit, 14);
                tdee = stableResult.tdee;

                // HYBRID FALLBACK:
                // If TDEE is missing or has low confidence (due to gaps), try Theoretical
                if ((!tdee || stableResult.confidence === 'low' || stableResult.confidence === 'none') &&
                    settings.age && settings.height && settings.gender) {

                    // Need a weight for BMR. Use EWMA weight from this week, or fallback to any we can find
                    const lastEntry = weekData.entries.filter(e => e.ewmaWeight).pop();
                    const bmrWeight = lastEntry?.ewmaWeight || settings.startingWeight;

                    if (bmrWeight) {
                        const bmrResult = Calculator.calculateBMR(bmrWeight, settings.height, settings.age, settings.gender);
                        // Handle new return format {valid, bmr, error}
                        if (bmrResult.valid) {
                            const theoretical = Calculator.calculateTheoreticalTDEE(bmrResult, settings.activityLevel);

                            if (theoretical) {
                                // If we had no TDEE, take theoretical
                                // If we had 'low' confidence TDEE, we might prefer theoretical IF the difference is huge?
                                // User complaint was "996 kcal" (likely low tracked days).
                                // Let's rely on Theoretical if confidence is LOW/NONE.
                                tdee = theoretical;
                            }
                        }
                    }
                }
            }

            const lastEntry = weekData.entries.filter(e => e.ewmaWeight).pop();

            result.push({
                label: weekData.label,
                avgWeight: summary.avgWeight,
                ewmaWeight: lastEntry?.ewmaWeight ?? null,
                tdee
            });
        }

        return result;
    }

    /**
     * Validate chart data has minimum requirements
     * @param {object} data - Chart data object
     * @returns {boolean} True if data is valid for rendering
     */
    function isValidData(data) {
        if (!data || !data.weights || !data.tdees || !data.labels) {
            return false;
        }
        return data.weights.length >= 2;
    }

    /**
     * Get current weight and trend direction from data
     * @param {object} data - Chart data object
     * @returns {object} { currentWeight, trendDirection, dataPoints }
     */
    function getChartSummary(data) {
        if (!data || !data.weights || data.weights.length === 0) {
            return { currentWeight: null, trendDirection: 'stable', dataPoints: 0 };
        }

        const currentWeight = data.weights[data.weights.length - 1];
        const trendDirection = data.weights.length > 1 
            ? (data.weights[data.weights.length - 1] > data.weights[0] ? 'increasing' : 'decreasing')
            : 'stable';

        return {
            currentWeight,
            trendDirection,
            dataPoints: data.weights.length
        };
    }

    return {
        getChartData,
        groupByWeek,
        isValidData,
        getChartSummary
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.ChartData = ChartData;
}
