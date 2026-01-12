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

        // Fetch previous week's data to form a 14-day window for stable TDEE
        // 'entries' contains the current week (7 days)
        // We need the 7 days BEFORE the first entry of this week
        let stableResult;

        if (entries.length > 0) {
            const firstDate = new Date(entries[0].date);
            const prevWeekStart = new Date(firstDate);
            prevWeekStart.setDate(prevWeekStart.getDate() - 7);
            const prevWeekEnd = new Date(firstDate);
            prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);

            const prevEntries = Storage.getEntriesInRange(
                Utils.formatDate(prevWeekStart),
                Utils.formatDate(prevWeekEnd)
            );

            // Combine previous week + current week = 14 days
            const twoWeekContext = [...prevEntries, ...entries];

            // Calculate Stable TDEE (14-day window)
            stableResult = Calculator.calculateStableTDEE(twoWeekContext, weightUnit, 14);
        } else {
            stableResult = { tdee: null, confidence: 'none' };
        }

        Components.setText('week-avg-weight',
            summary.avgWeight !== null ? `${Components.formatValue(summary.avgWeight, 1)} ${weightUnit}` : '—');
        Components.setText('week-avg-calories',
            summary.avgCalories !== null ? Components.formatValue(summary.avgCalories, 0) : '—');

        // Show TDEE with appropriate messaging
        const tdeeEl = document.getElementById('week-tdee');
        if (stableResult.tdee !== null) {
            Components.setText('week-tdee', Components.formatValue(stableResult.tdee, 0));
            tdeeEl?.classList.remove('confidence-low');
        } else if (stableResult.neededDays) {
            Components.setText('week-tdee', `Need ${stableResult.neededDays} more`);
            tdeeEl?.classList.add('confidence-low');
        } else {
            Components.setText('week-tdee', '—');
            tdeeEl?.classList.remove('confidence-low');
        }

        // Show confidence with color coding
        const confEl = document.getElementById('week-confidence');
        if (confEl) {
            confEl.className = `summary-value confidence-${stableResult.confidence}`;

            let confText = '—';
            if (stableResult.confidence === 'high') confText = 'High';
            else if (stableResult.confidence === 'medium') confText = 'Med';
            else if (stableResult.confidence === 'low') confText = 'Low';

            if (stableResult.hasLargeGap) {
                confText += ' (Gap)';
                confEl.style.fontSize = '0.7em'; // Make fit
            }

            Components.setText('week-confidence', confText);
        }
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
