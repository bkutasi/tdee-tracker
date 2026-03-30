/**
 * Focus Trap Utility for Modals
 * 
 * Keeps keyboard focus within a container element (modal)
 * Implements WCAG 2.1 focus management requirements
 * 
 * Usage:
 *   const releaseFocus = FocusTrap.trapFocus(modalElement);
 *   // ... when done ...
 *   releaseFocus(); // Releases trap and restores focus
 */

'use strict';

const FocusTrap = (function() {
    
    /**
     * Trap focus within an element
     * @param {HTMLElement} container - Element to trap focus within
     * @returns {Function} Cleanup function to call when done
     */
    function trapFocus(container) {
        if (!container) {
            return function noop() {};
        }
        
        const focusableSelectors = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            'a[href]',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');
        
        const focusableElements = Array.from(container.querySelectorAll(focusableSelectors));
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        // Store previous focus for restoration
        const previousActiveElement = document.activeElement;
        
        // Focus first element
        if (firstFocusable) {
            firstFocusable.focus();
        }
        
        /**
         * Handle Tab key navigation
         * @param {KeyboardEvent} event
         */
        function handleKeyDown(event) {
            if (event.key !== 'Tab') return;
            
            if (event.shiftKey) {
                // Shift + Tab: if on first element, wrap to last
                if (document.activeElement === firstFocusable) {
                    event.preventDefault();
                    if (lastFocusable) {
                        lastFocusable.focus();
                    }
                }
            } else {
                // Tab: if on last element, wrap to first
                if (document.activeElement === lastFocusable) {
                    event.preventDefault();
                    if (firstFocusable) {
                        firstFocusable.focus();
                    }
                }
            }
        }
        
        container.addEventListener('keydown', handleKeyDown);
        
        // Return cleanup function that releases trap and restores focus
        return function releaseFocus() {
            container.removeEventListener('keydown', handleKeyDown);
            
            // Restore focus to previous element
            if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
                previousActiveElement.focus();
            }
        };
    }
    
    return {
        trapFocus
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.FocusTrap = FocusTrap;
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FocusTrap;
}
