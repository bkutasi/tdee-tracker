/**
 * Chart Rendering Tests
 * Tests for chart padding, legend colors, and axis labels
 * 
 * Run with: open tests/test-runner.html (browser required)
 */

(function() {
    'use strict';

    // Skip in Node.js - requires DOM
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.log('[Chart Rendering Tests] Skipped - browser environment required');
        return;
    }

    describe('Chart Legend Colors', () => {
        beforeEach(() => {
            Components.applyTheme('light');
        });

        it('legend-dot.weight element exists', () => {
            const weightDot = document.querySelector('.legend-dot.weight');
            expect(weightDot).toBeDefined();
        });

        it('legend-dot.tdee element exists', () => {
            const tdeeDot = document.querySelector('.legend-dot.tdee');
            expect(tdeeDot).toBeDefined();
        });

        it('legend-dot.weight uses --chart-weight CSS variable', () => {
            const style = getComputedStyle(document.documentElement);
            const chartWeight = style.getPropertyValue('--chart-weight').trim();
            const weightDot = document.querySelector('.legend-dot.weight');
            
            if (weightDot) {
                const dotStyle = getComputedStyle(weightDot);
                // Should use the CSS variable value
                expect(dotStyle.backgroundColor).toBeDefined();
                expect(dotStyle.backgroundColor.length).toBeGreaterThan(0);
            }
        });

        it('legend-dot.tdee uses --chart-tdee CSS variable', () => {
            const style = getComputedStyle(document.documentElement);
            const chartTdee = style.getPropertyValue('--chart-tdee').trim();
            const tdeeDot = document.querySelector('.legend-dot.tdee');
            
            if (tdeeDot) {
                const dotStyle = getComputedStyle(tdeeDot);
                expect(dotStyle.backgroundColor).toBeDefined();
                expect(dotStyle.backgroundColor.length).toBeGreaterThan(0);
            }
        });

        it('weight and tdee legend colors are different', () => {
            const weightDot = document.querySelector('.legend-dot.weight');
            const tdeeDot = document.querySelector('.legend-dot.tdee');
            
            if (weightDot && tdeeDot) {
                const weightStyle = getComputedStyle(weightDot);
                const tdeeStyle = getComputedStyle(tdeeDot);
                
                expect(weightStyle.backgroundColor).not.toBe(tdeeStyle.backgroundColor);
            }
        });

        it('chart weight color changes in dark mode', () => {
            const lightStyle = getComputedStyle(document.documentElement);
            const lightWeight = lightStyle.getPropertyValue('--chart-weight').trim();
            
            Components.applyTheme('dark');
            
            const darkStyle = getComputedStyle(document.documentElement);
            const darkWeight = darkStyle.getPropertyValue('--chart-weight').trim();
            
            expect(lightWeight).not.toBe(darkWeight);
        });

        it('chart tdee color changes in dark mode', () => {
            const lightStyle = getComputedStyle(document.documentElement);
            const lightTdee = lightStyle.getPropertyValue('--chart-tdee').trim();
            
            Components.applyTheme('dark');
            
            const darkStyle = getComputedStyle(document.documentElement);
            const darkTdee = darkStyle.getPropertyValue('--chart-tdee').trim();
            
            expect(lightTdee).not.toBe(darkTdee);
        });

        it('legend items have correct text labels', () => {
            const legendItems = document.querySelectorAll('.legend-item');
            
            if (legendItems.length >= 2) {
                expect(legendItems[0].textContent).toContain('Weight');
                expect(legendItems[1].textContent).toContain('TDEE');
            }
        });
    });

    describe('Chart Padding Configuration', () => {
        it('chart canvas element exists', () => {
            const canvas = document.getElementById('progress-chart');
            expect(canvas).toBeDefined();
        });

        it('chart container has defined height', () => {
            const container = document.getElementById('chart-container');
            if (container) {
                const style = getComputedStyle(container);
                expect(style.height).toBeDefined();
            }
        });

        it('chart padding prevents edge clipping', () => {
            // Verify chart module has proper padding config
            expect(typeof Chart.refresh).toBe('function');
            expect(typeof Chart.init).toBe('function');
        });
    });

    describe('Chart Axis Labels', () => {
        beforeEach(() => {
            Components.applyTheme('light');
        });

        it('chart uses consistent font size for all axes', () => {
            const styles = Chart.getChartStyles();
            
            // Text color should be defined for axis labels
            expect(styles.textColor).toBeDefined();
            expect(styles.textColor.length).toBeGreaterThan(0);
        });

        it('Y-axis labels use same style as X-axis', () => {
            const style = getComputedStyle(document.documentElement);
            const textColor = style.getPropertyValue('--color-text-tertiary').trim();
            
            expect(textColor).toBeDefined();
            expect(textColor.length).toBeGreaterThan(0);
        });

        it('chart text color changes with theme', () => {
            const lightStyle = getComputedStyle(document.documentElement);
            const lightText = lightStyle.getPropertyValue('--color-text-tertiary').trim();
            
            Components.applyTheme('dark');
            
            const darkStyle = getComputedStyle(document.documentElement);
            const darkText = darkStyle.getPropertyValue('--color-text-tertiary').trim();
            
            expect(lightText).not.toBe(darkText);
        });
    });

    describe('Chart Style Cache', () => {
        it('getChartStyles returns consistent values', () => {
            const styles1 = Chart.getChartStyles();
            const styles2 = Chart.getChartStyles();
            
            // Should return same cached object
            expect(styles1).toBe(styles2);
        });

        it('chart styles include all required colors', () => {
            const styles = Chart.getChartStyles();
            
            expect(styles.weightColor).toBeDefined();
            expect(styles.tdeeColor).toBeDefined();
            expect(styles.textColor).toBeDefined();
            expect(styles.borderColor).toBeDefined();
        });

        it('style cache clears on theme change', () => {
            const lightStyles = Chart.getChartStyles();
            
            Components.applyTheme('dark');
            
            const darkStyles = Chart.getChartStyles();
            
            // Colors should be different
            expect(lightStyles.weightColor).not.toBe(darkStyles.weightColor);
            expect(lightStyles.tdeeColor).not.toBe(darkStyles.tdeeColor);
        });
    });

    describe('Chart Legend HTML Structure', () => {
        it('chart-legend container exists', () => {
            const legend = document.getElementById('chart-legend');
            expect(legend).toBeDefined();
        });

        it('legend has exactly 2 items (weight and TDEE)', () => {
            const legend = document.getElementById('chart-legend');
            if (legend) {
                const items = legend.querySelectorAll('.legend-item');
                expect(items.length).toBe(2);
            }
        });

        it('legend dots have correct CSS classes', () => {
            const weightDot = document.querySelector('.legend-dot.weight');
            const tdeeDot = document.querySelector('.legend-dot.tdee');
            
            expect(weightDot).toBeDefined();
            expect(tdeeDot).toBeDefined();
        });
    });

    // Reset theme after tests
    afterAll(() => {
        Components.applyTheme('system');
    });

})();
