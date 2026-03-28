/**
 * Dashboard UI Component
 * Displays key statistics cards
 */

const Dashboard = (function () {
    'use strict';

    /**
     * Initialize the dashboard component
     * @description Loads and displays key statistics including current TDEE, confidence level,
     * target intake, current weight, and weekly change. Called once on app startup.
     */
    function init() {
        refresh();
    }

    /**
     * Fetch and prepare entry data for dashboard
     * @returns {Object} Prepared data with entries, processed data, and current weight
     */
    function _fetchDashboardData() {
        const settings = Storage.getSettings();
        const weightUnit = settings.weightUnit || 'kg';

        const today = new Date();
        const eightWeeksAgo = new Date(today);
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        const allRecentEntries = Storage.getEntriesInRange(
            Utils.formatDate(eightWeeksAgo),
            Utils.formatDate(today)
        );

        const recentEntries = allRecentEntries.slice(-14);
        const processed = Calculator.processEntriesWithGaps(allRecentEntries);

        const latestWithWeight = [...processed].reverse().find(e => e.ewmaWeight !== null);
        const currentWeight = latestWithWeight?.ewmaWeight ?? null;

        return { settings, weightUnit, recentEntries, processed, currentWeight };
    }

    /**
     * Calculate TDEE with fallback chain
     * @param {Object} data - Prepared dashboard data
     * @returns {Object} TDEE result with tdee, confidence, isTheoretical, and calculation results
     */
    function _calculateTDEE(data) {
        const { recentEntries, weightUnit, currentWeight, settings } = data;

        // 1. Stable (14-day regression)
        const stableResult = Calculator.calculateStableTDEE(recentEntries, weightUnit, 14);

        // 2. Fast (7-day EWMA delta) for fallback
        const fastEntries = recentEntries.slice(-7);
        const fastResult = Calculator.calculateFastTDEE(fastEntries, weightUnit);

        let tdee = stableResult.tdee;
        let confidence = stableResult.confidence;
        let isTheoretical = false;

        // Fallback to Fast TDEE
        if (!tdee && fastResult.tdee) {
            tdee = fastResult.tdee;
            confidence = fastResult.confidence;
        }

        // Fallback to Theoretical
        if ((!tdee || confidence === 'none') && settings.age && settings.height && settings.gender) {
            const weightForBMR = currentWeight || settings.startingWeight;
            if (weightForBMR) {
                const bmrResult = Calculator.calculateBMR(
                    weightForBMR,
                    settings.height,
                    settings.age,
                    settings.gender
                );
                if (bmrResult.valid) {
                    const theoretical = Calculator.calculateTheoreticalTDEE(bmrResult, settings.activityLevel);
                    if (theoretical) {
                        tdee = theoretical;
                        confidence = 'theoretical';
                        isTheoretical = true;
                    }
                }
            }
        }

        return { tdee, confidence, isTheoretical, stableResult, fastResult };
    }

    /**
     * Render confidence badge with tier information
     * @param {HTMLElement} confidenceEl - Confidence badge element
     * @param {string} confidence - Confidence level
     * @param {Object} stableResult - Stable TDEE result
     * @param {Object} fastResult - Fast TDEE result
     */
    function _renderConfidenceBadge(confidenceEl, confidence, stableResult, fastResult) {
        const confidenceTier = stableResult.confidenceTier || fastResult.confidenceTier;
        const accuracy = stableResult.accuracy || fastResult.accuracy;
        
        const tierClass = confidenceTier ? confidenceTier.toLowerCase() : confidence;
        confidenceEl.className = `confidence-badge confidence-${tierClass}`;

        if (confidenceTier) {
            const tierLabel = confidenceTier.charAt(0) + confidenceTier.slice(1).toLowerCase();
            const symbol = confidenceTier === 'HIGH' ? '●' : confidenceTier === 'MEDIUM' ? '◐' : '○';
            const confidenceScore = stableResult.confidenceScore || fastResult.confidenceScore;
            
            if (confidenceScore !== undefined) {
                confidenceEl.textContent = `${symbol} ${tierLabel} (Score: ${confidenceScore}/100)`;
            } else {
                confidenceEl.textContent = `${symbol} ${tierLabel} (${accuracy})`;
            }
        } else if (confidence === 'high') {
            confidenceEl.textContent = `● High (${accuracy})`;
        } else if (confidence === 'medium') {
            confidenceEl.textContent = `◐ Medium (${accuracy})`;
        } else if (confidence === 'low') {
            confidenceEl.textContent = `○ Low (${accuracy})`;
        } else {
            confidenceEl.textContent = '○ Low';
        }
    }

    /**
     * Render TDEE display card
     * @param {Object} tdeeData - TDEE calculation result
     */
    function _renderTDEEDisplay(tdeeData) {
        const { tdee, confidence, isTheoretical, stableResult } = tdeeData;
        const tdeeEl = document.getElementById('current-tdee');
        const confidenceEl = document.getElementById('tdee-confidence');

        if (!tdee) {
            Components.setText('current-tdee', stableResult.neededDays ? `Need ${stableResult.neededDays} more days` : '—');
            tdeeEl?.classList.add('low-confidence');
            confidenceEl.className = 'confidence-badge';
            confidenceEl.textContent = 'NEEDS DATA';
            return;
        }

        if (tdee < 800 || tdee > 5000) {
            Components.setText('current-tdee', '—');
            tdeeEl?.classList.add('low-confidence');
            confidenceEl.className = 'confidence-badge';
            confidenceEl.textContent = 'INVALID VALUE';
            return;
        }

        const roundedTdee = Calculator.mround(tdee, 10);
        Components.setText('current-tdee', Components.formatValue(roundedTdee, 0));
        tdeeEl?.classList.remove('low-confidence');

        if (isTheoretical) {
            confidenceEl.className = 'confidence-badge confidence-low';
            confidenceEl.textContent = 'ESTIMATED (PROFILE)';
        } else {
            _renderConfidenceBadge(confidenceEl, confidence, stableResult, tdeeData.fastResult);
        }
    }

    /**
     * Render target intake card with deficit/surplus context
     * @param {number} tdee - Current TDEE
     * @param {Object} settings - User settings
     */
    function _renderTargetIntake(tdee, settings) {
        const targetDeficit = settings.targetDeficit || -0.2;
        const targetIntake = tdee ? Calculator.calculateDailyTarget(tdee, targetDeficit) : null;
        const targetContextEl = document.getElementById('target-intake-context');
        
        Components.setText('target-intake', targetIntake ? Components.formatValue(targetIntake, 0) : '—');
        
        if (targetContextEl) {
            if (targetIntake && tdee) {
                const deficitPercent = Math.round(targetDeficit * 100);
                const deficitCalories = Math.round(tdee - targetIntake);
                
                if (targetDeficit < 0) {
                    targetContextEl.textContent = `-${Math.abs(deficitCalories)} kcal/day (${deficitPercent}% deficit)`;
                    targetContextEl.className = 'target-context deficit';
                } else if (targetDeficit > 0) {
                    targetContextEl.textContent = `+${deficitCalories} kcal/day (${deficitPercent}% surplus)`;
                    targetContextEl.className = 'target-context surplus';
                } else {
                    targetContextEl.textContent = 'Maintenance (no deficit/surplus)';
                    targetContextEl.className = 'target-context maintenance';
                }
            } else {
                targetContextEl.textContent = !settings.targetDeficit ? 'Set goal in settings' : !tdee ? 'Calculate TDEE first' : '—';
                targetContextEl.className = 'target-context';
            }
            targetContextEl.style.display = 'block';
        }
    }

    /**
     * Render weekly change card
     * @param {Object} weeklyData - Weekly summary data
     */
    function _renderWeeklyChange(weeklyData) {
        const weeklyChange = calculateWeeklyChange(weeklyData);
        const weeklyChangeEl = document.getElementById('weekly-change');
        
        if (weeklyChange !== null) {
            const sign = weeklyChange >= 0 ? '+' : '';
            Components.setText('weekly-change', `${sign}${Components.formatValue(weeklyChange, 2)}`);
        } else {
            Components.setText('weekly-change', '—');
        }
    }

    /**
     * Render outlier warning if applicable
     * @param {Object} stableResult - Stable TDEE result
     */
    function _renderOutlierWarning(stableResult) {
        const outlierEl = document.getElementById('tdee-outlier-warning');
        if (outlierEl) {
            if (stableResult.hasOutliers && stableResult.outliers && stableResult.outliers.length > 0) {
                outlierEl.textContent = `⚠ Excluded ${stableResult.outliers.length} outlier day(s)`;
                outlierEl.style.display = 'block';
            } else {
                outlierEl.style.display = 'none';
            }
        }
    }

    /**
     * Refresh all dashboard statistics
     * @description Fetches recent entries from storage, calculates TDEE using the hierarchy
     * (Stable → Fast → Theoretical), and updates all DOM elements.
     * 
     * TDEE Hierarchy:
     * 1. Stable TDEE (14-day regression) - preferred method
     * 2. Fast TDEE (7-day EWMA delta) - fallback for insufficient data
     * 3. Theoretical TDEE (BMR × Activity) - last resort using profile data
     */
    function refresh() {
        // Fetch and prepare data
        const data = _fetchDashboardData();

        // Calculate TDEE with fallback chain
        const tdeeData = _calculateTDEE(data);

        // Render all UI sections
        _renderTDEEDisplay(tdeeData);
        _renderTargetIntake(tdeeData.tdee, data.settings);
        Components.setText('current-weight', data.currentWeight ? Components.formatValue(data.currentWeight, 1) : '—');

        // Calculate and render weekly summaries
        const weeklyData = calculateWeeklySummaries(data.processed, data.weightUnit);
        _renderWeeklyChange(weeklyData);
        _renderOutlierWarning(tdeeData.stableResult);

        // Render trends
        renderTrends(data.processed, data.weightUnit);
    }

    /**
     * Render TDEE trend statistics for multiple time periods
     * @description Displays 7-day and 14-day TDEE trends to show short-term and medium-term
     * patterns. Uses Calculator.calculatePeriodTDEE() for each period. Trends help users
     * understand if their TDEE is increasing, decreasing, or stable over time.
     * 
     * @param {Array} allEntries - Processed weight entries with EWMA weights and gaps filled
     * @param {string} weightUnit - User's weight unit preference ('kg' or 'lb')
     * 
     * @description Creates trend items showing:
     * - 7-Day Trend: Reactive, shows recent changes quickly
     * - 14-Day Trend: Stable, smoother estimate less affected by daily fluctuations
     * 
     * @example
     * // Called internally by refresh()
     * renderTrends(processedEntries, 'kg');
     */
    function renderTrends(allEntries, weightUnit) {
        // Simplified trends: Only show 7-day and 14-day periods
        // Removed 3-day (too volatile) and 21-day (redundant with 14-day)

        const trendsContainer = document.getElementById('tdee-trends-container');
        if (!trendsContainer) return;

        const periods = [7, 14]; // Simplified from [3, 7, 14, 21]
        const today = new Date();

        // Clear container
        trendsContainer.innerHTML = '';

        periods.forEach(days => {
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - days + 1); // +1 to include today
            const startStr = Utils.formatDate(startDate);

            // Get entries from startDate to today
            const periodEntries = allEntries.filter(e => e.date >= startStr);

            // We need at least 2 data points with weight to calculate slope
            let tdee = null;
            if (periodEntries.length >= 2) {
                tdee = Calculator.calculatePeriodTDEE(periodEntries, weightUnit);
            }

            // Create trend item element
            const trendItem = document.createElement('div');
            trendItem.className = 'trend-item';

            // Create label with tooltip
            const trendLabel = document.createElement('span');
            trendLabel.className = 'trend-label';
            
            trendLabel.textContent = `${days}-Day Trend`;

            // Create value element
            const trendValue = document.createElement('span');
            trendValue.className = 'trend-value';
            trendValue.textContent = tdee ? Components.formatValue(tdee, 0) : '—';

            trendItem.appendChild(trendLabel);
            trendItem.appendChild(trendValue);
            trendsContainer.appendChild(trendItem);
        });
    }

    /**
     * Calculate weekly summary statistics for all entries
     * @description Groups entries by week and calculates comprehensive summaries including
     * average weight, average calories, tracked days, and TDEE for each week. Applies
     * exponential smoothing to TDEE values across weeks for stability.
     * 
     * @param {Array} entries - Processed weight entries (gaps filled with null values)
     * @param {string} weightUnit - User's weight unit preference ('kg' or 'lb')
     * @returns {Array} Array of weekly summary objects, each containing:
     *   - avgWeight: Average weight for the week (or null)
     *   - avgCalories: Average calories for the week (or null)
     *   - trackedDays: Number of days with data
     *   - tdee: Linear regression TDEE for the week (or null)
     *   - smoothedTdee: Exponentially smoothed TDEE (or null)
     * 
     * @description TDEE Calculation:
     * - Uses Calculator.calculateWeeklySummary() for basic stats
     * - Uses Calculator.calculatePeriodTDEE() for linear regression TDEE
     * - Applies Calculator.calculateSmoothedTDEE() to smooth across weeks
     * 
     * @example
     * // Get weekly summaries for dashboard display
     * const weeklyData = calculateWeeklySummaries(processedEntries, 'kg');
     * // Returns: [{avgWeight: 82.5, avgCalories: 2200, trackedDays: 5, tdee: 2450, smoothedTdee: 2430}, ...]
     */
    function calculateWeeklySummaries(entries, weightUnit) {
        // Group entries by week
        const weeks = {};

        for (const entry of entries) {
            const weekStart = Utils.formatDate(Utils.getWeekStart(entry.date));
            if (!weeks[weekStart]) {
                weeks[weekStart] = [];
            }
            weeks[weekStart].push(entry);
        }

        // Calculate summary for each week
        const summaries = [];
        const sortedWeeks = Object.keys(weeks).sort();

        for (let i = 0; i < sortedWeeks.length; i++) {
            const weekStart = sortedWeeks[i];
            const weekEntries = weeks[weekStart];
            const summary = Calculator.calculateWeeklySummary(weekEntries);

            // Calculate TDEE using Linear Regression for this week
            // Need >1 entry for regression
            if (summary.trackedDays >= 2 && summary.avgCalories !== null) {
                summary.tdee = Calculator.calculatePeriodTDEE(weekEntries, weightUnit);

                // We can still do smoothing if we want, but LR is already quite stable if window is large.
                // For weekly, let's just use the raw LR TDEE or smooth it?
                // The requirements asked for "Smoothed TDEE" but LR over 7 days is a form of smoothing.
                // Let's keep the existing smoothing logic on top of LR values if we have previous.

                if (i > 0 && summaries[i - 1] && summaries[i - 1].smoothedTdee) {
                    summary.smoothedTdee = Calculator.calculateSmoothedTDEE(
                        summary.tdee,
                        summaries[i - 1].smoothedTdee
                    );
                } else {
                    summary.smoothedTdee = summary.tdee;
                }
            } else {
                summary.tdee = null;
                summary.smoothedTdee = null;
            }

            summaries.push(summary);
        }

        return summaries;
    }

    /**
     * Extract current TDEE from weekly data
     * @description Finds the most recent week with a valid smoothed TDEE value and returns
     * it rounded to the nearest 10 calories. Used as a fallback for displaying current TDEE.
     * 
     * @param {Array} weeklyData - Array of weekly summary objects with smoothedTdee property
     * @returns {number|null} Current TDEE rounded to nearest 10, or null if no valid data
     * 
     * @description Search Strategy:
     * - Iterates backwards from most recent week
     * - Returns first week with non-null smoothedTdee
     * - Rounds result using Calculator.mround(value, 10)
     * 
     * @example
     * // Get current TDEE from weekly summaries
     * const currentTdee = calculateCurrentTDEE(weeklyData);
     * // Returns: 2450 (rounded to nearest 10)
     */
    function calculateCurrentTDEE(weeklyData) {
        // Get the last smoothed TDEE
        for (let i = weeklyData.length - 1; i >= 0; i--) {
            if (weeklyData[i].smoothedTdee !== null && weeklyData[i].smoothedTdee !== undefined) {
                return Calculator.mround(weeklyData[i].smoothedTdee, 10);
            }
        }
        return null;
    }

    /**
     * Calculate average weekly weight change
     * @description Computes the average week-over-week weight change across the last 5 weeks
     * (approximately 4 changes). This metric shows the user their rate of weight loss or gain.
     * 
     * @param {Array} weeklyData - Array of weekly summary objects with avgWeight property
     * @returns {number|null} Average weekly weight change in kg (or lb), rounded to 2 decimals,
     *   or null if insufficient data for calculation
     * 
     * @description Calculation Method:
     * - Takes last 5 weeks of data
     * - Calculates week-to-week differences (week[i] - week[i-1])
     * - Averages all valid changes (skips weeks with null avgWeight)
     * - Negative value = weight loss, Positive value = weight gain
     * 
     * @example
     * // Calculate weekly change for dashboard display
     * const weeklyChange = calculateWeeklyChange(weeklyData);
     * // Returns: -0.35 (losing 0.35 kg per week on average)
     */
    function calculateWeeklyChange(weeklyData) {
        // Calculate average weekly weight change over last 4 weeks
        const recentWeeks = weeklyData.slice(-5);
        const changes = [];

        for (let i = 1; i < recentWeeks.length; i++) {
            if (recentWeeks[i].avgWeight !== null && recentWeeks[i - 1].avgWeight !== null) {
                changes.push(recentWeeks[i].avgWeight - recentWeeks[i - 1].avgWeight);
            }
        }

        if (changes.length === 0) return null;

        const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
        return Calculator.round(avgChange, 2);
    }

    return {
        init,
        refresh
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.Dashboard = Dashboard;
}
