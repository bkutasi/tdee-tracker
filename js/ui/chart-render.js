/**
 * Chart Rendering Module
 * Canvas-based rendering for TDEE/weight chart
 * No external dependencies - vanilla canvas API
 */

const ChartRender = (function () {
    'use strict';

    /**
     * Main chart rendering function
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     * @param {object} data - Chart data from ChartData module
     * @param {number} width - Canvas width in CSS pixels
     * @param {number} height - Canvas height in CSS pixels
     * @returns {array} Hit areas for tooltip interactions
     */
    function drawChart(ctx, data, width, height) {
        const { weights, tdees, labels } = data;
        const hitAreas = []; // Store interactive zones

        // Padding: left/right extra space for axis labels + point radius
        // Extra horizontal padding (20px each side) prevents first/last points from touching axis labels
        const padding = { top: 30, right: 80, bottom: 50, left: 80 };
        const horizontalPointPadding = 20;
        const chartWidth = width - padding.left - padding.right - (horizontalPointPadding * 2);
        const chartHeight = height - padding.top - padding.bottom;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Get colors from cached CSS styles (avoids expensive getComputedStyle call)
        const styles = Chart.getChartStyles();
        const textColor = styles.textColor;
        const borderColor = styles.borderColor;
        const weightColor = styles.weightColor;
        const tdeeColor = styles.tdeeColor;

        // Calculate weight scale
        const weightMin = Math.min(...weights) - 1;
        const weightMax = Math.max(...weights) + 1;
        const weightRange = weightMax - weightMin;

        // Calculate TDEE scale
        const validTdees = tdees.filter(t => t !== null && !isNaN(t));
        let tdeeMin = 1500, tdeeMax = 3000, tdeeRange = 1500;

        if (validTdees.length > 0) {
            tdeeMin = Math.floor(Math.min(...validTdees) / 100) * 100 - 100;
            tdeeMax = Math.ceil(Math.max(...validTdees) / 100) * 100 + 100;
            tdeeRange = tdeeMax - tdeeMin;
        }

        const xStep = chartWidth / Math.max(1, weights.length - 1);

        // Draw grid and axis labels
        drawGrid(ctx, { padding, chartWidth, chartHeight, width, height, numLines: 4, weightMax, weightRange }, { textColor, borderColor });

        // Draw TDEE scale labels
        if (validTdees.length > 0) {
            drawTDEEScale(ctx, { padding, chartHeight, tdeeMax, tdeeRange, numLines: 4, width }, { textColor });
        }

        // Draw TDEE as BARS
        if (validTdees.length > 0) {
            drawTDEEBars(ctx, { tdees, xStep, chartHeight, padding, horizontalPointPadding, tdeeMin, tdeeRange, labels }, { styles, tdeeColor }, hitAreas);
        }

        // Draw weight line and points
        drawWeightLine(ctx, { weights, xStep, chartHeight, padding, horizontalPointPadding, weightMax, weightRange, labels }, { weightColor }, hitAreas);

        // Draw X-axis labels
        drawXAxisLabels(ctx, { labels, xStep, padding, chartHeight }, { textColor });

        return hitAreas;
    }

    /**
     * Draw grid lines and weight axis labels
     */
    function drawGrid(ctx, bounds, styles) {
        const { padding, chartWidth, chartHeight, width, numLines, weightMax, weightRange } = bounds;
        const { textColor, borderColor } = styles;

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3; // Make grid lines more subtle

        for (let i = 0; i <= numLines; i++) {
            const y = padding.top + (chartHeight / numLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left + 20, y);
            ctx.lineTo(width - padding.right - 20, y);
            ctx.stroke();

            // Left Y-axis labels (Weight) - match X-axis style
            const weightValue = weightMax - (weightRange / numLines) * i;
            ctx.fillStyle = textColor;
            ctx.font = '10px -apple-system, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(weightValue.toFixed(1), padding.left - 10, y + 4);
        }
        
        ctx.globalAlpha = 1.0; // Reset alpha for subsequent drawing
    }

    /**
     * Draw TDEE scale labels on right axis
     */
    function drawTDEEScale(ctx, bounds, styles) {
        const { padding, chartHeight, tdeeMax, tdeeRange, numLines, width } = bounds;
        const { textColor } = styles;

        for (let i = 0; i <= numLines; i++) {
            const y = padding.top + (chartHeight / numLines) * i;
            const tdeeValue = Math.round(tdeeMax - (tdeeRange / numLines) * i);
            
            ctx.fillStyle = textColor;
            ctx.font = '10px -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(tdeeValue.toString(), width - padding.right + 10, y + 4);
        }
    }

    /**
     * Draw TDEE bars with gradient fill
     */
    function drawTDEEBars(ctx, data, styles, hitAreas) {
        const { tdees, xStep, chartHeight, padding, horizontalPointPadding, tdeeMin, tdeeRange } = data;
        const { styles: chartStyles, tdeeColor } = styles;

        const barWidth = Math.max(xStep * 0.5, 12);
        const finalBarWidth = Math.min(barWidth, 40);

        for (let i = 0; i < tdees.length; i++) {
            if (tdees[i] === null) continue;

            const x = padding.left + horizontalPointPadding + i * xStep - finalBarWidth / 2;
            const barHeight = ((tdees[i] - tdeeMin) / tdeeRange) * chartHeight;
            const y = padding.top + chartHeight - barHeight;

            // Bar gradient
            const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
            gradient.addColorStop(0, chartStyles.tdeeLight.replace('0.1', '0.6'));
            gradient.addColorStop(1, chartStyles.tdeeLight);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, finalBarWidth, barHeight, 3);
            ctx.fill();

            // Bar outline
            ctx.strokeStyle = tdeeColor;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Store hit area
            hitAreas.push({
                x, y, w: finalBarWidth, h: barHeight,
                type: 'bar',
                value: tdees[i],
                label: `TDEE: ${Math.round(tdees[i])}`,
                date: data.labels ? data.labels[i] : ''
            });
        }
    }

    /**
     * Draw weight line and points
     */
    function drawWeightLine(ctx, data, styles, hitAreas) {
        const { weights, xStep, chartHeight, padding, horizontalPointPadding, weightMax, weightRange } = data;
        const { weightColor } = styles;

        // Draw weight line (Stroke)
        ctx.strokeStyle = weightColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        for (let i = 0; i < weights.length; i++) {
            const x = padding.left + horizontalPointPadding + i * xStep;
            const y = padding.top + ((weightMax - weights[i]) / weightRange) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw weight points
        ctx.fillStyle = weightColor;
        for (let i = 0; i < weights.length; i++) {
            const x = padding.left + horizontalPointPadding + i * xStep;
            const y = padding.top + ((weightMax - weights[i]) / weightRange) * chartHeight;

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Store hit area (point)
            hitAreas.push({
                x, y,
                type: 'point',
                value: weights[i],
                label: `Weight: ${weights[i].toFixed(1)}`,
                date: data.labels ? data.labels[i] : ''
            });
        }
    }

    /**
     * Draw X-axis date labels
     */
    function drawXAxisLabels(ctx, data, styles) {
        const { labels, xStep, padding, chartHeight } = data;
        const { textColor } = styles;

        ctx.fillStyle = textColor;
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'center';

        const labelStep = Math.max(1, Math.floor(labels.length / 5));
        for (let i = 0; i < labels.length; i += labelStep) {
            const x = padding.left + 20 + i * xStep;
            const date = Utils.parseDate(labels[i]);
            const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            // Position label in bottom padding area (below chart, above canvas edge)
            ctx.fillText(label, x, padding.top + chartHeight + 15);
        }
    }

    /**
     * Draw tooltip overlay
     */
    function drawTooltip(ctx, hit, styles) {
        if (!ctx) return;

        ctx.save();
        const dpr = window.devicePixelRatio || 1;

        const padding = 8;
        const dateStr = new Date(hit.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const text = `${dateStr}\n${hit.label}`;

        ctx.font = '12px -apple-system, sans-serif';
        const lines = text.split('\n');

        // Measure info
        let maxWidth = 0;
        lines.forEach(l => maxWidth = Math.max(maxWidth, ctx.measureText(l).width));

        const tooltipW = maxWidth + padding * 2;
        const tooltipH = (lines.length * 16) + padding * 2;

        // Position tooltip near target but constraint to canvas
        let x = hit.x;
        let y = hit.y - tooltipH - 10;

        // Adjust for edges
        if (x + tooltipW > ctx.canvas.width / dpr) x -= tooltipW;
        if (x < 0) x = 0;
        if (y < 0) y = hit.y + hit.h + 10; // Flip down if clipping top for bars

        // If point tooltip is too high, flip
        if (hit.type === 'point' && y < 0) y = hit.y + 15;

        // Draw bg
        ctx.fillStyle = styles.tooltipBg;
        ctx.strokeStyle = styles.tooltipBorder;
        ctx.lineWidth = 1;

        ctx.beginPath();
        // roundRect support might vary, use fallback or standard
        if (ctx.roundRect) {
            ctx.roundRect(x, y, tooltipW, tooltipH, 4);
        } else {
            ctx.rect(x, y, tooltipW, tooltipH);
        }
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = styles.tooltipText;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        lines.forEach((line, i) => {
            ctx.fillText(line, x + padding, y + padding + (i * 16));
        });

        ctx.restore();
    }

    /**
     * Draw empty state message
     */
    function drawEmptyState(ctx, data, width, height, styles) {
        const { textColor } = styles;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        
        // Check if we have calorie-only data
        const hasCalories = data && data.tdees && data.tdees.length > 0;
        const hasAnyWeights = data && data.weights && data.weights.length > 0;
        
        if (hasCalories && !hasAnyWeights) {
            // User has calorie data but no weight measurements
            ctx.font = '14px -apple-system, sans-serif';
            ctx.fillText('Add weight measurements to see the chart', width / 2, height / 2 - 10);
            ctx.font = '12px -apple-system, sans-serif';
            ctx.fillStyle = textColor.replace(')', ', 0.7)').replace('rgb', 'rgba');
            ctx.fillText('(You have calorie data, but no weight entries)', width / 2, height / 2 + 15);
        } else if (hasAnyWeights && data.weights.length < 2) {
            // Only 1 weight entry - need at least 2 for a trend
            ctx.font = '14px -apple-system, sans-serif';
            ctx.fillText('Add more weight entries to see the trend', width / 2, height / 2 - 10);
            ctx.font = '12px -apple-system, sans-serif';
            ctx.fillStyle = textColor.replace(')', ', 0.7)').replace('rgb', 'rgba');
            ctx.fillText('(Need at least 2 weight measurements)', width / 2, height / 2 + 15);
        } else {
            // No data at all
            ctx.font = '14px -apple-system, sans-serif';
            ctx.fillText('Add more data to see your progress', width / 2, height / 2);
        }
    }

    return {
        drawChart,
        drawGrid,
        drawTDEEScale,
        drawTDEEBars,
        drawWeightLine,
        drawXAxisLabels,
        drawTooltip,
        drawEmptyState
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.ChartRender = ChartRender;
}
