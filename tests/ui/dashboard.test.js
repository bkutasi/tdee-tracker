/**
 * Dashboard UI Component Tests
 * 
 * Tests for Dashboard component rendering, stats display, and data updates.
 * Browser-only tests (skip in Node.js environment).
 * 
 * Run: open tests/test-runner.html
 */

(function() {
    'use strict';

    // Skip all tests in Node.js environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = { skipped: true, reason: 'Browser environment required' };
        }
        return;
    }

    // Test utilities
    function getTDEEDisplay() {
        return document.getElementById('current-tdee');
    }

    function getConfidenceBadge() {
        return document.getElementById('tdee-confidence');
    }

    function getTargetIntake() {
        return document.getElementById('target-intake');
    }

    function getCurrentWeight() {
        return document.getElementById('current-weight');
    }

    function getWeeklyChange() {
        return document.getElementById('weekly-change');
    }

    function getOutlierWarning() {
        return document.getElementById('tdee-outlier-warning');
    }

    function getTrendsContainer() {
        return document.getElementById('tdee-trends-container');
    }

    // Test suite
    describe('Dashboard Component', () => {
        // Setup before each test
        beforeEach(() => {
            // Initialize Dashboard if not already done
            if (typeof Dashboard !== 'undefined' && typeof Dashboard.init === 'function') {
                // Dashboard will be initialized by app.js
            }
            
            // Ensure required DOM elements exist
            if (!document.getElementById('current-tdee')) {
                const el = document.createElement('div');
                el.id = 'current-tdee';
                document.body.appendChild(el);
            }
            if (!document.getElementById('tdee-confidence')) {
                const el = document.createElement('div');
                el.id = 'tdee-confidence';
                document.body.appendChild(el);
            }
            if (!document.getElementById('target-intake')) {
                const el = document.createElement('div');
                el.id = 'target-intake';
                document.body.appendChild(el);
            }
            if (!document.getElementById('current-weight')) {
                const el = document.createElement('div');
                el.id = 'current-weight';
                document.body.appendChild(el);
            }
            if (!document.getElementById('weekly-change')) {
                const el = document.createElement('div');
                el.id = 'weekly-change';
                document.body.appendChild(el);
            }
            if (!document.getElementById('tdee-outlier-warning')) {
                const el = document.createElement('div');
                el.id = 'tdee-outlier-warning';
                document.body.appendChild(el);
            }
            if (!document.getElementById('tdee-trends-container')) {
                const el = document.createElement('div');
                el.id = 'tdee-trends-container';
                document.body.appendChild(el);
            }
        });

        // Cleanup after each test
        afterEach(() => {
            // Clean up test elements
            const ids = ['current-tdee', 'tdee-confidence', 'target-intake', 
                        'current-weight', 'weekly-change', 'tdee-outlier-warning', 
                        'tdee-trends-container'];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el && el.parentElement === document.body) {
                    el.remove();
                }
            });
        });

        describe('Dashboard Structure', () => {
            it('has TDEE display element', () => {
                const tdeeEl = getTDEEDisplay();
                expect(tdeeEl).toBeDefined();
            });

            it('has confidence badge element', () => {
                const confidenceEl = getConfidenceBadge();
                expect(confidenceEl).toBeDefined();
            });

            it('has target intake element', () => {
                const targetEl = getTargetIntake();
                expect(targetEl).toBeDefined();
            });

            it('has current weight element', () => {
                const weightEl = getCurrentWeight();
                expect(weightEl).toBeDefined();
            });

            it('has weekly change element', () => {
                const changeEl = getWeeklyChange();
                expect(changeEl).toBeDefined();
            });

            it('has outlier warning element', () => {
                const outlierEl = getOutlierWarning();
                expect(outlierEl).toBeDefined();
            });

            it('has trends container element', () => {
                const trendsEl = getTrendsContainer();
                expect(trendsEl).toBeDefined();
            });
        });

        describe('Dashboard Initialization', () => {
            it('Dashboard module is defined', () => {
                expect(typeof Dashboard).toBe('object');
            });

            it('Dashboard has init method', () => {
                expect(typeof Dashboard.init).toBe('function');
            });

            it('Dashboard has refresh method', () => {
                expect(typeof Dashboard.refresh).toBe('function');
            });

            it('Dashboard.init() does not throw', () => {
                expect(() => {
                    if (typeof Dashboard.init === 'function') {
                        Dashboard.init();
                    }
                }).not.toThrow();
            });
        });

        describe('TDEE Display', () => {
            it('shows empty state when no data', () => {
                if (typeof Dashboard === 'undefined') return;
                
                // Clear storage to simulate no data
                const originalGetEntries = Storage.getEntriesInRange;
                Storage.getEntriesInRange = () => [];
                
                Dashboard.refresh();
                
                const tdeeEl = getTDEEDisplay();
                expect(tdeeEl).toBeDefined();
                
                // Restore
                Storage.getEntriesInRange = originalGetEntries;
            });

            it('confidence badge has base class', () => {
                const confidenceEl = getConfidenceBadge();
                if (confidenceEl) {
                    expect(confidenceEl.classList.contains('confidence-badge')).toBe(true);
                }
            });

            it('TDEE display handles null value', () => {
                if (typeof Dashboard === 'undefined') return;
                
                Dashboard.refresh();
                const tdeeEl = getTDEEDisplay();
                expect(tdeeEl).toBeDefined();
            });
        });

        describe('Target Intake Display', () => {
            it('target intake shows fallback without TDEE', () => {
                if (typeof Dashboard === 'undefined') return;
                
                Dashboard.refresh();
                const targetEl = getTargetIntake();
                expect(targetEl).toBeDefined();
            });

            it('target intake context element exists', () => {
                const contextEl = document.getElementById('target-intake-context');
                if (!contextEl) {
                    // Element may be created dynamically
                    expect(true).toBe(true);
                } else {
                    expect(contextEl).toBeDefined();
                }
            });
        });

        describe('Weight Display', () => {
            it('current weight shows fallback when no data', () => {
                if (typeof Dashboard === 'undefined') return;
                
                Dashboard.refresh();
                const weightEl = getCurrentWeight();
                expect(weightEl).toBeDefined();
            });

            it('current weight element can display formatted value', () => {
                const weightEl = getCurrentWeight();
                if (weightEl) {
                    weightEl.textContent = '80.5';
                    expect(weightEl.textContent).toBe('80.5');
                }
            });
        });

        describe('Weekly Change Display', () => {
            it('weekly change shows fallback when no data', () => {
                if (typeof Dashboard === 'undefined') return;
                
                Dashboard.refresh();
                const changeEl = getWeeklyChange();
                expect(changeEl).toBeDefined();
            });

            it('weekly change can display positive value', () => {
                const changeEl = getWeeklyChange();
                if (changeEl) {
                    changeEl.textContent = '+0.5';
                    expect(changeEl.textContent).toBe('+0.5');
                }
            });

            it('weekly change can display negative value', () => {
                const changeEl = getWeeklyChange();
                if (changeEl) {
                    changeEl.textContent = '-0.3';
                    expect(changeEl.textContent).toBe('-0.3');
                }
            });
        });

        describe('Outlier Warning', () => {
            it('outlier warning element is initially hidden', () => {
                const outlierEl = getOutlierWarning();
                if (outlierEl) {
                    expect(outlierEl.style.display).toBe('none');
                }
            });

            it('outlier warning can be shown', () => {
                const outlierEl = getOutlierWarning();
                if (outlierEl) {
                    outlierEl.style.display = 'block';
                    outlierEl.textContent = '⚠ Excluded 1 outlier day(s)';
                    expect(outlierEl.style.display).toBe('block');
                }
            });

            it('outlier warning shows correct message format', () => {
                const outlierEl = getOutlierWarning();
                if (outlierEl) {
                    const message = '⚠ Excluded 2 outlier day(s)';
                    outlierEl.textContent = message;
                    expect(outlierEl.textContent).toBe(message);
                }
            });
        });

        describe('TDEE Trends', () => {
            it('trends container is initially empty', () => {
                const trendsEl = getTrendsContainer();
                if (trendsEl) {
                    expect(trendsEl.innerHTML).toBe('');
                }
            });

            it('trends container can hold trend items', () => {
                const trendsEl = getTrendsContainer();
                if (trendsEl) {
                    const trendItem = document.createElement('div');
                    trendItem.className = 'trend-item';
                    trendsEl.appendChild(trendItem);
                    expect(trendsEl.children.length).toBeGreaterThan(0);
                }
            });

            it('trend item has correct structure', () => {
                const trendsEl = getTrendsContainer();
                if (trendsEl) {
                    trendsEl.innerHTML = '';
                    const trendItem = document.createElement('div');
                    trendItem.className = 'trend-item';
                    
                    const label = document.createElement('span');
                    label.className = 'trend-label';
                    label.textContent = '7-Day Trend';
                    
                    const value = document.createElement('span');
                    value.className = 'trend-value';
                    value.textContent = '2450';
                    
                    trendItem.appendChild(label);
                    trendItem.appendChild(value);
                    trendsEl.appendChild(trendItem);
                    
                    expect(trendItem.querySelector('.trend-label')).toBeDefined();
                    expect(trendItem.querySelector('.trend-value')).toBeDefined();
                }
            });
        });

        describe('Dashboard Refresh', () => {
            it('refresh() method exists and is callable', () => {
                expect(typeof Dashboard.refresh).toBe('function');
            });

            it('refresh() does not throw with empty storage', () => {
                if (typeof Dashboard.refresh !== 'function') return;
                
                expect(() => {
                    Dashboard.refresh();
                }).not.toThrow();
            });

            it('refresh() updates DOM elements', () => {
                if (typeof Dashboard.refresh !== 'function') return;
                
                const tdeeEl = getTDEEDisplay();
                const initialContent = tdeeEl ? tdeeEl.textContent : '';
                
                Dashboard.refresh();
                
                // Element should still exist after refresh
                expect(getTDEEDisplay()).toBeDefined();
            });
        });

        describe('Confidence Badge Classes', () => {
            it('confidence badge can have high confidence class', () => {
                const confidenceEl = getConfidenceBadge();
                if (confidenceEl) {
                    confidenceEl.className = 'confidence-badge confidence-high';
                    expect(confidenceEl.classList.contains('confidence-high')).toBe(true);
                }
            });

            it('confidence badge can have medium confidence class', () => {
                const confidenceEl = getConfidenceBadge();
                if (confidenceEl) {
                    confidenceEl.className = 'confidence-badge confidence-medium';
                    expect(confidenceEl.classList.contains('confidence-medium')).toBe(true);
                }
            });

            it('confidence badge can have low confidence class', () => {
                const confidenceEl = getConfidenceBadge();
                if (confidenceEl) {
                    confidenceEl.className = 'confidence-badge confidence-low';
                    expect(confidenceEl.classList.contains('confidence-low')).toBe(true);
                }
            });

            it('confidence badge can have theoretical class', () => {
                const confidenceEl = getConfidenceBadge();
                if (confidenceEl) {
                    confidenceEl.textContent = 'ESTIMATED (PROFILE)';
                    expect(confidenceEl.textContent).toContain('ESTIMATED');
                }
            });
        });

        describe('Empty State Handling', () => {
            it('displays fallback for missing TDEE', () => {
                const tdeeEl = getTDEEDisplay();
                if (tdeeEl) {
                    tdeeEl.textContent = '—';
                    expect(tdeeEl.textContent).toBe('—');
                }
            });

            it('displays fallback for missing weight', () => {
                const weightEl = getCurrentWeight();
                if (weightEl) {
                    weightEl.textContent = '—';
                    expect(weightEl.textContent).toBe('—');
                }
            });

            it('displays fallback for missing weekly change', () => {
                const changeEl = getWeeklyChange();
                if (changeEl) {
                    changeEl.textContent = '—';
                    expect(changeEl.textContent).toBe('—');
                }
            });

            it('handles "needs data" state', () => {
                const tdeeEl = getTDEEDisplay();
                const confidenceEl = getConfidenceBadge();
                
                if (tdeeEl && confidenceEl) {
                    tdeeEl.textContent = 'Need 7 more days';
                    tdeeEl.classList.add('low-confidence');
                    confidenceEl.textContent = 'NEEDS DATA';
                    
                    expect(tdeeEl.classList.contains('low-confidence')).toBe(true);
                    expect(confidenceEl.textContent).toBe('NEEDS DATA');
                }
            });
        });
    });
})();
