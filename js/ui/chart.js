/**
 * Chart UI Component
 * Simple canvas-based chart for weight and TDEE trends
 * No external dependencies - vanilla canvas rendering
 */

const Chart = (function () {
    'use strict';

    let canvas = null;
    let ctx = null;

    function init() {
        canvas = document.getElementById('progress-chart');
        if (!canvas) return;

        ctx = canvas.getContext('2d');

        // Handle resize
        window.addEventListener('resize', Utils.debounce(refresh, 250));

        refresh();
    }

    function refresh() {
        if (!canvas || !ctx) return;

        // Set canvas size (account for device pixel ratio)
        const container = canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const width = container.clientWidth;
        const height = container.clientHeight;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        // Get data for last 8 weeks
        const settings = Storage.getSettings();
        const data = getChartData(56, settings.weightUnit || 'kg');

        if (data.weights.length < 2) {
            drawEmptyState(width, height);
            return;
        }

        drawChart(data, width, height);
    }

    function getChartData(days, weightUnit) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const entries = Storage.getEntriesInRange(
            Utils.formatDate(startDate),
            Utils.formatDate(endDate)
        );

        const processed = Calculator.processEntriesWithGaps(entries);

        // Extract EWMA weights
        const weights = [];
        const tdees = [];
        const labels = [];

        // Group by week for smoother display
        const weeklyData = groupByWeek(processed, weightUnit);

        for (const week of weeklyData) {
            if (week.ewmaWeight !== null) {
                weights.push(week.ewmaWeight);
                tdees.push(week.tdee);
                labels.push(week.label);
            }
        }

        return { weights, tdees, labels };
    }

    function groupByWeek(entries, weightUnit) {
        const weeks = {};

        for (const entry of entries) {
            const weekStart = Utils.formatDate(Utils.getWeekStart(entry.date));
            if (!weeks[weekStart]) {
                weeks[weekStart] = { entries: [], label: '' };
            }
            weeks[weekStart].entries.push(entry);
            weeks[weekStart].label = weekStart;
        }

        const result = [];
        const sortedWeeks = Object.keys(weeks).sort();

        for (let i = 0; i < sortedWeeks.length; i++) {
            const weekData = weeks[sortedWeeks[i]];
            const summary = Calculator.calculateWeeklySummary(weekData.entries);

            let tdee = null;
            if (i > 0 && summary.avgWeight !== null && summary.avgCalories !== null) {
                const prevSummary = result[i - 1];
                if (prevSummary && prevSummary.avgWeight !== null) {
                    tdee = Calculator.calculateTDEE({
                        avgCalories: summary.avgCalories,
                        weightDelta: summary.avgWeight - prevSummary.avgWeight,
                        trackedDays: summary.trackedDays,
                        unit: weightUnit
                    });
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

    function drawChart(data, width, height) {
        const { weights, tdees, labels } = data;

        const padding = { top: 20, right: 20, bottom: 30, left: 45 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Get colors from CSS
        const style = getComputedStyle(document.documentElement);
        const textColor = style.getPropertyValue('--color-text-tertiary').trim() || '#8b949e';
        const borderColor = style.getPropertyValue('--color-border-light').trim() || '#21262d';

        // Calculate scales
        const weightMin = Math.min(...weights) - 1;
        const weightMax = Math.max(...weights) + 1;
        const weightRange = weightMax - weightMin;

        const xStep = chartWidth / (weights.length - 1);

        // Draw grid
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;

        // Horizontal lines
        const numLines = 4;
        for (let i = 0; i <= numLines; i++) {
            const y = padding.top + (chartHeight / numLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            // Labels
            const value = weightMax - (weightRange / numLines) * i;
            ctx.fillStyle = textColor;
            ctx.font = '11px -apple-system, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(value.toFixed(1), padding.left - 8, y + 4);
        }

        // Draw weight line
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        for (let i = 0; i < weights.length; i++) {
            const x = padding.left + i * xStep;
            const y = padding.top + ((weightMax - weights[i]) / weightRange) * chartHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Draw weight points
        ctx.fillStyle = '#667eea';
        for (let i = 0; i < weights.length; i++) {
            const x = padding.left + i * xStep;
            const y = padding.top + ((weightMax - weights[i]) / weightRange) * chartHeight;

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw TDEE as bars (if available)
        const validTdees = tdees.filter(t => t !== null);
        if (validTdees.length > 0) {
            const tdeeMin = Math.min(...validTdees) * 0.9;
            const tdeeMax = Math.max(...validTdees) * 1.1;
            const tdeeRange = tdeeMax - tdeeMin;

            ctx.fillStyle = 'rgba(56, 239, 125, 0.3)';
            const barWidth = Math.max(xStep * 0.6, 8);

            for (let i = 0; i < tdees.length; i++) {
                if (tdees[i] === null) continue;

                const x = padding.left + i * xStep - barWidth / 2;
                const barHeight = ((tdees[i] - tdeeMin) / tdeeRange) * (chartHeight * 0.3);
                const y = height - padding.bottom - barHeight;

                ctx.fillRect(x, y, barWidth, barHeight);
            }
        }

        // X-axis labels
        ctx.fillStyle = textColor;
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'center';

        const labelStep = Math.max(1, Math.floor(labels.length / 5));
        for (let i = 0; i < labels.length; i += labelStep) {
            const x = padding.left + i * xStep;
            const date = Utils.parseDate(labels[i]);
            const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            ctx.fillText(label, x, height - 8);
        }
    }

    function drawEmptyState(width, height) {
        ctx.clearRect(0, 0, width, height);

        const style = getComputedStyle(document.documentElement);
        const textColor = style.getPropertyValue('--color-text-tertiary').trim() || '#8b949e';

        ctx.fillStyle = textColor;
        ctx.font = '14px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Add more data to see your progress', width / 2, height / 2);
    }

    return {
        init,
        refresh
    };
})();
