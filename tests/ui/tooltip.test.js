/**
 * Tooltip Component Tests
 * Tests for tooltip accessibility and functionality
 */

(function() {
    'use strict';

    // Test suite
    const tooltipTests = [];

    /**
     * Helper: Create a test element
     */
    function createTestElement() {
        const el = document.createElement('span');
        el.id = 'test-element';
        el.textContent = 'Test';
        document.body.appendChild(el);
        return el;
    }

    /**
     * Helper: Clean up test elements
     */
    function cleanup() {
        document.querySelectorAll('[id^="test-element"]').forEach(el => el.remove());
        document.querySelectorAll('.tooltip').forEach(el => el.remove());
    }

    /**
     * Test: createTooltip creates tooltip element
     */
    tooltipTests.push({
        name: 'createTooltip creates tooltip element',
        test: () => {
            cleanup();
            const el = createTestElement();
            Components.createTooltip(el, 'Test tooltip content');
            
            const wrapper = el.parentElement;
            const tooltip = wrapper.querySelector('.tooltip');
            
            if (!tooltip) {
                throw new Error('Tooltip element not created');
            }
            
            const tooltipText = tooltip.querySelector('.tooltip-text');
            if (!tooltipText || tooltipText.textContent !== 'Test tooltip content') {
                throw new Error('Tooltip text not set correctly');
            }
        }
    });

    /**
     * Test: createTooltip adds ARIA attributes
     */
    tooltipTests.push({
        name: 'createTooltip adds ARIA attributes',
        test: () => {
            cleanup();
            const el = createTestElement();
            Components.createTooltip(el, 'Test tooltip');
            
            const tooltip = document.querySelector('.tooltip');
            if (!tooltip) {
                throw new Error('Tooltip not created');
            }
            
            // Check ARIA attributes
            if (tooltip.getAttribute('role') !== 'tooltip') {
                throw new Error('Missing role="tooltip"');
            }
            
            if (tooltip.getAttribute('aria-hidden') !== 'true') {
                throw new Error('aria-hidden not set to true');
            }
            
            // Check element has aria-describedby
            if (!el.hasAttribute('aria-describedby')) {
                throw new Error('Element missing aria-describedby');
            }
        }
    });

    /**
     * Test: createTooltip sets tabindex for keyboard access
     */
    tooltipTests.push({
        name: 'createTooltip sets tabindex for keyboard access',
        test: () => {
            cleanup();
            const el = createTestElement();
            Components.createTooltip(el, 'Test tooltip');
            
            if (!el.hasAttribute('tabindex')) {
                throw new Error('tabindex not set');
            }
            
            const tabindex = el.getAttribute('tabindex');
            if (tabindex !== '0') {
                throw new Error(`tabindex should be "0", got "${tabindex}"`);
            }
        }
    });

    /**
     * Test: showTooltip adds visible class
     */
    tooltipTests.push({
        name: 'showTooltip adds visible class',
        test: () => {
            cleanup();
            const el = createTestElement();
            Components.createTooltip(el, 'Test tooltip');
            
            const tooltip = document.querySelector('.tooltip');
            Components.showTooltip(tooltip);
            
            if (!tooltip.classList.contains('tooltip-visible')) {
                throw new Error('tooltip-visible class not added');
            }
            
            if (tooltip.getAttribute('aria-hidden') !== 'false') {
                throw new Error('aria-hidden not set to false');
            }
        }
    });

    /**
     * Test: hideTooltip removes visible class
     */
    tooltipTests.push({
        name: 'hideTooltip removes visible class',
        test: () => {
            cleanup();
            const el = createTestElement();
            Components.createTooltip(el, 'Test tooltip');
            
            const tooltip = document.querySelector('.tooltip');
            Components.showTooltip(tooltip);
            Components.hideTooltip(tooltip);
            
            if (tooltip.classList.contains('tooltip-visible')) {
                throw new Error('tooltip-visible class not removed');
            }
            
            if (tooltip.getAttribute('aria-hidden') !== 'true') {
                throw new Error('aria-hidden not set back to true');
            }
        }
    });

    /**
     * Test: tooltip shows on mouseenter
     */
    tooltipTests.push({
        name: 'tooltip shows on mouseenter',
        test: () => {
            cleanup();
            const el = createTestElement();
            Components.createTooltip(el, 'Test tooltip');
            
            const wrapper = el.parentElement;
            const tooltip = wrapper.querySelector('.tooltip');
            
            // Simulate mouseenter
            const event = new MouseEvent('mouseenter', {
                bubbles: true,
                cancelable: true
            });
            wrapper.dispatchEvent(event);
            
            if (!tooltip.classList.contains('tooltip-visible')) {
                throw new Error('Tooltip did not show on mouseenter');
            }
        }
    });

    /**
     * Test: tooltip hides on mouseleave
     */
    tooltipTests.push({
        name: 'tooltip hides on mouseleave',
        test: () => {
            cleanup();
            const el = createTestElement();
            Components.createTooltip(el, 'Test tooltip');
            
            const wrapper = el.parentElement;
            const tooltip = wrapper.querySelector('.tooltip');
            
            // Show first
            Components.showTooltip(tooltip);
            
            // Simulate mouseleave
            const event = new MouseEvent('mouseleave', {
                bubbles: true,
                cancelable: true
            });
            wrapper.dispatchEvent(event);
            
            if (tooltip.classList.contains('tooltip-visible')) {
                throw new Error('Tooltip did not hide on mouseleave');
            }
        }
    });

    /**
     * Test: tooltip shows on focus
     */
    tooltipTests.push({
        name: 'tooltip shows on focus',
        test: () => {
            cleanup();
            const el = createTestElement();
            Components.createTooltip(el, 'Test tooltip');
            
            const wrapper = el.parentElement;
            const tooltip = wrapper.querySelector('.tooltip');
            
            // Simulate focus
            const event = new FocusEvent('focus', {
                bubbles: true,
                cancelable: true
            });
            el.dispatchEvent(event);
            
            if (!tooltip.classList.contains('tooltip-visible')) {
                throw new Error('Tooltip did not show on focus');
            }
        }
    });

    /**
     * Test: tooltip hides on blur
     */
    tooltipTests.push({
        name: 'tooltip hides on blur',
        test: () => {
            cleanup();
            const el = createTestElement();
            Components.createTooltip(el, 'Test tooltip');
            
            const wrapper = el.parentElement;
            const tooltip = wrapper.querySelector('.tooltip');
            
            // Show first
            Components.showTooltip(tooltip);
            
            // Simulate blur
            const event = new FocusEvent('blur', {
                bubbles: true,
                cancelable: true
            });
            el.dispatchEvent(event);
            
            if (tooltip.classList.contains('tooltip-visible')) {
                throw new Error('Tooltip did not hide on blur');
            }
        }
    });

    /**
     * Test: createInfoIcon creates info icon with tooltip
     */
    tooltipTests.push({
        name: 'createInfoIcon creates info icon with tooltip',
        test: () => {
            cleanup();
            const icon = Components.createInfoIcon('Info content');
            
            if (!icon.classList.contains('tooltip-info-icon')) {
                throw new Error('Info icon class not applied');
            }
            
            if (icon.innerHTML !== 'ℹ️') {
                throw new Error('Info icon emoji not set');
            }
            
            if (icon.getAttribute('aria-label') !== 'More information') {
                throw new Error('aria-label not set');
            }
            
            if (icon.getAttribute('role') !== 'button') {
                throw new Error('role not set to button');
            }
        }
    });

    /**
     * Test: tooltip handles null/undefined gracefully
     */
    tooltipTests.push({
        name: 'tooltip handles null/undefined gracefully',
        test: () => {
            cleanup();
            
            // Should not throw
            Components.createTooltip(null, 'Test');
            Components.createTooltip(document.createElement('span'), null);
            Components.createTooltip(undefined, undefined);
            Components.showTooltip(null);
            Components.showTooltip(undefined);
            Components.hideTooltip(null);
            Components.hideTooltip(undefined);
        }
    });

    /**
     * Test: tooltip positions
     */
    tooltipTests.push({
        name: 'tooltip supports different positions',
        test: () => {
            cleanup();
            const el = createTestElement();
            
            // Test top position
            Components.createTooltip(el, 'Test', { position: 'top' });
            const wrapper = el.parentElement;
            let tooltip = wrapper.querySelector('.tooltip');
            if (!tooltip.classList.contains('tooltip-top')) {
                throw new Error('tooltip-top class not applied');
            }
            
            // Clean and test bottom
            cleanup();
            const el2 = createTestElement();
            Components.createTooltip(el2, 'Test', { position: 'bottom' });
            const wrapper2 = el2.parentElement;
            const tooltip2 = wrapper2.querySelector('.tooltip');
            if (!tooltip2.classList.contains('tooltip-bottom')) {
                throw new Error('tooltip-bottom class not applied');
            }
        }
    });

    // Run tests
    console.log('\n=== Tooltip Component Tests ===\n');
    
    let passed = 0;
    let failed = 0;
    
    tooltipTests.forEach(testCase => {
        try {
            testCase.test();
            console.log(`✓ ${testCase.name}`);
            passed++;
        } catch (error) {
            console.log(`✗ ${testCase.name}`);
            console.log(`  Error: ${error.message}`);
            failed++;
        }
    });
    
    console.log(`\n========================================`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);
    
    // Clean up
    cleanup();
    
    // Return results for programmatic access
    return { passed, failed, total: passed + failed };
})();
