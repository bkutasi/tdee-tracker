/**
 * Dashboard UI Component
 * Displays key statistics cards
 */

const Dashboard = (function () {
    'use strict';

    /**
     * Initialize the dashboard component
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
     *
     * TDEE Hierarchy:
     * 1. Stable TDEE (14-day regression)
     * 2. Fast TDEE (7-day EWMA delta)
     * 3. Theoretical TDEE (BMR × Activity)
     */
    function refresh() {
        try {
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

            const trendValues = _calculateTrendValues(data.processed, data.weightUnit);
            renderTrends(trendValues);
        } catch (error) {
            console.error('Dashboard.refresh:', error);
            Components.showError('Failed to load dashboard stats. Please refresh.', 'Dashboard');
        }
    }

    /**
     * Calculate TDEE trend values for 7-day and 14-day periods
     * @param {Array} allEntries - Processed weight entries with EWMA weights
     * @param {string} weightUnit - User's weight unit preference ('kg' or 'lb')
     * @returns {Object} Trend values keyed by period days (e.g., { '7': number|null, '14': number|null })
     */
    function _calculateTrendValues(allEntries, weightUnit) {
        const today = new Date();
        const periods = [7, 14];
        const trends = {};

        periods.forEach(days => {
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - days + 1);
            const startStr = Utils.formatDate(startDate);
            const periodEntries = allEntries.filter(e => e.date >= startStr);

            let tdee = null;
            if (periodEntries.length >= 2) {
                tdee = Calculator.calculatePeriodTDEE(periodEntries, weightUnit);
            }
            trends[days] = tdee;
        });

        return trends;
    }

    /**
     * Render TDEE trend statistics for 7-day and 14-day periods
     * @param {Object} trendValues - Pre-computed trend values (e.g., { '7': number, '14': number })
     */
    function renderTrends(trendValues) {
        try {
            const trendsContainer = document.getElementById('tdee-trends-container');
            if (!trendsContainer) {
                console.warn('Dashboard.renderTrends: trends container not found');
                return;
            }

            const periods = [7, 14];

            // Clear container
            trendsContainer.innerHTML = '';

            periods.forEach(days => {
                const tdee = trendValues[days];

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
        } catch (error) {
            console.error('Dashboard.renderTrends:', error);
            Components.showError('Failed to load trends', 'Dashboard');
        }
    }

    /**
     * Calculate weekly summary statistics for all entries
     * @param {Array} entries - Processed weight entries (gaps filled with null values)
     * @param {string} weightUnit - User's weight unit preference ('kg' or 'lb')
     * @returns {Array} Weekly summary objects with avgWeight, avgCalories, trackedDays, tdee, smoothedTdee
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
     * @param {Array} weeklyData - Weekly summary objects with smoothedTdee property
     * @returns {number|null} Current TDEE rounded to nearest 10, or null
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
     * @param {Array} weeklyData - Weekly summary objects with avgWeight property
     * @returns {number|null} Average weekly weight change, rounded to 2 decimals
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
