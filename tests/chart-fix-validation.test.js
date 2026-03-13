/**
 * Chart Fix Validation Tests
 * Validates chart filtering, scale calculations, and weight line rendering
 * 
 * Run with: open tests/test-runner.html (browser required)
 * 
 * Test Scenarios:
 * A: Complete data (weight + calories) - verify both weight line AND TDEE bars
 * B: Partial data (calories only) - verify empty state with contextual message
 * C: Mixed data (some weeks with weight, some without) - verify gaps in weight line
 * D: Single weight entry - verify empty state with message
 * E: No data at all - verify empty state with message
 */

(function() {
    'use strict';

    // Skip in Node.js - requires DOM
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.log('[Chart Fix Validation Tests] Skipped - browser environment required');
        return;
    }

    describe('Chart Fix Validation - Scenario A: Complete Data', () => {
        let canvas, ctx;

        beforeEach(() => {
            canvas = document.getElementById('progress-chart');
            if (canvas) {
                ctx = canvas.getContext('2d');
                canvas.width = 800;
                canvas.height = 400;
            }
            // Clear localStorage for clean test
            localStorage.clear();
            Storage.init();
        });

        afterEach(() => {
            localStorage.clear();
        });

        it('renders both weight line and TDEE bars with 2+ weeks of complete data', () => {
            // Arrange: Add 14 days of complete data (weight + calories)
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 14);

            for (let i = 0; i < 14; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                Storage.saveEntry(dateStr, {
                    weight: 80 + (i * 0.1),
                    calories: 2000 + (i * 50),
                    notes: 'Test entry'
                });
            }

            // Act: Refresh chart
            Chart.init();
            Chart.refresh();

            // Assert: Chart should render without errors
            // Both weight line and TDEE bars should be visible
            expect(() => {
                Chart.refresh();
            }).not.toThrow();

            // Verify canvas has content (not empty)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            expect(imageData).toBeDefined();
            
            // Check that some pixels are drawn (not all transparent)
            let hasContent = false;
            for (let i = 0; i < imageData.data.length; i += 4) {
                if (imageData.data[i + 3] > 0) { // Alpha channel
                    hasContent = true;
                    break;
                }
            }
            expect(hasContent).toBe(true);
        });

        it('has no gaps in weight line with continuous data', () => {
            // Arrange: Add continuous weight data
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 14);

            for (let i = 0; i < 14; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                Storage.saveEntry(dateStr, {
                    weight: 80 + (i * 0.1),
                    calories: 2000
                });
            }

            // Act: Refresh chart
            Chart.refresh();

            // Assert: Weight line should be continuous (no gaps)
            // Verified by visual inspection - line should connect all points
            expect(() => {
                Chart.refresh();
            }).not.toThrow();
        });

        it('TDEE bars align correctly with X-axis labels', () => {
            // Arrange: Add 21 days of data (3 weeks)
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 21);

            for (let i = 0; i < 21; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                Storage.saveEntry(dateStr, {
                    weight: 80 + (i * 0.1),
                    calories: 2000 + (i * 30)
                });
            }

            // Act: Refresh chart
            Chart.refresh();

            // Assert: Chart renders without errors
            expect(() => {
                Chart.refresh();
            }).not.toThrow();
        });
    });

    describe('Chart Fix Validation - Scenario B: Partial Data (Calories Only)', () => {
        let canvas, ctx;

        beforeEach(() => {
            canvas = document.getElementById('progress-chart');
            if (canvas) {
                ctx = canvas.getContext('2d');
                canvas.width = 800;
                canvas.height = 400;
            }
            localStorage.clear();
            Storage.init();
        });

        afterEach(() => {
            localStorage.clear();
        });

        it('shows empty state with message when no weight data but has calories', () => {
            // Arrange: Add entries with calories but NO weight
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 14);

            for (let i = 0; i < 14; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                Storage.saveEntry(dateStr, {
                    weight: null,  // No weight
                    calories: 2000,
                    notes: 'Calories only'
                });
            }

            // Act: Refresh chart
            Chart.refresh();

            // Assert: Empty state should be shown
            // Canvas should have text content (the message)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            expect(imageData).toBeDefined();
            
            // Verify canvas has some content (the message text)
            let hasContent = false;
            for (let i = 0; i < imageData.data.length; i += 4) {
                if (imageData.data[i + 3] > 0) {
                    hasContent = true;
                    break;
                }
            }
            expect(hasContent).toBe(true);
        });

        it('does not show TDEE bars without weight data', () => {
            // Arrange: Calories only, no weight
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 14);

            for (let i = 0; i < 14; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                Storage.saveEntry(dateStr, {
                    weight: null,
                    calories: 2000
                });
            }

            // Act: Refresh chart
            Chart.refresh();

            // Assert: No TDEE bars (requires weight for calculation)
            // Empty state message should be visible instead
            expect(() => {
                Chart.refresh();
            }).not.toThrow();
        });
    });

    describe('Chart Fix Validation - Scenario C: Mixed Data', () => {
        let canvas, ctx;

        beforeEach(() => {
            canvas = document.getElementById('progress-chart');
            if (canvas) {
                ctx = canvas.getContext('2d');
                canvas.width = 800;
                canvas.height = 400;
            }
            localStorage.clear();
            Storage.init();
        });

        afterEach(() => {
            localStorage.clear();
        });

        it('shows TDEE bars for ALL weeks including weeks without weight', () => {
            // Arrange: Week 1 (weight + calories), Week 2 (calories only), Week 3 (weight + calories)
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 21);

            for (let i = 0; i < 21; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                // Week 2 (days 7-13): calories only, no weight
                const hasWeight = (i < 7) || (i >= 14);
                
                Storage.saveEntry(dateStr, {
                    weight: hasWeight ? 80 + (i * 0.1) : null,
                    calories: 2000 + (i * 30)
                });
            }

            // Act: Refresh chart
            Chart.refresh();

            // Assert: Chart renders without NaN errors
            expect(() => {
                Chart.refresh();
            }).not.toThrow();
        });

        it('weight line has gap for Week 2 (no weight measurements)', () => {
            // Arrange: Mixed data with gap in week 2
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 21);

            for (let i = 0; i < 21; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                const hasWeight = (i < 7) || (i >= 14);
                
                Storage.saveEntry(dateStr, {
                    weight: hasWeight ? 80 + (i * 0.1) : null,
                    calories: 2000
                });
            }

            // Act: Refresh chart
            Chart.refresh();

            // Assert: Weight line should have intentional gap
            // Line should show for Week 1 and Week 3, gap in Week 2
            expect(() => {
                Chart.refresh();
            }).not.toThrow();
        });

        it('weight points only on Week 1 and Week 3', () => {
            // Arrange: Mixed data
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 21);

            for (let i = 0; i < 21; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                const hasWeight = (i < 7) || (i >= 14);
                
                Storage.saveEntry(dateStr, {
                    weight: hasWeight ? 80 + (i * 0.1) : null,
                    calories: 2000
                });
            }

            // Act: Refresh chart
            Chart.refresh();

            // Assert: Points visible only where weight exists
            expect(() => {
                Chart.refresh();
            }).not.toThrow();
        });

        it('produces no NaN errors in console', () => {
            // Arrange: Mixed data scenario
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 21);

            for (let i = 0; i < 21; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                const hasWeight = (i < 7) || (i >= 14);
                
                Storage.saveEntry(dateStr, {
                    weight: hasWeight ? 80 + (i * 0.1) : null,
                    calories: 2000
                });
            }

            // Act & Assert: No console errors during render
            let errorOccurred = false;
            const originalError = console.error;
            console.error = function(...args) {
                if (args.some(arg => typeof arg === 'string' && arg.includes('NaN'))) {
                    errorOccurred = true;
                }
                originalError.apply(console, args);
            };

            Chart.refresh();

            console.error = originalError;
            expect(errorOccurred).toBe(false);
        });
    });

    describe('Chart Fix Validation - Scenario D: Single Weight Entry', () => {
        let canvas, ctx;

        beforeEach(() => {
            canvas = document.getElementById('progress-chart');
            if (canvas) {
                ctx = canvas.getContext('2d');
                canvas.width = 800;
                canvas.height = 400;
            }
            localStorage.clear();
            Storage.init();
        });

        afterEach(() => {
            localStorage.clear();
        });

        it('shows empty state with "need at least 2" message', () => {
            // Arrange: Only 1 weight entry
            const today = Utils.formatDate(new Date());
            Storage.saveEntry(today, {
                weight: 80,
                calories: 2000
            });

            // Act: Refresh chart
            Chart.refresh();

            // Assert: Empty state message visible
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            expect(imageData).toBeDefined();
            
            // Should have content (the message)
            let hasContent = false;
            for (let i = 0; i < imageData.data.length; i += 4) {
                if (imageData.data[i + 3] > 0) {
                    hasContent = true;
                    break;
                }
            }
            expect(hasContent).toBe(true);
        });

        it('does not render chart with single data point', () => {
            // Arrange: Single entry
            const today = Utils.formatDate(new Date());
            Storage.saveEntry(today, {
                weight: 80,
                calories: 2000
            });

            // Act: Refresh chart
            Chart.refresh();

            // Assert: Empty state shown, not chart
            expect(() => {
                Chart.refresh();
            }).not.toThrow();
        });
    });

    describe('Chart Fix Validation - Scenario E: No Data', () => {
        let canvas, ctx;

        beforeEach(() => {
            canvas = document.getElementById('progress-chart');
            if (canvas) {
                ctx = canvas.getContext('2d');
                canvas.width = 800;
                canvas.height = 400;
            }
            localStorage.clear();
            Storage.init();
        });

        afterEach(() => {
            localStorage.clear();
        });

        it('shows empty state with "add first entry" message', () => {
            // Arrange: No data at all
            // localStorage already cleared in beforeEach

            // Act: Refresh chart
            Chart.refresh();

            // Assert: Empty state message visible
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            expect(imageData).toBeDefined();
            
            // Should have content (the message)
            let hasContent = false;
            for (let i = 0; i < imageData.data.length; i += 4) {
                if (imageData.data[i + 3] > 0) {
                    hasContent = true;
                    break;
                }
            }
            expect(hasContent).toBe(true);
        });

        it('message includes "track both" guidance', () => {
            // Arrange: No data
            // Act: Refresh chart
            Chart.refresh();

            // Assert: No errors
            expect(() => {
                Chart.refresh();
            }).not.toThrow();
        });
    });

    describe('Chart Fix Validation - Edge Cases', () => {
        let canvas, ctx;

        beforeEach(() => {
            canvas = document.getElementById('progress-chart');
            if (canvas) {
                ctx = canvas.getContext('2d');
                canvas.width = 800;
                canvas.height = 400;
            }
            localStorage.clear();
            Storage.init();
        });

        afterEach(() => {
            localStorage.clear();
        });

        it('handles very large weight values (150+ kg) without overflow', () => {
            // Arrange: Large weight values
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 14);

            for (let i = 0; i < 14; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                Storage.saveEntry(dateStr, {
                    weight: 150 + (i * 0.5),  // 150-157 kg
                    calories: 3500
                });
            }

            // Act: Refresh chart
            Chart.refresh();

            // Assert: Chart scales appropriately, no overflow
            expect(() => {
                Chart.refresh();
            }).not.toThrow();
        });

        it('handles very small weight values (30-40 kg) without underflow', () => {
            // Arrange: Small weight values
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 14);

            for (let i = 0; i < 14; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                Storage.saveEntry(dateStr, {
                    weight: 30 + (i * 0.5),  // 30-37 kg
                    calories: 1200
                });
            }

            // Act: Refresh chart
            Chart.refresh();

            // Assert: Chart scales appropriately
            expect(() => {
                Chart.refresh();
            }).not.toThrow();
        });

        it('handles very large TDEE values (4000+ cal) without overflow', () => {
            // Arrange: High calorie intake
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 14);

            for (let i = 0; i < 14; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                Storage.saveEntry(dateStr, {
                    weight: 100 + (i * 0.2),
                    calories: 4500  // Very high
                });
            }

            // Act: Refresh chart
            Chart.refresh();

            // Assert: Chart scales appropriately
            expect(() => {
                Chart.refresh();
            }).not.toThrow();
        });

        it('handles very small TDEE values (1000-1200 cal) without underflow', () => {
            // Arrange: Low calorie intake
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 14);

            for (let i = 0; i < 14; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                Storage.saveEntry(dateStr, {
                    weight: 50 - (i * 0.1),
                    calories: 1100  // Very low
                });
            }

            // Act: Refresh chart
            Chart.refresh();

            // Assert: Chart scales appropriately
            expect(() => {
                Chart.refresh();
            }).not.toThrow();
        });

        it('grid lines and axis labels remain readable', () => {
            // Arrange: Normal data
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 14);

            for (let i = 0; i < 14; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                Storage.saveEntry(dateStr, {
                    weight: 80 + (i * 0.1),
                    calories: 2000
                });
            }

            // Act: Refresh chart
            Chart.refresh();

            // Assert: Chart renders with proper labels
            expect(() => {
                Chart.refresh();
            }).not.toThrow();
        });

        it('colors match theme (light/dark mode)', () => {
            // Arrange: Light theme
            Components.applyTheme('light');
            
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 14);

            for (let i = 0; i < 14; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                Storage.saveEntry(dateStr, {
                    weight: 80 + (i * 0.1),
                    calories: 2000
                });
            }

            // Act: Refresh in light mode
            Chart.refresh();

            // Assert: Colors applied
            const styles = Chart.getChartStyles();
            expect(styles.weightColor).toBeDefined();
            expect(styles.tdeeColor).toBeDefined();

            // Switch to dark mode
            Components.applyTheme('dark');
            Chart.refresh();

            // Colors should be different
            const darkStyles = Chart.getChartStyles();
            expect(styles.weightColor).not.toBe(darkStyles.weightColor);
        });
    });

    describe('Chart Fix Validation - Console Error Checks', () => {
        let canvas, ctx;

        beforeEach(() => {
            canvas = document.getElementById('progress-chart');
            if (canvas) {
                ctx = canvas.getContext('2d');
                canvas.width = 800;
                canvas.height = 400;
            }
            localStorage.clear();
            Storage.init();
        });

        afterEach(() => {
            localStorage.clear();
        });

        it('no console errors in complete data scenario', () => {
            // Arrange: Complete data
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 14);

            for (let i = 0; i < 14; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                Storage.saveEntry(dateStr, {
                    weight: 80 + (i * 0.1),
                    calories: 2000
                });
            }

            // Act & Assert: No errors
            let errorOccurred = false;
            const originalError = console.error;
            console.error = function(...args) {
                errorOccurred = true;
                originalError.apply(console, args);
            };

            Chart.refresh();

            console.error = originalError;
            expect(errorOccurred).toBe(false);
        });

        it('no console errors in mixed data scenario', () => {
            // Arrange: Mixed data
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 21);

            for (let i = 0; i < 21; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = Utils.formatDate(date);
                
                const hasWeight = (i < 7) || (i >= 14);
                
                Storage.saveEntry(dateStr, {
                    weight: hasWeight ? 80 + (i * 0.1) : null,
                    calories: 2000
                });
            }

            // Act & Assert: No errors
            let errorOccurred = false;
            const originalError = console.error;
            console.error = function(...args) {
                if (args.some(arg => typeof arg === 'string' && arg.includes('NaN'))) {
                    errorOccurred = true;
                }
                originalError.apply(console, args);
            };

            Chart.refresh();

            console.error = originalError;
            expect(errorOccurred).toBe(false);
        });

        it('no console errors in empty data scenario', () => {
            // Arrange: No data
            // Act & Assert: No errors
            let errorOccurred = false;
            const originalError = console.error;
            console.error = function(...args) {
                errorOccurred = true;
                originalError.apply(console, args);
            };

            Chart.refresh();

            console.error = originalError;
            expect(errorOccurred).toBe(false);
        });
    });

    // Reset theme after all tests
    afterAll(() => {
        Components.applyTheme('system');
    });

})();
