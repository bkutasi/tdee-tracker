/**
 * Chart UI Component
 * Dual Y-axis chart for weight (line) and TDEE (bars) trends
 * No external dependencies - vanilla canvas rendering
 * 
 * Coordinates between ChartData (data preparation) and ChartRender (canvas rendering)
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

    /**
     * Get and cache chart styles from CSS custom properties
     * @returns {object} Cached style values
     */
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

    /**
     * Clear cached styles (called on theme change)
     */
    function clearStyleCache() {
        cachedStyles = null;
    }

    /**
     * Initialize chart module
     */
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

    /**
     * Refresh chart display
     * @param {boolean} recalcCallback - Whether to recalculate data (default: true)
     */
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
            cachedData = ChartData.getChartData(120, settings);  // 4 months for better trend visibility
        } else {
            const settings = Storage.getSettings();
            cachedData = ChartData.getChartData(120, settings);
        }
        
        if (!ChartData.isValidData(cachedData)) {
            const styles = getChartStyles();
            ChartRender.drawEmptyState(ctx, cachedData, width, height, styles);
            updateChartAccessibility(null, null, 0);
            chartImageCache = null;
            return;
        }

        // Delegate rendering to ChartRender module
        hitAreas = ChartRender.drawChart(ctx, cachedData, width, height);
        
        // Update accessibility attributes
        const summary = ChartData.getChartSummary(cachedData);
        updateChartAccessibility(summary.currentWeight, summary.trendDirection, summary.dataPoints);
        
        // Cache the chart rendering for fast tooltip updates
        try {
            chartImageCache = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            chartImageCache = null;
        }
    }

    /**
     * Handle mouse move events for tooltip interactions
     * @description Detects hover over chart data points (weight) and bars (TDEE) using hit
     * area detection. Shows tooltips with value details on hover. Uses cached chart rendering
     * for fast tooltip updates without full redraw.
     * 
     * @param {MouseEvent} e - Mouse event with client coordinates
     * 
     * @description Hit Detection:
     * - Points (weight): Circular hit area with 10px radius (generous for easy targeting)
     * - Bars (TDEE): Rectangular hit area covering the full bar
     * - Priority: Points over bars if overlapping (reverse iteration)
     * 
     * @description Performance Optimization:
     * - Uses chartImageCache to restore clean chart instantly
     * - Falls back to refresh(false) if cache unavailable
     * - Changes cursor to 'pointer' when hovering over data
     * 
     * @example
     * // Called automatically by canvas mousemove listener
     * handleMouseMove(event);
     */
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
            const styles = getChartStyles();
            ChartRender.drawTooltip(ctx, hit, styles);
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

    /**
     * Handle mouse leave event - clear tooltip
     * @description Resets cursor to default and restores the cached chart rendering to
     * clear any visible tooltip. Called when mouse exits the canvas area.
     * 
     * @description Cleanup Actions:
     * - Reset cursor style to 'default'
     * - Restore chartImageCache (removes tooltip overlay)
     * - Falls back to refresh(false) if cache unavailable
     * 
     * @example
     * // Called automatically by canvas mouseleave listener
     * handleMouseLeave();
     */
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

    /**
     * Update chart accessibility attributes for screen readers
     * @description Sets ARIA attributes on the canvas element to provide meaningful
     * descriptions for users with visual impairments. Includes data point count, current
     * weight, trend direction, and chart element descriptions.
     * 
     * @param {number|null} currentWeight - Current weight value for display
     * @param {string} trendDirection - Trend description (e.g., "increasing", "decreasing", "stable")
     * @param {number} dataPoints - Number of data points in the chart
     * 
     * @description ARIA Attributes Set:
     * - role="img": Identifies canvas as an image
     * - aria-label: Descriptive text with chart summary
     * 
     * @description Description Variants:
     * - No data: "Weight trend chart. No data available yet. Add weight entries to see your progress."
     * - Has data: "Weight trend chart showing X data points. Current weight: Y.Ykg. Trend: [direction].
     *              Green bars show TDEE estimates. Purple line shows weight trend."
     * 
     * @example
     * // Called internally after chart rendering
     * updateChartAccessibility(82.5, 'decreasing', 42);
     */
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
