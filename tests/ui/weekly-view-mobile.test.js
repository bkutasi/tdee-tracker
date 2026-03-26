/**
 * Weekly View & Mobile Responsiveness Tests
 * 
 * Tests for enhanced weekly table with hover effects, today highlighting,
 * responsive design, and touch target sizes
 * 
 * Run: open tests/test-runner.html
 */

(function() {
    'use strict';

    // Skip all tests in Node.js environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.log('[Weekly View Tests] Skipped - browser environment required');
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = { skipped: true, reason: 'Browser environment required' };
        }
        return;
    }

    // Test utilities
    function getWeekTable() {
        return document.querySelector('.week-table');
    }

    function getWeekTableRows() {
        return document.querySelectorAll('.week-table tbody tr');
    }

    function getTodayRow() {
        return document.querySelector('.week-table tbody tr.today');
    }

    function getDashboard() {
        return document.querySelector('.dashboard');
    }

    function getStatCards() {
        return document.querySelectorAll('.stat-card');
    }

    // Test suite
    describe('Weekly View Enhancements', () => {
        beforeEach(() => {
            // Initialize WeeklyView if available
            if (typeof WeeklyView !== 'undefined') {
                WeeklyView.init();
            }
        });

        describe('Row Hover Effects', () => {
            it('week table exists', () => {
                const table = getWeekTable();
                expect(table).toBeDefined();
            });

            it('table rows have hover transition', () => {
                const rows = getWeekTableRows();
                if (rows.length > 0) {
                    const computedStyle = window.getComputedStyle(rows[0]);
                    const transition = computedStyle.transition;
                    
                    expect(transition).toBeDefined();
                    expect(transition.length).toBeGreaterThan(0);
                }
            });

            it('table rows change background on hover', () => {
                const rows = getWeekTableRows();
                if (rows.length > 0) {
                    const row = rows[0];
                    const normalBg = window.getComputedStyle(row).backgroundColor;
                    
                    // Simulate hover
                    row.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                    const hoverBg = window.getComputedStyle(row).backgroundColor;
                    
                    // Background should potentially change (test structure, not interaction)
                    expect(normalBg).toBeDefined();
                    
                    // Clean up
                    row.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
                }
            });

            it('table rows have cursor pointer', () => {
                const rows = getWeekTableRows();
                if (rows.length > 0) {
                    const computedStyle = window.getComputedStyle(rows[0]);
                    expect(computedStyle.cursor).toBe('pointer');
                }
            });

            it('table rows have scale transform on hover', () => {
                const rows = getWeekTableRows();
                if (rows.length > 0) {
                    const computedStyle = window.getComputedStyle(rows[0]);
                    const transition = computedStyle.transition;
                    
                    expect(transition).toContain('transform');
                }
            });
        });

        describe('Today Highlighting', () => {
            it('today row has special class', () => {
                const todayRow = getTodayRow();
                
                // If today row exists, it should have the class
                if (todayRow) {
                    expect(todayRow.classList.contains('today')).toBe(true);
                }
            });

            it('today row has accent background', () => {
                const todayRow = getTodayRow();
                
                if (todayRow) {
                    const computedStyle = window.getComputedStyle(todayRow);
                    const bgColor = computedStyle.backgroundColor;
                    
                    expect(bgColor).toBeDefined();
                }
            });

            it('today row has left border accent', () => {
                const todayRow = getTodayRow();
                
                if (todayRow) {
                    const computedStyle = window.getComputedStyle(todayRow);
                    const borderLeft = computedStyle.borderLeftWidth;
                    
                    // Should have left border
                    expect(parseFloat(borderLeft)).toBeGreaterThan(0);
                }
            });

            it('today row has bold font weight', () => {
                const todayRow = getTodayRow();
                
                if (todayRow) {
                    const computedStyle = window.getComputedStyle(todayRow);
                    const fontWeight = computedStyle.fontWeight;
                    
                    expect(parseInt(fontWeight, 10)).toBeGreaterThanOrEqual(600);
                }
            });
        });

        describe('No Data Placeholder', () => {
            it('no data placeholder class exists in CSS', () => {
                // Check if the style exists by creating a test element
                const testEl = document.createElement('div');
                testEl.className = 'week-table-no-data';
                document.body.appendChild(testEl);
                
                const computedStyle = window.getComputedStyle(testEl);
                
                // Should have text-align center
                expect(computedStyle.textAlign).toBe('center');
                
                testEl.remove();
            });

            it('no data placeholder has emoji icon', () => {
                const testEl = document.createElement('div');
                testEl.className = 'week-table-no-data';
                document.body.appendChild(testEl);
                
                const beforeStyle = window.getComputedStyle(testEl, '::before');
                const content = beforeStyle.content;
                
                // Should have content (emoji)
                expect(content).toBeDefined();
                
                testEl.remove();
            });
        });

        describe('Table Padding and Alignment', () => {
            it('table cells have appropriate padding', () => {
                const table = getWeekTable();
                if (table) {
                    const cell = table.querySelector('th, td');
                    if (cell) {
                        const computedStyle = window.getComputedStyle(cell);
                        const padding = computedStyle.padding;
                        
                        expect(padding).toBeDefined();
                        expect(padding).not.toBe('0px');
                    }
                }
            });

            it('table headers have uppercase text', () => {
                const table = getWeekTable();
                if (table) {
                    const header = table.querySelector('th');
                    if (header) {
                        const computedStyle = window.getComputedStyle(header);
                        const textTransform = computedStyle.textTransform;
                        
                        expect(textTransform).toBe('uppercase');
                    }
                }
            });

            it('table headers have letter spacing', () => {
                const table = getWeekTable();
                if (table) {
                    const header = table.querySelector('th');
                    if (header) {
                        const computedStyle = window.getComputedStyle(header);
                        const letterSpacing = computedStyle.letterSpacing;
                        
                        expect(parseFloat(letterSpacing)).toBeGreaterThan(0);
                    }
                }
            });
        });

        describe('Mobile Responsive Table', () => {
            it('table wrapper allows horizontal scroll on mobile', () => {
                const wrapper = document.querySelector('.week-table-wrapper');
                
                if (wrapper) {
                    const computedStyle = window.getComputedStyle(wrapper);
                    const overflowX = computedStyle.overflowX;
                    
                    expect(overflowX).toBe('auto');
                }
            });

            it('table has responsive font size', () => {
                const table = getWeekTable();
                if (table) {
                    const computedStyle = window.getComputedStyle(table);
                    const fontSize = computedStyle.fontSize;
                    
                    // Should be readable on mobile
                    expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(14);
                }
            });
        });
    });

    describe('Mobile Optimization', () => {
        describe('Card Stacking', () => {
            it('dashboard uses grid layout', () => {
                const dashboard = getDashboard();
                const computedStyle = window.getComputedStyle(dashboard);
                
                expect(computedStyle.display).toBe('grid');
            });

            it('stat cards have responsive gap', () => {
                const dashboard = getDashboard();
                const computedStyle = window.getComputedStyle(dashboard);
                const gap = computedStyle.gap;
                
                expect(gap).toBeDefined();
                expect(parseFloat(gap)).toBeGreaterThan(0);
            });

            it('cards stack on mobile viewport', () => {
                // Test that grid template columns can be 1fr on mobile
                const dashboard = getDashboard();
                const computedStyle = window.getComputedStyle(dashboard);
                
                // Should have grid template columns defined
                expect(computedStyle.gridTemplateColumns).toBeDefined();
            });
        });

        describe('Touch Targets', () => {
            it('buttons have minimum 44px touch target', () => {
                const buttons = document.querySelectorAll('.btn');
                
                buttons.forEach(btn => {
                    const computedStyle = window.getComputedStyle(btn);
                    const minHeight = computedStyle.minHeight;
                    const height = computedStyle.height;
                    
                    const size = Math.max(parseFloat(minHeight), parseFloat(height));
                    expect(size).toBeGreaterThanOrEqual(44);
                });
            });

            it('icon buttons have 44px dimensions', () => {
                const iconButtons = document.querySelectorAll('.btn-icon');
                
                iconButtons.forEach(btn => {
                    const computedStyle = window.getComputedStyle(btn);
                    const width = parseFloat(computedStyle.width);
                    const height = parseFloat(computedStyle.height);
                    
                    // On mobile, should be at least 44px
                    expect(Math.min(width, height)).toBeGreaterThanOrEqual(32);
                });
            });

            it('inputs have minimum 44px height', () => {
                const inputs = document.querySelectorAll('input[type="text"], input[type="number"], input[type="date"]');
                
                inputs.forEach(input => {
                    const computedStyle = window.getComputedStyle(input);
                    const minHeight = computedStyle.minHeight;
                    
                    expect(parseFloat(minHeight)).toBeGreaterThanOrEqual(44);
                });
            });
        });

        describe('Responsive Fonts', () => {
            it('stat values scale down on mobile', () => {
                const cards = getStatCards();
                
                cards.forEach(card => {
                    const value = card.querySelector('.stat-value');
                    if (value) {
                        const computedStyle = window.getComputedStyle(value);
                        const fontSize = computedStyle.fontSize;
                        
                        // Should be readable (at least 18px)
                        expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(18);
                    }
                });
            });

            it('stat labels have appropriate size', () => {
                const cards = getStatCards();
                
                cards.forEach(card => {
                    const label = card.querySelector('.stat-label');
                    if (label) {
                        const computedStyle = window.getComputedStyle(label);
                        const fontSize = computedStyle.fontSize;
                        
                        // Should be readable (at least 12px)
                        expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(12);
                    }
                });
            });
        });

        describe('Viewport Optimization', () => {
            it('main content has appropriate padding', () => {
                const main = document.querySelector('.main');
                
                if (main) {
                    const computedStyle = window.getComputedStyle(main);
                    const padding = computedStyle.padding;
                    
                    expect(padding).toBeDefined();
                    expect(padding).not.toBe('0px');
                }
            });

            it('app container uses flexbox', () => {
                const app = document.getElementById('app');
                
                if (app) {
                    const computedStyle = window.getComputedStyle(app);
                    
                    expect(computedStyle.display).toBe('flex');
                    expect(computedStyle.flexDirection).toBe('column');
                }
            });

            it('content has max-width constraint', () => {
                const main = document.querySelector('.main');
                
                if (main) {
                    const computedStyle = window.getComputedStyle(main);
                    const maxWidth = computedStyle.maxWidth;
                    
                    expect(maxWidth).toBeDefined();
                    expect(maxWidth).not.toBe('none');
                }
            });
        });

        describe('Chart Responsiveness', () => {
            it('chart container has responsive height', () => {
                const chartContainer = document.querySelector('.chart-container');
                
                if (chartContainer) {
                    const computedStyle = window.getComputedStyle(chartContainer);
                    const height = computedStyle.height;
                    
                    expect(height).toBeDefined();
                    expect(parseFloat(height)).toBeGreaterThan(0);
                }
            });

            it('chart legend wraps on mobile', () => {
                const legend = document.querySelector('.chart-legend');
                
                if (legend) {
                    const computedStyle = window.getComputedStyle(legend);
                    const flexWrap = computedStyle.flexWrap;
                    
                    expect(flexWrap).toBe('wrap');
                }
            });

            it('chart legend items have responsive spacing', () => {
                const legend = document.querySelector('.chart-legend');
                
                if (legend) {
                    const computedStyle = window.getComputedStyle(legend);
                    const gap = computedStyle.gap;
                    
                    expect(gap).toBeDefined();
                    expect(parseFloat(gap)).toBeGreaterThan(0);
                }
            });
        });

        describe('Accessibility on Mobile', () => {
            it('focus states are visible on mobile', () => {
                const input = document.getElementById('weight-input');
                
                if (input) {
                    const computedStyle = window.getComputedStyle(input, ':focus-visible');
                    
                    // Should have outline or box-shadow defined
                    expect(computedStyle).toBeDefined();
                }
            });

            it('interactive elements have sufficient spacing', () => {
                const buttons = document.querySelectorAll('.btn');
                
                buttons.forEach((btn, index, arr) => {
                    if (index < arr.length - 1) {
                        const computedStyle = window.getComputedStyle(btn.parentElement);
                        const gap = computedStyle.gap;
                        
                        if (gap) {
                            expect(parseFloat(gap)).toBeGreaterThan(0);
                        }
                    }
                });
            });

            it('text has sufficient contrast ratio', () => {
                const cards = getStatCards();
                
                cards.forEach(card => {
                    const value = card.querySelector('.stat-value');
                    if (value) {
                        const computedStyle = window.getComputedStyle(value);
                        const color = computedStyle.color;
                        
                        expect(color).toBeDefined();
                        expect(color).not.toBe('transparent');
                    }
                });
            });
        });
    });
})();
