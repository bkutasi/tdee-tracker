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

        // Single fetch for all data needed (56 days = 8 weeks)
        const today = new Date();
        const eightWeeksAgo = new Date(today);
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        const allRecentEntries = Storage.getEntriesInRange(
            Utils.formatDate(eightWeeksAgo),
            Utils.formatDate(today)
        );

        // Slice for 14-day stable TDEE (no extra fetch!)
        const recentEntries = allRecentEntries.slice(-14);

        const processed = Calculator.processEntriesWithGaps(allRecentEntries);

        // Latest weight
        const latestWithWeight = [...processed].reverse().find(e => e.ewmaWeight !== null);
        const currentWeight = latestWithWeight?.ewmaWeight ?? null;

        // Calculate TDEE Hierarchy
        // 1. Stable (14-day regression)
        const stableResult = Calculator.calculateStableTDEE(recentEntries, weightUnit, 14);

        // 2. Fast (7-day EWMA delta) for fallback
        // We need last 7 days of entries
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
                // Handle new return format {valid, bmr, error}
                if (bmrResult.valid) {
                    const theoretical = Calculator.calculateTheoreticalTDEE(bmrResult, settings.activityLevel);
                    if (theoretical) {
                        tdee = theoretical;
                        confidence = 'theoretical'; // Custom confidence level for display
                        isTheoretical = true;
                    }
                }
            }
        }

        // Update DOM
        const tdeeEl = document.getElementById('current-tdee');
        const confidenceEl = document.getElementById('tdee-confidence');

        if (tdee) {
            tdee = Calculator.mround(tdee, 10);
            Components.setText('current-tdee', Components.formatValue(tdee, 0));
            tdeeEl?.classList.remove('low-confidence');

            if (isTheoretical) {
                confidenceEl.className = 'confidence-badge confidence-low';
                confidenceEl.textContent = 'ESTIMATED (PROFILE)';
            } else {
                confidenceEl.className = `confidence-badge confidence-${confidence}`;
                // Display accuracy range based on scientific tiers
                const accuracy = stableResult.accuracy || fastResult.accuracy;
                if (confidence === 'high') {
                    confidenceEl.textContent = `● High (${accuracy})`;
                } else if (confidence === 'medium') {
                    confidenceEl.textContent = `◐ Medium (${accuracy})`;
                } else if (confidence === 'low') {
                    confidenceEl.textContent = `○ Low (${accuracy})`;
                } else {
                    confidenceEl.textContent = '○ Low';
                }
            }
        } else {
            if (stableResult.neededDays) {
                Components.setText('current-tdee', `Need ${stableResult.neededDays} more days`);
            } else {
                Components.setText('current-tdee', '—');
            }
            tdeeEl?.classList.add('low-confidence');
            confidenceEl.className = 'confidence-badge';
            confidenceEl.textContent = 'NEEDS DATA';
        }

        // Target Intake
        const targetDeficit = settings.targetDeficit || -0.2;
        const targetIntake = tdee ? Calculator.calculateDailyTarget(tdee, targetDeficit) : null;
        Components.setText('target-intake', targetIntake ? Components.formatValue(targetIntake, 0) : '—');

        // Current Weight
        Components.setText('current-weight', currentWeight ? Components.formatValue(currentWeight, 1) : '—');

        // Weekly Change
        const weeklyData = calculateWeeklySummaries(processed, weightUnit);
        const weeklyChange = calculateWeeklyChange(weeklyData);

        if (weeklyChange !== null) {
            const sign = weeklyChange >= 0 ? '+' : '';
            Components.setText('weekly-change', `${sign}${Components.formatValue(weeklyChange, 2)}`);
        } else {
            Components.setText('weekly-change', '—');
        }

        // Outlier Warning
        const outlierEl = document.getElementById('tdee-outlier-warning');
        if (outlierEl) {
            if (stableResult.hasOutliers && stableResult.outliers) {
                outlierEl.textContent = `⚠ Excluded ${stableResult.outliers.length} outlier day(s)`;
                outlierEl.style.display = 'block';
            } else {
                outlierEl.style.display = 'none';
            }
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

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.Dashboard = Dashboard;
}
