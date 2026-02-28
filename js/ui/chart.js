/**
 * Chart UI Component
 * Dual Y-axis chart for weight (line) and TDEE (bars) trends
 * No external dependencies - vanilla canvas rendering
 */

const Chart = (function () {
    'use strict';

    let canvas = null;
    let ctx = null;
    let hitAreas = []; // Store interactive zones {x, y, w, h, type, value, date, label}

    // Cache CSS computed styles to avoid expensive getComputedStyle calls on every redraw
    let cachedStyles = null;

    // Cache chart as ImageData to avoid redrawing on tooltip interaction
    let chartImageCache = null;

    function getChartStyles() {
        if (cachedStyles) return cachedStyles;

        const style = getComputedStyle(document.documentElement);
        cachedStyles = {
            textColor: style.getPropertyValue('--color-text-tertiary').trim() || '#8b949e',
            borderColor: style.getPropertyValue('--color-border-light').trim() || '#21262d',
            weightColor: style.getPropertyValue('--chart-weight').trim() || '#FF6F20',
            weightLight: style.getPropertyValue('--chart-weight-light').trim() || 'rgba(255, 111, 32, 0.1)',
            tdeeColor: style.getPropertyValue('--chart-tdee').trim() || '#00C897',
            tdeeLight: style.getPropertyValue('--chart-tdee-light').trim() || 'rgba(0, 200, 151, 0.1)',
            tooltipBg: style.getPropertyValue('--chart-tooltip-bg').trim() || 'rgba(23, 25, 28, 0.9)',
            tooltipText: style.getPropertyValue('--chart-tooltip-text').trim() || '#FFFFFF',
            tooltipBorder: style.getPropertyValue('--chart-tooltip-border').trim() || 'rgba(255, 255, 255, 0.1)'
        };
        return cachedStyles;
    }

    function clearStyleCache() {
        cachedStyles = null;
    }

    function init() {
        canvas = document.getElementById('progress-chart');
        if (!canvas) return;

        ctx = canvas.getContext('2d');

        // Handle resize - invalidate cache on resize
        window.addEventListener('resize', Utils.debounce(() => {
            chartImageCache = null; // Invalidate cache on resize
            refresh();
        }, 250));

        // Interaction listeners
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);

        // Listen for theme changes to clear caches
        // MutationObserver watches for changes to CSS custom properties
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    clearStyleCache();
                    chartImageCache = null; // Invalidate chart cache on theme change
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

        refresh();
    }

    // Cache data to avoid recalculating on every mousemove
    let cachedData = null;

    function refresh(recalcCallback = true) {
        if (!canvas || !ctx) {
            return;
        }

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

        if (recalcCallback || !cachedData) {
            const settings = Storage.getSettings();
            cachedData = getChartData(180, settings);  // Extended from 56 to 180 days
        } else {
            const settings = Storage.getSettings();
            cachedData = getChartData(56, settings);
        }
        
        if (cachedData.weights.length < 2) {
            drawEmptyState(width, height);
            updateChartAccessibility(null, null, 0);
            chartImageCache = null;
            return;
        }

        drawChart(cachedData, width, height);
        
        // Update accessibility attributes
        const currentWeight = cachedData.weights[cachedData.weights.length - 1];
        const trendDirection = cachedData.weights.length > 1 
            ? (cachedData.weights[cachedData.weights.length - 1] > cachedData.weights[0] ? 'increasing' : 'decreasing')
            : 'stable';
        updateChartAccessibility(currentWeight, trendDirection, cachedData.weights.length);
        
        // Cache the chart rendering for fast tooltip updates
        try {
            chartImageCache = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            chartImageCache = null;
        }
    }
    function getChartData(days, settings) {
        const weightUnit = settings.weightUnit || 'kg';
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const contextStartDate = new Date(startDate);
        contextStartDate.setDate(contextStartDate.getDate() - 7);

        // Get all entries needed including context
        const entries = Storage.getEntriesInRange(
            Utils.formatDate(contextStartDate),
            Utils.formatDate(endDate)
        );
        
        const processed = Calculator.processEntriesWithGaps(entries);

        // Group by week for smoother display
        const weeklyData = groupByWeek(processed, settings, startDate);

        // Extract EWMA weights and TDEEs
        const weights = [];
        const tdees = [];
        const labels = [];

        for (const week of weeklyData) {
            if (week.ewmaWeight !== null) {
                weights.push(week.ewmaWeight);
                tdees.push(week.tdee);
                labels.push(week.label);
            }
        }
        
        console.log('[Chart.getChartData] Extracted', weights.length, 'EWMA weights for chart');

        return { weights, tdees, labels };
    }

    function groupByWeek(entries, settings, displayStartDate) {
        const weightUnit = settings.weightUnit || 'kg';
        const weeks = {};
        const sortedEntries = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));

        for (const entry of sortedEntries) {
            const weekStart = Utils.formatDate(Utils.getWeekStart(entry.date));
            if (!weeks[weekStart]) {
                weeks[weekStart] = { entries: [], label: '', weekStartDate: weekStart };
            }
            weeks[weekStart].entries.push(entry);
            weeks[weekStart].label = weekStart;
        }

        const result = [];
        const sortedWeeks = Object.keys(weeks).sort();
        const displayStartStr = Utils.formatDate(displayStartDate);

        for (let i = 0; i < sortedWeeks.length; i++) {
            const weekKey = sortedWeeks[i];

            // Skip weeks before our display start (they were just for context)
            if (weekKey < displayStartStr) continue;

            const weekData = weeks[weekKey];
            const summary = Calculator.calculateWeeklySummary(weekData.entries);

            let tdee = null;

            // Build 14-day context: need previous week's entries + current week
            // Since we sorted keys, i-1 is the previous week
            let contextEntries = [...weekData.entries];
            if (i > 0) {
                const prevWeekKey = sortedWeeks[i - 1];
                contextEntries = [...weeks[prevWeekKey].entries, ...weekData.entries];
            }

            // Calculate 14-day Stable TDEE
            if (contextEntries.length >= 7) {
                const stableResult = Calculator.calculateStableTDEE(contextEntries, weightUnit, 14);
                tdee = stableResult.tdee;

                // HYBRID FALLBACK:
                // If TDEE is missing or has low confidence (due to gaps), try Theoretical
                if ((!tdee || stableResult.confidence === 'low' || stableResult.confidence === 'none') &&
                    settings.age && settings.height && settings.gender) {

                    // Need a weight for BMR. Use EWMA weight from this week, or fallback to any we can find
                    const lastEntry = weekData.entries.filter(e => e.ewmaWeight).pop();
                    const bmrWeight = lastEntry?.ewmaWeight || settings.startingWeight;

                    if (bmrWeight) {
                        const bmrResult = Calculator.calculateBMR(bmrWeight, settings.height, settings.age, settings.gender);
                        // Handle new return format {valid, bmr, error}
                        if (bmrResult.valid) {
                            const theoretical = Calculator.calculateTheoreticalTDEE(bmrResult, settings.activityLevel);

                            if (theoretical) {
                                // If we had no TDEE, take theoretical
                                // If we had 'low' confidence TDEE, we might prefer theoretical IF the difference is huge?
                                // User complaint was "996 kcal" (likely low tracked days).
                                // Let's rely on Theoretical if confidence is LOW/NONE.
                                tdee = theoretical;
                            }
                        }
                    }
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
        hitAreas = []; // Reset hit areas

        // Padding: left/right extra space for axis labels + point radius
        const padding = { top: 30, right: 80, bottom: 50, left: 80 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Get colors from cached CSS styles (avoids expensive getComputedStyle call)
        const styles = getChartStyles();
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

        // Horizontal grid lines - subtle
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3; // Make grid lines more subtle

        const numLines = 4;
        for (let i = 0; i <= numLines; i++) {
            const y = padding.top + (chartHeight / numLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            // Left Y-axis labels (Weight) - match X-axis style
            const weightValue = weightMax - (weightRange / numLines) * i;
            ctx.fillStyle = textColor;
            ctx.font = '10px -apple-system, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(weightValue.toFixed(1), padding.left - 10, y + 4);

            // Right Y-axis labels (TDEE) - match X-axis style
            if (validTdees.length > 0) {
                const tdeeValue = Math.round(tdeeMax - (tdeeRange / numLines) * i);
                ctx.fillStyle = textColor;
                ctx.font = '10px -apple-system, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(tdeeValue.toString(), width - padding.right + 10, y + 4);
            }
        }
        
        ctx.globalAlpha = 1.0; // Reset alpha for subsequent drawing

        // Draw TDEE as BARS
        if (validTdees.length > 0) {
            const barWidth = Math.max(xStep * 0.5, 12);
            // Cap max bar width to look nice
            const finalBarWidth = Math.min(barWidth, 40);

            for (let i = 0; i < tdees.length; i++) {
                if (tdees[i] === null) continue;

                const x = padding.left + i * xStep - finalBarWidth / 2;
                const barHeight = ((tdees[i] - tdeeMin) / tdeeRange) * chartHeight;
                const y = padding.top + chartHeight - barHeight;

                // Bar gradient
                const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
                gradient.addColorStop(0, styles.tdeeLight.replace('0.1', '0.6'));
                gradient.addColorStop(1, styles.tdeeLight);

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
                    date: labels[i]
                });
            }
        }

        // Draw weight line (Stroke)
        ctx.strokeStyle = weightColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        for (let i = 0; i < weights.length; i++) {
            const x = padding.left + i * xStep;
            const y = padding.top + ((weightMax - weights[i]) / weightRange) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw weight points
        ctx.fillStyle = weightColor;
        for (let i = 0; i < weights.length; i++) {
            const x = padding.left + i * xStep;
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
                date: labels[i]
            });
        }

        // X-axis labels - position in bottom padding area
        ctx.fillStyle = textColor;
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'center';

        const labelStep = Math.max(1, Math.floor(labels.length / 5));
        for (let i = 0; i < labels.length; i += labelStep) {
            const x = padding.left + i * xStep;
            const date = Utils.parseDate(labels[i]);
            const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            // Position label in bottom padding area (below chart, above canvas edge)
            ctx.fillText(label, x, padding.top + chartHeight + 15);
        }
    }

    function handleMouseMove(e) {
        if (!canvas || hitAreas.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Mouse pos relative to canvas
        const x = (e.clientX - rect.left) * dpr;
        const y = (e.clientY - rect.top) * dpr;

        // Find hit
        // Prioritize points over bars if they overlap
        const hit = hitAreas.slice().reverse().find(area => {
            if (area.type === 'point') {
                // Circular hit area for points (generous radius)
                const dx = x - area.x;
                const dy = y - area.y;
                return (dx * dx + dy * dy) <= (10 * 10 * dpr * dpr);
            } else {
                // Rect for bars
                return x >= area.x && x <= area.x + area.w &&
                    y >= area.y && y <= area.y + area.h;
            }
        });

        if (hit) {
            canvas.style.cursor = 'pointer';
            // Restore cached chart (much faster than full redraw)
            if (chartImageCache) {
                ctx.putImageData(chartImageCache, 0, 0);
            } else {
                // Fallback to full redraw if cache unavailable
                refresh(false);
            }
            drawTooltip(hit);
        } else {
            canvas.style.cursor = 'default';
            // Restore cached chart (clears tooltip)
            if (chartImageCache) {
                ctx.putImageData(chartImageCache, 0, 0);
            } else {
                // Fallback to full redraw if cache unavailable
                refresh(false);
            }
        }
    }

    function handleMouseLeave() {
        if (!canvas) return;
        canvas.style.cursor = 'default';
        // Restore cached chart (clears tooltip)
        if (chartImageCache) {
            ctx.putImageData(chartImageCache, 0, 0);
        } else {
            refresh(false);
        }
    }

    function drawTooltip(hit) {
        if (!ctx) return;

        ctx.save();
        const dpr = window.devicePixelRatio || 1;

        // Get styles from cached CSS
        const styles = getChartStyles();

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
        if (x + tooltipW > canvas.width / dpr) x -= tooltipW;
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

    function drawEmptyState(width, height) {
        ctx.clearRect(0, 0, width, height);

        const styles = getChartStyles();
        const textColor = styles.textColor;

        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        
        // Check if we have calorie-only data
        const hasCalories = cachedData && cachedData.tdees && cachedData.tdees.length > 0;
        const hasAnyWeights = cachedData && cachedData.weights && cachedData.weights.length > 0;
        
        if (hasCalories && !hasAnyWeights) {
            // User has calorie data but no weight measurements
            ctx.font = '14px -apple-system, sans-serif';
            ctx.fillText('Add weight measurements to see the chart', width / 2, height / 2 - 10);
            ctx.font = '12px -apple-system, sans-serif';
            ctx.fillStyle = styles.textColor.replace(')', ', 0.7)').replace('rgb', 'rgba');
            ctx.fillText('(You have calorie data, but no weight entries)', width / 2, height / 2 + 15);
        } else if (hasAnyWeights && cachedData.weights.length < 2) {
            // Only 1 weight entry - need at least 2 for a trend
            ctx.font = '14px -apple-system, sans-serif';
            ctx.fillText('Add more weight entries to see the trend', width / 2, height / 2 - 10);
            ctx.font = '12px -apple-system, sans-serif';
            ctx.fillStyle = styles.textColor.replace(')', ', 0.7)').replace('rgb', 'rgba');
            ctx.fillText('(Need at least 2 weight measurements)', width / 2, height / 2 + 15);
        } else {
            // No data at all
            ctx.font = '14px -apple-system, sans-serif';
            ctx.fillText('Add more data to see your progress', width / 2, height / 2);
        }
    }

    function updateChartAccessibility(currentWeight, trendDirection, dataPoints) {
        if (!canvas) return;
        
        let description;
        if (currentWeight === null || dataPoints === 0) {
            description = 'Weight trend chart. No data available yet. Add weight entries to see your progress.';
        } else {
            description = `Weight trend chart showing ${dataPoints} data points. ` +
                `Current weight: ${currentWeight.toFixed(1)}kg. ` +
                `Trend: ${trendDirection}. ` +
                `Green bars show TDEE estimates. Purple line shows weight trend.`;
        }
        
        canvas.setAttribute('aria-label', description);
        canvas.setAttribute('role', 'img');
    }


    return {
        init,
        refresh,
        getChartStyles
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.Chart = Chart;
}
