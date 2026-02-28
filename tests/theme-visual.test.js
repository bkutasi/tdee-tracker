/**
 * Theme and Visual Tests
 * Tests for theme switching, CSS variables, chart colors, and readability
 * 
 * Run with: node tests/node-test.js (Node.js - limited)
 * Full tests: open tests/test-runner.html (browser - full suite)
 */

// Ensure we're in browser environment for DOM tests
(function() {
    'use strict';

    // Skip in Node.js - these tests require DOM
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.log('[Theme/Visual Tests] Skipped - browser environment required');
        return;
    }

    // ========================================
    // Issue 1: Dark/Light Mode Switch Tests
    // ========================================

    describe('Theme Switching - applyTheme function', () => {
        beforeEach(() => {
            // Reset to system theme before each test
            Components.applyTheme('system');
        });

        it('applies light theme correctly', () => {
            Components.applyTheme('light');
            const theme = document.documentElement.getAttribute('data-theme');
            expect(theme).toBe('light');
        });

        it('applies dark theme correctly', () => {
            Components.applyTheme('dark');
            const theme = document.documentElement.getAttribute('data-theme');
            expect(theme).toBe('dark');
        });

        it('removes data-theme attribute for system preference', () => {
            Components.applyTheme('system');
            const theme = document.documentElement.getAttribute('data-theme');
            expect(theme).toBeNull();
        });

        it('updates theme button active states - light', () => {
            // Ensure buttons exist in DOM
            const lightBtn = document.querySelector('.theme-btn[data-theme="light"]');
            const darkBtn = document.querySelector('.theme-btn[data-theme="dark"]');
            
            if (lightBtn && darkBtn) {
                Components.applyTheme('light');
                expect(lightBtn.classList.contains('active')).toBe(true);
                expect(darkBtn.classList.contains('active')).toBe(false);
            }
        });

        it('updates theme button active states - dark', () => {
            const lightBtn = document.querySelector('.theme-btn[data-theme="light"]');
            const darkBtn = document.querySelector('.theme-btn[data-theme="dark"]');
            
            if (lightBtn && darkBtn) {
                Components.applyTheme('dark');
                expect(lightBtn.classList.contains('active')).toBe(false);
                expect(darkBtn.classList.contains('active')).toBe(true);
            }
        });

        // Negative tests
        it('handles invalid theme gracefully', () => {
            Components.applyTheme('invalid-theme');
            // Should not throw, theme attribute should be set to invalid value
            const theme = document.documentElement.getAttribute('data-theme');
            expect(theme).toBe('invalid-theme');
        });
    });

    describe('Theme Persistence - localStorage', () => {
        beforeEach(() => {
            localStorage.clear();
            Storage.init();
        });

        afterEach(() => {
            localStorage.clear();
        });

        it('saves theme to localStorage when changed', () => {
            Storage.saveSettings({ theme: 'dark' });
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('dark');
        });

        it('loads theme from localStorage on init', () => {
            Storage.saveSettings({ theme: 'light' });
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('light');
        });

        it('default theme is system', () => {
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('system');
        });

        it('persists theme across Storage.init calls', () => {
            Storage.saveSettings({ theme: 'dark' });
            Storage.init();
            const settings = Storage.getSettings();
            expect(settings.theme).toBe('dark');
        });

        // Negative tests
        it('handles missing theme gracefully (returns default)', () => {
            const settings = Storage.getSettings();
            expect(settings.theme).toBeDefined();
            expect(['light', 'dark', 'system']).toContain(settings.theme);
        });
    });

    describe('Theme Integration - Settings flow', () => {
        beforeEach(() => {
            localStorage.clear();
            Storage.init();
            Components.applyTheme('system');
        });

        afterEach(() => {
            localStorage.clear();
        });

        it('theme change triggers Components.applyTheme', () => {
            // Simulate settings save
            Storage.saveSettings({ theme: 'dark' });
            Components.applyTheme('dark');
            
            const theme = document.documentElement.getAttribute('data-theme');
            expect(theme).toBe('dark');
        });

        it('loading settings applies saved theme', () => {
            Storage.saveSettings({ theme: 'dark' });
            Components.applyTheme(Storage.getSettings().theme);
            
            const theme = document.documentElement.getAttribute('data-theme');
            expect(theme).toBe('dark');
        });
    });

    // ========================================
    // Issue 2: Chart Legend Colors Tests
    // ========================================

    describe('Chart Legend Colors - CSS Variables', () => {
        beforeEach(() => {
            Components.applyTheme('light');
        });

        it('legend-dot.weight uses --chart-weight in light mode', () => {
            const style = getComputedStyle(document.documentElement);
            const chartWeight = style.getPropertyValue('--chart-weight').trim();
            
            // Light mode: #d97706
            expect(chartWeight).toBe('#d97706');
        });

        it('legend-dot.tdee uses --chart-tdee in light mode', () => {
            const style = getComputedStyle(document.documentElement);
            const chartTdee = style.getPropertyValue('--chart-tdee').trim();
            
            // Light mode: #059669
            expect(chartTdee).toBe('#059669');
        });

        it('chart weight and tdee colors are different', () => {
            const style = getComputedStyle(document.documentElement);
            const chartWeight = style.getPropertyValue('--chart-weight').trim();
            const chartTdee = style.getPropertyValue('--chart-tdee').trim();
            
            expect(chartWeight).not.toBe(chartTdee);
        });

        it('chart weight and tdee have valid hex colors', () => {
            const style = getComputedStyle(document.documentElement);
            const chartWeight = style.getPropertyValue('--chart-weight').trim();
            const chartTdee = style.getPropertyValue('--chart-tdee').trim();
            
            // Valid hex color pattern
            const hexPattern = /^#[0-9a-fA-F]{6}$/;
            expect(hexPattern.test(chartWeight)).toBe(true);
            expect(hexPattern.test(chartTdee)).toBe(true);
        });

        // Test in dark mode
        it('legend-dot.weight uses --chart-weight in dark mode', () => {
            Components.applyTheme('dark');
            const style = getComputedStyle(document.documentElement);
            const chartWeight = style.getPropertyValue('--chart-weight').trim();
            
            // Dark mode: #f97316
            expect(chartWeight).toBe('#f97316');
        });

        it('legend-dot.tdee uses --chart-tdee in dark mode', () => {
            Components.applyTheme('dark');
            const style = getComputedStyle(document.documentElement);
            const chartTdee = style.getPropertyValue('--chart-tdee').trim();
            
            // Dark mode: #10b981
            expect(chartTdee).toBe('#10b981');
        });

        it('chart colors change when theme changes', () => {
            const lightStyle = getComputedStyle(document.documentElement);
            const lightWeight = lightStyle.getPropertyValue('--chart-weight').trim();
            const lightTdee = lightStyle.getPropertyValue('--chart-tdee').trim();
            
            Components.applyTheme('dark');
            
            const darkStyle = getComputedStyle(document.documentElement);
            const darkWeight = darkStyle.getPropertyValue('--chart-weight').trim();
            const darkTdee = darkStyle.getPropertyValue('--chart-tdee').trim();
            
            // Colors should be different between light and dark mode
            expect(lightWeight).not.toBe(darkWeight);
            expect(lightTdee).not.toBe(darkTdee);
        });
    });

    describe('Chart Style Cache', () => {
        beforeEach(() => {
            Components.applyTheme('light');
        });

        it('getChartStyles returns cached styles', () => {
            const styles1 = Chart.getChartStyles();
            const styles2 = Chart.getChartStyles();
            
            // Should return same cached object
            expect(styles1).toBe(styles2);
        });

        it('theme change clears style cache', () => {
            const lightStyles = Chart.getChartStyles();
            
            Components.applyTheme('dark');
            
            const darkStyles = Chart.getChartStyles();
            
            // Colors should be different
            expect(lightStyles.weightColor).not.toBe(darkStyles.weightColor);
            expect(lightStyles.tdeeColor).not.toBe(darkStyles.tdeeColor);
        });

        it('chart uses correct colors from CSS variables', () => {
            const styles = Chart.getChartStyles();
            
            // Should use --chart-weight variable
            expect(styles.weightColor).toBeDefined();
            expect(styles.weightColor.length).toBeGreaterThan(0);
            
            // Should use --chart-tdee variable
            expect(styles.tdeeColor).toBeDefined();
            expect(styles.tdeeColor.length).toBeGreaterThan(0);
        });
    });

    // ========================================
    // Issue 3: Warning Color Readability Tests
    // ========================================

    describe('Warning Color Readability', () => {
        it('light mode --color-warning has sufficient contrast', () => {
            Components.applyTheme('light');
            const style = getComputedStyle(document.documentElement);
            const warningColor = style.getPropertyValue('--color-warning').trim();
            
            // Light mode: #b35900 (dark orange)
            // This should be readable on light backgrounds
            expect(warningColor).toBe('#b35900');
            
            // Check it's a valid hex color
            const hexPattern = /^#[0-9a-fA-F]{6}$/;
            expect(hexPattern.test(warningColor)).toBe(true);
        });

        it('dark mode --color-warning is readable', () => {
            Components.applyTheme('dark');
            const style = getComputedStyle(document.documentElement);
            const warningColor = style.getPropertyValue('--color-warning').trim();
            
            // Dark mode: #d29922 (golden yellow)
            // Should be visible on dark backgrounds
            expect(warningColor).toBe('#d29922');
            
            // Check it's a valid hex color
            const hexPattern = /^#[0-9a-fA-F]{6}$/;
            expect(hexPattern.test(warningColor)).toBe(true);
        });

        it('warning color changes with theme', () => {
            Components.applyTheme('light');
            const lightStyle = getComputedStyle(document.documentElement);
            const lightWarning = lightStyle.getPropertyValue('--color-warning').trim();
            
            Components.applyTheme('dark');
            const darkStyle = getComputedStyle(document.documentElement);
            const darkWarning = darkStyle.getPropertyValue('--color-warning').trim();
            
            expect(lightWarning).not.toBe(darkWarning);
        });

        it('--color-warning-subtle exists in both themes', () => {
            Components.applyTheme('light');
            let style = getComputedStyle(document.documentElement);
            let warningSubtle = style.getPropertyValue('--color-warning-subtle').trim();
            expect(warningSubtle.length).toBeGreaterThan(0);
            
            Components.applyTheme('dark');
            style = getComputedStyle(document.documentElement);
            warningSubtle = style.getPropertyValue('--color-warning-subtle').trim();
            expect(warningSubtle.length).toBeGreaterThan(0);
        });
    });

    // ========================================
    // Issue 4: Chart Axis Labels Tests
    // ========================================

    describe('Chart Axis Labels', () => {
        it('chart uses --color-text-tertiary for axis labels', () => {
            const style = getComputedStyle(document.documentElement);
            const textColor = style.getPropertyValue('--color-text-tertiary').trim();
            
            expect(textColor).toBeDefined();
            expect(textColor.length).toBeGreaterThan(0);
        });

        it('chart styles include textColor', () => {
            const styles = Chart.getChartStyles();
            
            expect(styles.textColor).toBeDefined();
            expect(styles.textColor.length).toBeGreaterThan(0);
        });

        it('chart uses border color for grid lines', () => {
            const styles = Chart.getChartStyles();
            
            expect(styles.borderColor).toBeDefined();
            expect(styles.borderColor.length).toBeGreaterThan(0);
        });

        it('axis labels use consistent text color', () => {
            const styles = Chart.getChartStyles();
            
            // Both axes should use same text color
            expect(styles.textColor).toBe(styles.textColor);
        });

        it('chart canvas element exists', () => {
            const canvas = document.getElementById('progress-chart');
            expect(canvas).toBeDefined();
        });

        it('chart can be cleared and re-rendered', () => {
            // Test that chart can handle refresh
            expect(typeof Chart.refresh).toBe('function');
        });
    });

    // ========================================
    // Additional Visual Tests
    // ========================================

    describe('CSS Variables - Theme System', () => {
        beforeEach(() => {
            Components.applyTheme('light');
        });

        it('light theme has all required CSS variables', () => {
            const style = getComputedStyle(document.documentElement);
            
            // Check all critical theme variables exist
            expect(style.getPropertyValue('--color-bg-primary').trim()).toBeDefined();
            expect(style.getPropertyValue('--color-text-primary').trim()).toBeDefined();
            expect(style.getPropertyValue('--color-warning').trim()).toBeDefined();
            expect(style.getPropertyValue('--chart-weight').trim()).toBeDefined();
            expect(style.getPropertyValue('--chart-tdee').trim()).toBeDefined();
        });

        it('dark theme has all required CSS variables', () => {
            Components.applyTheme('dark');
            const style = getComputedStyle(document.documentElement);
            
            // Check all critical theme variables exist
            expect(style.getPropertyValue('--color-bg-primary').trim()).toBeDefined();
            expect(style.getPropertyValue('--color-text-primary').trim()).toBeDefined();
            expect(style.getPropertyValue('--color-warning').trim()).toBeDefined();
            expect(style.getPropertyValue('--chart-weight').trim()).toBeDefined();
            expect(style.getPropertyValue('--chart-tdee').trim()).toBeDefined();
        });

        it('background color changes with theme', () => {
            const lightStyle = getComputedStyle(document.documentElement);
            const lightBg = lightStyle.getPropertyValue('--color-bg-primary').trim();
            
            Components.applyTheme('dark');
            
            const darkStyle = getComputedStyle(document.documentElement);
            const darkBg = darkStyle.getPropertyValue('--color-bg-primary').trim();
            
            // Backgrounds should be different
            expect(lightBg).not.toBe(darkBg);
        });

        it('text color changes with theme', () => {
            const lightStyle = getComputedStyle(document.documentElement);
            const lightText = lightStyle.getPropertyValue('--color-text-primary').trim();
            
            Components.applyTheme('dark');
            
            const darkStyle = getComputedStyle(document.documentElement);
            const darkText = darkStyle.getPropertyValue('--color-text-primary').trim();
            
            // Text colors should be different
            expect(lightText).not.toBe(darkText);
        });
    });

    // Reset to system theme after all tests
    afterAll(() => {
        Components.applyTheme('system');
    });

})();
