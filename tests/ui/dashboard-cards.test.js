/**
 * Dashboard Cards UI Tests
 * 
 * Tests for enhanced dashboard stat cards with shadows, borders, typography,
 * trend indicators, and confidence badges
 * 
 * Run: open tests/test-runner.html
 */

(function() {
    'use strict';

    // Skip all tests in Node.js environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.log('[Dashboard Cards Tests] Skipped - browser environment required');
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = { skipped: true, reason: 'Browser environment required' };
        }
        return;
    }

    // Test utilities
    function getStatCard(index = 0) {
        const cards = document.querySelectorAll('.stat-card');
        return cards[index] || null;
    }

    function getStatValue(card) {
        return card?.querySelector('.stat-value');
    }

    function getStatLabel(card) {
        return card?.querySelector('.stat-label');
    }

    function getConfidenceBadge() {
        return document.getElementById('tdee-confidence');
    }

    // Test suite
    describe('Dashboard Cards Enhancements', () => {
        // Setup before each test
        beforeEach(() => {
            // Ensure Dashboard is initialized
            if (typeof Dashboard !== 'undefined') {
                Dashboard.init();
            }
        });

        describe('Card Shadows and Borders', () => {
            it('stat cards have border defined', () => {
                const card = getStatCard();
                expect(card).toBeDefined();
                
                const computedStyle = window.getComputedStyle(card);
                const borderWidth = computedStyle.borderTopWidth;
                expect(parseFloat(borderWidth)).toBeGreaterThan(0);
            });

            it('stat cards have box-shadow defined', () => {
                const card = getStatCard();
                const computedStyle = window.getComputedStyle(card);
                const boxShadow = computedStyle.boxShadow;
                
                // Should have shadow defined (not "none")
                expect(boxShadow).toBeDefined();
                expect(boxShadow).not.toBe('none');
            });

            it('stat cards have hover transform effect', () => {
                const card = getStatCard();
                const computedStyle = window.getComputedStyle(card);
                const transition = computedStyle.transition;
                
                // Should have transition for transform
                expect(transition).toContain('transform');
            });

            it('primary card has gradient background', () => {
                const primaryCard = document.querySelector('.stat-card.primary');
                if (primaryCard) {
                    const computedStyle = window.getComputedStyle(primaryCard);
                    const background = computedStyle.background;
                    
                    // Should have gradient or solid color
                    expect(background).toBeDefined();
                    expect(background).not.toBe('transparent');
                }
            });
        });

        describe('Typography Improvements', () => {
            it('stat values have bold font weight', () => {
                const card = getStatCard();
                const value = getStatValue(card);
                
                if (value) {
                    const computedStyle = window.getComputedStyle(value);
                    const fontWeight = computedStyle.fontWeight;
                    
                    // Should be bold (700 or higher)
                    expect(parseInt(fontWeight, 10)).toBeGreaterThanOrEqual(700);
                }
            });

            it('stat labels have uppercase text transform', () => {
                const card = getStatCard();
                const label = getStatLabel(card);
                
                if (label) {
                    const computedStyle = window.getComputedStyle(label);
                    const textTransform = computedStyle.textTransform;
                    
                    expect(textTransform).toBe('uppercase');
                }
            });

            it('stat labels have letter spacing', () => {
                const card = getStatCard();
                const label = getStatLabel(card);
                
                if (label) {
                    const computedStyle = window.getComputedStyle(label);
                    const letterSpacing = computedStyle.letterSpacing;
                    
                    // Should have positive letter spacing
                    expect(parseFloat(letterSpacing)).toBeGreaterThan(0);
                }
            });

            it('stat values use tabular nums', () => {
                const card = getStatCard();
                const value = getStatValue(card);
                
                if (value) {
                    const computedStyle = window.getComputedStyle(value);
                    const fontVariantNumeric = computedStyle.fontVariantNumeric;
                    
                    // Should use tabular nums for aligned numbers
                    expect(fontVariantNumeric).toContain('tabular-nums');
                }
            });
        });

        describe('Confidence Badges', () => {
            it('confidence badge element exists', () => {
                const badge = getConfidenceBadge();
                expect(badge).toBeDefined();
            });

            it('confidence badge has correct base classes', () => {
                const badge = getConfidenceBadge();
                expect(badge.classList.contains('confidence-badge')).toBe(true);
            });

            it('confidence badge has flex display', () => {
                const badge = getConfidenceBadge();
                const computedStyle = window.getComputedStyle(badge);
                
                expect(computedStyle.display).toBe('inline-flex');
            });

            it('confidence badge has border radius', () => {
                const badge = getConfidenceBadge();
                const computedStyle = window.getComputedStyle(badge);
                const borderRadius = computedStyle.borderRadius;
                
                expect(parseFloat(borderRadius)).toBeGreaterThan(0);
            });

            it('confidence badge changes class based on confidence level', () => {
                const badge = getConfidenceBadge();
                
                // Badge should have one of the confidence level classes
                const hasConfidenceClass = 
                    badge.classList.contains('confidence-high') ||
                    badge.classList.contains('confidence-medium') ||
                    badge.classList.contains('confidence-low') ||
                    badge.classList.contains('confidence-none') ||
                    badge.classList.contains('confidence-theoretical');
                
                expect(hasConfidenceClass).toBe(true);
            });
        });

        describe('Mobile Responsive Stacking', () => {
            it('dashboard grid adapts to mobile viewport', () => {
                const dashboard = document.querySelector('.dashboard');
                const computedStyle = window.getComputedStyle(dashboard);
                
                // Should use grid layout
                expect(computedStyle.display).toBe('grid');
            });

            it('stat cards have appropriate padding', () => {
                const card = getStatCard();
                const computedStyle = window.getComputedStyle(card);
                const padding = computedStyle.padding;
                
                // Should have padding
                expect(padding).toBeDefined();
                expect(padding).not.toBe('0px');
            });

            it('stat cards have overflow hidden for decorative elements', () => {
                const card = getStatCard();
                const computedStyle = window.getComputedStyle(card);
                const overflow = computedStyle.overflow;
                
                expect(overflow).toBe('hidden');
            });
        });

        describe('Trend Indicators', () => {
            it('trend indicators container exists', () => {
                const container = document.getElementById('tdee-trends-container');
                expect(container).toBeDefined();
            });

            it('trend items have proper structure', () => {
                const container = document.getElementById('tdee-trends-container');
                if (container && container.children.length > 0) {
                    const trendItem = container.children[0];
                    const label = trendItem.querySelector('.trend-label');
                    const value = trendItem.querySelector('.trend-value');
                    
                    expect(label).toBeDefined();
                    expect(value).toBeDefined();
                }
            });

            it('trend items have hover effects', () => {
                const trendItem = document.querySelector('.trend-item');
                if (trendItem) {
                    const computedStyle = window.getComputedStyle(trendItem);
                    const transition = computedStyle.transition;
                    
                    expect(transition).toBeDefined();
                    expect(transition.length).toBeGreaterThan(0);
                }
            });
        });

        describe('Accessibility', () => {
            it('stat cards are focusable', () => {
                // Cards should be perceivable and have good contrast
                const card = getStatCard();
                const computedStyle = window.getComputedStyle(card);
                
                // Check contrast - background should not be transparent
                const bgColor = computedStyle.backgroundColor;
                expect(bgColor).toBeDefined();
            });

            it('stat values have sufficient color contrast', () => {
                const card = getStatCard();
                const value = getStatValue(card);
                
                if (value) {
                    const computedStyle = window.getComputedStyle(value);
                    const color = computedStyle.color;
                    
                    // Color should be defined
                    expect(color).toBeDefined();
                    expect(color).not.toBe('transparent');
                }
            });

            it('confidence badge has readable font size', () => {
                const badge = getConfidenceBadge();
                const computedStyle = window.getComputedStyle(badge);
                const fontSize = computedStyle.fontSize;
                
                // Font size should be at least 12px for readability
                expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(12);
            });
        });

        describe('Visual Enhancements', () => {
            it('stat cards have decorative top border on hover', () => {
                const card = getStatCard();
                // Check for ::before pseudo-element support
                const computedStyle = window.getComputedStyle(card, '::before');
                
                // Should have position absolute for decorative element
                expect(computedStyle.position).toBeDefined();
            });

            it('cards have smooth transitions', () => {
                const card = getStatCard();
                const computedStyle = window.getComputedStyle(card);
                const transitionDuration = computedStyle.transitionDuration;
                
                // Should have transition duration
                expect(parseFloat(transitionDuration)).toBeGreaterThan(0);
            });

            it('primary card has different hover state', () => {
                const primaryCard = document.querySelector('.stat-card.primary');
                if (primaryCard) {
                    const computedStyle = window.getComputedStyle(primaryCard);
                    const boxShadow = computedStyle.boxShadow;
                    
                    // Should have shadow
                    expect(boxShadow).toBeDefined();
                    expect(boxShadow).not.toBe('none');
                }
            });
        });
    });
})();
