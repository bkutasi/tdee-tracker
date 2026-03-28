/**
 * Weekly View UI Component
 * Displays week table and summary statistics
 */

const WeeklyView = (function () {
    'use strict';

    let currentWeekStart = Utils.getWeekStart(new Date());

    /**
     * Initialize the weekly view component
     * @description Sets up event listeners for week navigation (prev/next buttons) and row
     * click handlers for editing entries. Renders the current week's view on startup.
     * 
     * @description Event Listeners:
     * - prev-week-btn: Navigate to previous week (-7 days)
     * - next-week-btn: Navigate to next week (+7 days)
     * - week-table-body row click: Opens daily entry form for that date
     * 
     * @example
     * // Called once on app startup
     * WeeklyView.init();
     */
    function init() {
        setupEventListeners();
        render();
    }

    /**
     * Set up event listeners for weekly view interactions
     * @description Binds click handlers for week navigation buttons and table row selection.
     * Navigation buttons shift the current week by ±7 days. Row clicks open the daily entry
     * form pre-filled with the selected date.
     * 
     * @description Events:
     * - prev-week-btn click → navigateWeek(-1)
     * - next-week-btn click → navigateWeek(1)
     * - week-table-body row click → DailyEntry.setDate() + scroll to form
     * 
     * @example
     * // Called internally by init()
     * setupEventListeners();
     */
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

    /**
     * Navigate to a different week
     * @description Shifts the current week start date by the specified number of weeks
     * (direction × 7 days) and re-renders the weekly view.
     * 
     * @param {number} direction - Navigation direction: -1 for previous week, +1 for next week
     * 
     * @example
     * // Go to previous week
     * navigateWeek(-1);
     * 
     * // Go to next week
     * navigateWeek(1);
     */
    function navigateWeek(direction) {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + (direction * 7));
        currentWeekStart = newDate;
        render();
    }

    /**
     * Render the weekly view table and summary
     * @description Displays a 7-day week view with weight and calorie entries for each day.
     * Highlights today's row and marks gaps (days without entries). Calculates and displays
     * weekly summary statistics including average weight, average calories, TDEE, and confidence.
     * 
     * @description Table Columns:
     * - Day name + date (e.g., "Mon 17")
     * - Weight (formatted with user's unit, shows "—" for gaps)
     * - Calories (shows "—" for gaps)
     * 
     * @description Row Classes:
     * - 'today': Highlights current day
     * - 'gap': Styles days without entries
     * 
     * @example
     * // Called internally by init() and navigateWeek()
     * render();
     */
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

    /**
     * Render weekly summary statistics
     * @description Calculates and displays summary statistics for the current week including
     * average weight, average calories, TDEE, and confidence level. Uses a 14-day context
     * (previous week + current week) for stable TDEE calculation.
     * 
     * @param {Array} entries - Processed weight entries for the current week
     * @param {string} weightUnit - User's weight unit preference ('kg' or 'lb')
     * 
     * @description TDEE Calculation Strategy:
     * - Fetches previous 7 days to create 14-day window
     * - Uses Calculator.calculateStableTDEE() for regression-based estimate
     * - Falls back to "Need X more days" if insufficient data
     * 
     * @description Display Elements:
     * - week-avg-weight: Average weight with unit
     * - week-avg-calories: Average calories (no unit)
     * - week-tdee: TDEE estimate or data requirement message
     * - week-confidence: Confidence badge (High/Med/Low with color coding)
     * 
     * @example
     * // Called internally by render()
     * renderSummary(weekEntries, 'kg');
     */
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

    /**
     * Refresh the weekly view
     * @description Re-renders the weekly table and summary with current data. Called when
     * entries are added, updated, or deleted to reflect changes immediately.
     * 
     * @example
     * // Called after saving an entry
     * WeeklyView.refresh();
     */
    function refresh() {
        render();
    }

    /**
     * Get the current week start date
     * @description Returns the Date object representing the start of the currently displayed
     * week (always a Monday). Used by other modules to determine which week is being viewed.
     * 
     * @returns {Date} The start date of the current week (Monday)
     * 
     * @example
     * // Get current week start for external use
     * const weekStart = WeeklyView.getCurrentWeekStart();
     * // Returns: Date object (e.g., Mon Mar 17 2026 00:00:00)
     */
    function getCurrentWeekStart() {
        return currentWeekStart;
    }

    return {
        init,
        refresh,
        getCurrentWeekStart
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.WeeklyView = WeeklyView;
}
