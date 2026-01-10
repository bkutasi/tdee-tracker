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

        // Get last 8 weeks of data for TDEE calculation
        const today = new Date();
        const eightWeeksAgo = new Date(today);
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        const recentEntries = Storage.getEntriesInRange(
            Utils.formatDate(eightWeeksAgo),
            Utils.formatDate(today)
        );

        // Process entries
        const processed = Calculator.processEntriesWithGaps(recentEntries);

        // Get latest weight (EWMA smoothed)
        const latestWithWeight = [...processed].reverse().find(e => e.ewmaWeight !== null);
        const currentWeight = latestWithWeight?.ewmaWeight ?? null;

        // Calculate weekly summaries for rolling TDEE
        const weeklyData = calculateWeeklySummaries(processed, weightUnit);

        // Current TDEE (smoothed)
        const currentTdee = calculateCurrentTDEE(weeklyData);

        // Target intake
        const targetDeficit = settings.targetDeficit || -0.2;
        const targetIntake = currentTdee ? Calculator.calculateDailyTarget(currentTdee, targetDeficit) : null;

        // Weekly change rate
        const weeklyChange = calculateWeeklyChange(weeklyData);

        // Update display
        Components.setText('current-tdee', currentTdee ? Components.formatValue(currentTdee, 0) : '—');
        Components.setText('target-intake', targetIntake ? Components.formatValue(targetIntake, 0) : '—');
        Components.setText('current-weight', currentWeight ? Components.formatValue(currentWeight, 1) : '—');

        // Format weekly change with sign
        if (weeklyChange !== null) {
            const sign = weeklyChange >= 0 ? '+' : '';
            Components.setText('weekly-change', `${sign}${Components.formatValue(weeklyChange, 2)}`);
        } else {
            Components.setText('weekly-change', '—');
        }
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

            // Calculate TDEE if we have previous week
            if (i > 0 && summary.avgWeight !== null && summary.avgCalories !== null) {
                const prevSummary = summaries[i - 1];
                if (prevSummary && prevSummary.avgWeight !== null) {
                    summary.tdee = Calculator.calculateTDEE({
                        avgCalories: summary.avgCalories,
                        weightDelta: summary.avgWeight - prevSummary.avgWeight,
                        trackedDays: summary.trackedDays,
                        unit: weightUnit
                    });

                    // Smooth TDEE
                    summary.smoothedTdee = Calculator.calculateSmoothedTDEE(
                        summary.tdee,
                        prevSummary.smoothedTdee
                    );
                }
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
