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
            cachedData = ChartData.getChartData(180, settings);  // Extended from 56 to 180 days
        } else {
            const settings = Storage.getSettings();
            cachedData = ChartData.getChartData(56, settings);
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
     * Handle mouse move for tooltip interactions
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
     * Handle mouse leave - clear tooltip
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
     * Update chart accessibility attributes
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
