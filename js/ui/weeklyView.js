/**
 * Weekly View UI Component
 * Displays week table and summary statistics
 */

const WeeklyView = (function () {
    'use strict';

    let currentWeekStart = Utils.getWeekStart(new Date());

    function init() {
        setupEventListeners();
        render();
    }

    function setupEventListeners() {
        document.getElementById('prev-week-btn').addEventListener('click', () => {
            navigateWeek(-1);
        });

        document.getElementById('next-week-btn').addEventListener('click', () => {
            navigateWeek(1);
        });

        // Click on row to edit that day
        document.getElementById('week-table-body').addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (row && row.dataset.date) {
                DailyEntry.setDate(row.dataset.date);
                DailyEntry.refresh();
                // Scroll to entry form on mobile
                document.getElementById('daily-entry').scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    function navigateWeek(direction) {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + (direction * 7));
        currentWeekStart = newDate;
        render();
    }

    function render() {
        const settings = Storage.getSettings();
        const weightUnit = settings.weightUnit || 'kg';

        // Calculate week range
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startStr = Utils.formatDate(currentWeekStart);
        const endStr = Utils.formatDate(weekEnd);

        // Update week label
        const label = `${currentWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        Components.setText('week-label', label);

        // Get entries for week
        const entries = Storage.getEntriesInRange(startStr, endStr);
        const processed = Calculator.processEntriesWithGaps(entries);

        // Render table
        const tbody = document.getElementById('week-table-body');
        const today = Utils.formatDate(new Date());

        tbody.innerHTML = processed.map(entry => {
            const isToday = entry.date === today;
            const isGap = entry.weight === null && entry.calories === null;
            const dayName = Utils.getDayName(entry.date);
            const dateNum = Utils.parseDate(entry.date).getDate();

            return `
                <tr data-date="${entry.date}" class="${isToday ? 'today' : ''} ${isGap ? 'gap' : ''}">
                    <td class="day-cell">${dayName} ${dateNum}</td>
                    <td class="value-cell ${entry.weight === null ? 'empty-cell' : ''}">
                        ${entry.weight !== null ? Components.formatValue(entry.weight, 1) : '—'}
                    </td>
                    <td class="value-cell ${entry.calories === null ? 'empty-cell' : ''}">
                        ${entry.calories !== null ? Components.formatValue(entry.calories, 0) : '—'}
                    </td>
                </tr>
            `;
        }).join('');

        // Calculate and render summary
        renderSummary(processed, weightUnit);
    }

    function renderSummary(entries, weightUnit) {
        const summary = Calculator.calculateWeeklySummary(entries);

        // Get previous week for delta calculation
        const prevWeekStart = new Date(currentWeekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevWeekEnd = new Date(currentWeekStart);
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);

        const prevEntries = Storage.getEntriesInRange(
            Utils.formatDate(prevWeekStart),
            Utils.formatDate(prevWeekEnd)
        );
        const prevProcessed = Calculator.processEntriesWithGaps(prevEntries);
        const prevSummary = Calculator.calculateWeeklySummary(prevProcessed);

        // Calculate TDEE if we have both weeks
        let weekTdee = null;
        if (summary.avgWeight !== null && summary.avgCalories !== null &&
            prevSummary.avgWeight !== null) {
            weekTdee = Calculator.calculateTDEE({
                avgCalories: summary.avgCalories,
                weightDelta: summary.avgWeight - prevSummary.avgWeight,
                trackedDays: summary.trackedDays,
                unit: weightUnit
            });
        }

        Components.setText('week-avg-weight',
            summary.avgWeight !== null ? `${Components.formatValue(summary.avgWeight, 1)} ${weightUnit}` : '—');
        Components.setText('week-avg-calories',
            summary.avgCalories !== null ? Components.formatValue(summary.avgCalories, 0) : '—');
        Components.setText('week-tdee',
            weekTdee !== null ? Components.formatValue(weekTdee, 0) : '—');
        Components.setText('week-confidence',
            `${Math.round(summary.confidence * 100)}%`);
    }

    function refresh() {
        render();
    }

    function getCurrentWeekStart() {
        return currentWeekStart;
    }

    return {
        init,
        refresh,
        getCurrentWeekStart
    };
})();
