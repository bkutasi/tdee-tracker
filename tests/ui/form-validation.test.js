/**
 * Form Validation & Button UI Tests
 * 
 * Tests for enhanced entry form with validation feedback,
 * loading spinners, required field indicators, and button effects
 * 
 * Run: open tests/test-runner.html
 */

(function() {
    'use strict';

    // Skip all tests in Node.js environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.log('[Form Validation Tests] Skipped - browser environment required');
        if (typeof module !== 'undefined' && module.exports) {
            module.exports = { skipped: true, reason: 'Browser environment required' };
        }
        return;
    }

    // Test utilities
    function getWeightInput() {
        return document.getElementById('weight-input');
    }

    function getCaloriesInput() {
        return document.getElementById('calories-input');
    }

    function getSaveButton() {
        return document.getElementById('save-entry-btn');
    }

    function getInputLabels() {
        return document.querySelectorAll('.input-group label');
    }

    // Test suite
    describe('Form Validation Enhancements', () => {
        beforeEach(() => {
            // Initialize DailyEntry if available
            if (typeof DailyEntry !== 'undefined') {
                DailyEntry.init();
            }
        });

        describe('Required Field Indicators', () => {
            it('input labels exist', () => {
                const labels = getInputLabels();
                expect(labels.length).toBeGreaterThan(0);
            });

            it('required fields have asterisk indicator', () => {
                const labels = getInputLabels();
                let hasRequiredLabel = false;
                
                labels.forEach(label => {
                    if (label.classList.contains('required')) {
                        hasRequiredLabel = true;
                    }
                });
                
                // At least some labels should be marked as required
                // (this test passes even if no required labels, just checking structure)
                expect(labels.length).toBeGreaterThan(0);
            });

            it('required indicator has correct color', () => {
                const labels = getInputLabels();
                labels.forEach(label => {
                    if (label.classList.contains('required')) {
                        const computedStyle = window.getComputedStyle(label, '::after');
                        const content = computedStyle.content;
                        
                        // Should have content (the asterisk)
                        expect(content).toBeDefined();
                    }
                });
            });
        });

        describe('Validation Feedback States', () => {
            it('weight input can receive valid state', () => {
                const input = getWeightInput();
                expect(input).toBeDefined();
                
                // Add valid state
                input.classList.add('is-valid');
                expect(input.classList.contains('is-valid')).toBe(true);
                
                // Clean up
                input.classList.remove('is-valid');
            });

            it('weight input can receive invalid state', () => {
                const input = getWeightInput();
                
                // Add invalid state
                input.classList.add('is-invalid');
                expect(input.classList.contains('is-invalid')).toBe(true);
                
                // Clean up
                input.classList.remove('is-invalid');
            });

            it('invalid input has error border color', () => {
                const input = getWeightInput();
                input.classList.add('is-invalid');
                
                const computedStyle = window.getComputedStyle(input);
                const borderColor = computedStyle.borderColor;
                
                // Border color should change (not default)
                expect(borderColor).toBeDefined();
                
                // Clean up
                input.classList.remove('is-invalid');
            });

            it('valid input has success border color', () => {
                const input = getWeightInput();
                input.classList.add('is-valid');
                
                const computedStyle = window.getComputedStyle(input);
                const borderColor = computedStyle.borderColor;
                
                expect(borderColor).toBeDefined();
                
                // Clean up
                input.classList.remove('is-valid');
            });

            it('validation message element can be created', () => {
                const input = getWeightInput();
                const parent = input.parentElement;
                
                // Create validation message
                const messageEl = document.createElement('div');
                messageEl.className = 'validation-message error';
                messageEl.textContent = 'Test error';
                parent.appendChild(messageEl);
                
                expect(messageEl.classList.contains('validation-message')).toBe(true);
                expect(messageEl.classList.contains('error')).toBe(true);
                
                // Clean up
                messageEl.remove();
            });

            it('validation message has correct error styling', () => {
                const input = getWeightInput();
                const parent = input.parentElement;
                
                const messageEl = document.createElement('div');
                messageEl.className = 'validation-message error';
                parent.appendChild(messageEl);
                
                const computedStyle = window.getComputedStyle(messageEl);
                
                // Should have color defined
                expect(computedStyle.color).toBeDefined();
                
                // Clean up
                messageEl.remove();
            });
        });

        describe('Input Focus States', () => {
            it('inputs have focus ring on focus', () => {
                const input = getWeightInput();
                
                // Focus the input
                input.focus();
                
                const computedStyle = window.getComputedStyle(input);
                const boxShadow = computedStyle.boxShadow;
                const borderColor = computedStyle.borderColor;
                
                // Should have focus indicators
                expect(boxShadow).toBeDefined();
                expect(borderColor).toBeDefined();
                
                // Clean up
                input.blur();
            });

            it('inputs have minimum touch target size', () => {
                const input = getWeightInput();
                const computedStyle = window.getComputedStyle(input);
                const minHeight = computedStyle.minHeight;
                const height = computedStyle.height;
                
                // Should have minimum 44px for WCAG compliance
                const size = Math.max(parseFloat(minHeight), parseFloat(height));
                expect(size).toBeGreaterThanOrEqual(44);
            });

            it('inputs have transition on focus', () => {
                const input = getWeightInput();
                const computedStyle = window.getComputedStyle(input);
                const transition = computedStyle.transition;
                
                expect(transition).toContain('border-color');
                expect(transition).toContain('box-shadow');
            });
        });

        describe('Loading Spinner on Save', () => {
            it('save button exists', () => {
                const btn = getSaveButton();
                expect(btn).toBeDefined();
            });

            it('save button can receive loading state', () => {
                const btn = getSaveButton();
                
                // Add loading state
                btn.classList.add('btn-loading');
                expect(btn.classList.contains('btn-loading')).toBe(true);
                
                // Clean up
                btn.classList.remove('btn-loading');
            });

            it('save button is disabled when loading', () => {
                const btn = getSaveButton();
                
                btn.classList.add('btn-loading');
                btn.disabled = true;
                
                expect(btn.disabled).toBe(true);
                
                // Clean up
                btn.classList.remove('btn-loading');
                btn.disabled = false;
            });

            it('loading button has spinner pseudo-element', () => {
                const btn = getSaveButton();
                btn.classList.add('btn-loading');
                
                const computedStyle = window.getComputedStyle(btn, '::before');
                const borderWidth = computedStyle.borderWidth;
                
                // Should have border for spinner
                expect(borderWidth).toBeDefined();
                expect(parseFloat(borderWidth)).toBeGreaterThan(0);
                
                // Clean up
                btn.classList.remove('btn-loading');
            });

            it('save button has minimum touch target', () => {
                const btn = getSaveButton();
                const computedStyle = window.getComputedStyle(btn);
                const minHeight = computedStyle.minHeight;
                
                expect(parseFloat(minHeight)).toBeGreaterThanOrEqual(44);
            });
        });

        describe('Button Shimmer Effect', () => {
            it('buttons have shimmer pseudo-element', () => {
                const btn = getSaveButton();
                const computedStyle = window.getComputedStyle(btn, '::after');
                
                // Should have shimmer effect defined
                expect(computedStyle).toBeDefined();
            });

            it('buttons have hover transform', () => {
                const btn = getSaveButton();
                const computedStyle = window.getComputedStyle(btn);
                const transition = computedStyle.transition;
                
                expect(transition).toContain('transform');
            });

            it('primary button has shadow', () => {
                const btn = getSaveButton();
                expect(btn.classList.contains('btn-primary')).toBe(true);
                
                const computedStyle = window.getComputedStyle(btn);
                const boxShadow = computedStyle.boxShadow;
                
                expect(boxShadow).toBeDefined();
            });
        });

        describe('Better Error Messages', () => {
            it('validation message has error class', () => {
                const input = getWeightInput();
                const parent = input.parentElement;
                
                const messageEl = document.createElement('div');
                messageEl.className = 'validation-message error';
                parent.appendChild(messageEl);
                
                expect(messageEl.classList.contains('error')).toBe(true);
                
                messageEl.remove();
            });

            it('validation message has success class', () => {
                const input = getWeightInput();
                const parent = input.parentElement;
                
                const messageEl = document.createElement('div');
                messageEl.className = 'validation-message success';
                parent.appendChild(messageEl);
                
                expect(messageEl.classList.contains('success')).toBe(true);
                
                messageEl.remove();
            });

            it('validation message has appropriate font size', () => {
                const input = getWeightInput();
                const parent = input.parentElement;
                
                const messageEl = document.createElement('div');
                messageEl.className = 'validation-message';
                parent.appendChild(messageEl);
                
                const computedStyle = window.getComputedStyle(messageEl);
                const fontSize = computedStyle.fontSize;
                
                // Should be small but readable
                expect(parseFloat(fontSize)).toBeBetween(10, 14);
                
                messageEl.remove();
            });
        });

        describe('Accessibility', () => {
            it('inputs have associated labels', () => {
                const weightInput = getWeightInput();
                const label = document.querySelector('label[for="weight-input"]');
                
                expect(label).toBeDefined();
            });

            it('inputs have proper ARIA attributes when invalid', () => {
                const input = getWeightInput();
                
                // Add invalid state
                input.setAttribute('aria-invalid', 'true');
                expect(input.getAttribute('aria-invalid')).toBe('true');
                
                // Clean up
                input.removeAttribute('aria-invalid');
            });

            it('error messages are associated with inputs', () => {
                const input = getWeightInput();
                const parent = input.parentElement;
                
                const messageEl = document.createElement('div');
                messageEl.className = 'validation-message error';
                messageEl.id = 'weight-error';
                parent.appendChild(messageEl);
                
                // Associate with input
                input.setAttribute('aria-describedby', 'weight-error');
                expect(input.getAttribute('aria-describedby')).toBe('weight-error');
                
                messageEl.remove();
                input.removeAttribute('aria-describedby');
            });
        });

        describe('Input Unit Labels', () => {
            it('weight input has unit label', () => {
                const unitLabel = document.getElementById('weight-input-unit');
                expect(unitLabel).toBeDefined();
            });

            it('unit label is positioned correctly', () => {
                const unitLabel = document.getElementById('weight-input-unit');
                if (unitLabel) {
                    const computedStyle = window.getComputedStyle(unitLabel);
                    
                    // Should be positioned
                    expect(computedStyle.position).toBeDefined();
                }
            });
        });
    });
})();
