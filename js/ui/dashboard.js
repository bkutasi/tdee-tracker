/**
 * Dashboard UI Component
 * Displays key statistics cards
 */

const Dashboard = (function () {
    'use strict';

    function init() {
        refresh();
    }

    function refresh() {
        const settings = Storage.getSettings();
        const weightUnit = settings.weightUnit || 'kg';
        const entries = Storage.getAllEntries();

        // Update unit labels
        Components.setText('weight-unit-label', weightUnit);
        Components.setText('change-unit-label', `${weightUnit}/wk`);

        // Get last 14 days for stable TDEE (more resistant to water/glycogen fluctuations)
        const today = new Date();
        const fourteenDaysAgo = new Date(today);
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13); // 14 days including today

        const recentEntries = Storage.getEntriesInRange(
            Utils.formatDate(fourteenDaysAgo),
            Utils.formatDate(today)
        );

        // Get last 8 weeks for weekly summaries and trends
        const eightWeeksAgo = new Date(today);
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
        const allRecentEntries = Storage.getEntriesInRange(
            Utils.formatDate(eightWeeksAgo),
            Utils.formatDate(today)
        );

        // Process entries for weight tracking
        const processed = Calculator.processEntriesWithGaps(allRecentEntries);

        // Get latest weight (EWMA smoothed)
        const latestWithWeight = [...processed].reverse().find(e => e.ewmaWeight !== null);
        const currentWeight = latestWithWeight?.ewmaWeight ?? null;

        // Calculate Stable TDEE (14-day, linear regression on EWMA weights)
        const stableResult = Calculator.calculateStableTDEE(recentEntries, weightUnit, 14);
        const currentTdee = stableResult.tdee ? Calculator.mround(stableResult.tdee, 10) : null;

        // Target intake
        const targetDeficit = settings.targetDeficit || -0.2;
        const targetIntake = currentTdee ? Calculator.calculateDailyTarget(currentTdee, targetDeficit) : null;

        // Weekly change rate from longer data
        const weeklyData = calculateWeeklySummaries(processed, weightUnit);
        const weeklyChange = calculateWeeklyChange(weeklyData);

        // Update display
        const tdeeElement = document.getElementById('current-tdee');
        if (currentTdee) {
            Components.setText('current-tdee', Components.formatValue(currentTdee, 0));
            // Remove any warning classes
            tdeeElement?.classList.remove('low-confidence');
        } else {
            // Show message based on why TDEE is unavailable
            if (stableResult.neededDays) {
                Components.setText('current-tdee', `Need ${stableResult.neededDays} more days`);
            } else {
                Components.setText('current-tdee', '—');
            }
            tdeeElement?.classList.add('low-confidence');
        }

        // Show confidence indicator
        const confidenceEl = document.getElementById('tdee-confidence');
        if (confidenceEl) {
            confidenceEl.className = `confidence-badge confidence-${stableResult.confidence}`;
            if (stableResult.confidence === 'high') {
                confidenceEl.textContent = '● High';
            } else if (stableResult.confidence === 'medium') {
                confidenceEl.textContent = '◐ Medium';
            } else {
                confidenceEl.textContent = '○ Low';
            }
        }

        // Show outlier warning if cheat days detected
        const outlierEl = document.getElementById('tdee-outlier-warning');
        if (outlierEl) {
            if (stableResult.hasOutliers && stableResult.outliers) {
                outlierEl.textContent = `⚠ Excluded ${stableResult.outliers.length} outlier day(s)`;
                outlierEl.style.display = 'block';
            } else {
                outlierEl.style.display = 'none';
            }
        }

        Components.setText('target-intake', targetIntake ? Components.formatValue(targetIntake, 0) : '—');
        Components.setText('current-weight', currentWeight ? Components.formatValue(currentWeight, 1) : '—');

        // Format weekly change with sign
        if (weeklyChange !== null) {
            const sign = weeklyChange >= 0 ? '+' : '';
            Components.setText('weekly-change', `${sign}${Components.formatValue(weeklyChange, 2)}`);
        } else {
            Components.setText('weekly-change', '—');
        }

        renderTrends(processed, weightUnit);
    }

    function renderTrends(allEntries, weightUnit) {
        // We need the last N days of data, but we must account for gaps to ensure N *tracked* days 
        // OR simply N calendar days?
        // "3-7-14-21 day smoothed tdee" usually implies rolling window of calendar days.
        // However, calculatePeriodTDEE needs data points.
        // Let's filter entries within the last N days.

        const trendsContainer = document.getElementById('tdee-trends-container');
        if (!trendsContainer) return;

        const periods = [3, 7, 14, 21];
        const today = new Date();
        // Reset time to ensure full day coverage if needed, but dates are strings YYYY-MM-DD
        // We'll filter by date string comparison.

        let html = '';

        periods.forEach(days => {
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - days + 1); // +1 to include today
            const startStr = Utils.formatDate(startDate);

            // Get entries from startDate to today
            // processEntriesWithGaps already sorted them if passed correctly, 
            // but let's filter the processed list which has 'date'
            const periodEntries = allEntries.filter(e => e.date >= startStr);

            // We need at least 2 data points with weight to calculate slope
            let tdee = null;
            if (periodEntries.length >= 2) {
                tdee = Calculator.calculatePeriodTDEE(periodEntries, weightUnit);
            }

            html += `
                <div class="trend-item">
                    <span class="trend-label">${days} Days</span>
                    <span class="trend-value">
                        ${tdee ? Components.formatValue(tdee, 0) : '—'}
                    </span>
                </div>
            `;
        });

        trendsContainer.innerHTML = html;
    }

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

    function calculateCurrentTDEE(weeklyData) {
        // Get the last smoothed TDEE
        for (let i = weeklyData.length - 1; i >= 0; i--) {
            if (weeklyData[i].smoothedTdee !== null && weeklyData[i].smoothedTdee !== undefined) {
                return Calculator.mround(weeklyData[i].smoothedTdee, 10);
            }
        }
        return null;
    }

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
