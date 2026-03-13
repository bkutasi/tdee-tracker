/**
 * UI Components - Reusable UI elements
 * Toast notifications, modals, and common patterns
 */

const Components = (function () {
    'use strict';

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - 'success', 'error', or 'info'
     * @param {number} duration - Duration in ms
     */
    function showToast(message, type = 'info', duration = 3000) {
        // Prevent empty toast notifications
        if (!message || message.trim() === '') {
            console.warn('[Components.showToast] Ignored empty toast message');
            return;
        }

        const container = document.getElementById('toast-container');
        
        // Safety check: container might not exist yet
        if (!container) {
            console.warn('[Components.showToast] Toast container not found');
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Announce to screen readers (WCAG 4.1.3 Status Messages)
        announceToScreenReader(message, type);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Announce message to screen readers via live region
     * @param {string} message - Message to announce
     * @param {string} type - Message type for context
     */
    function announceToScreenReader(message, type) {
        // Create or reuse live region for screen reader announcements
        let liveRegion = document.getElementById('toast-live-region');
        
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'toast-live-region';
            liveRegion.setAttribute('role', 'status');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.className = 'sr-only';
            liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
            document.body.appendChild(liveRegion);
        }
        
        // Clear and set message (triggers announcement)
        liveRegion.textContent = '';
        setTimeout(() => {
            liveRegion.textContent = message;
        }, 100);
    }

    /**
     * Open modal
     * @param {string} modalId - ID of modal element
     */
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            // Also add 'show' class for consistency with auth-modal
            const modalContent = modal.querySelector('.modal');
            if (modalContent) {
                modalContent.classList.add('show');
            }
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close modal
     * @param {string} modalId - ID of modal element
     */
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            const modalContent = modal.querySelector('.modal');
            if (modalContent) {
                modalContent.classList.remove('show');
            }
            document.body.style.overflow = '';
        }
    }

    /**
     * Format a value for display
     * @param {number} value - Value to format
     * @param {number} decimals - Decimal places
     * @param {string} fallback - Fallback for null/undefined
     * @returns {string} Formatted value
     */
    function formatValue(value, decimals = 0, fallback = '—') {
        if (value === null || value === undefined || isNaN(value)) {
            return fallback;
        }
        return Number(value).toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * Update element text content safely
     * @param {string} id - Element ID
     * @param {string} text - Text to set
     */
    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    /**
     * Add event listener with delegation
     * @param {string} selector - CSS selector
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    function on(selector, event, handler) {
        document.addEventListener(event, (e) => {
            const target = e.target.closest(selector);
            if (target) handler(e, target);
        });
    }

    /**
     * Create element with attributes and children
     * @param {string} tag - Tag name
     * @param {Object} attrs - Attributes
     * @param {Array|string} children - Child elements or text
     * @returns {HTMLElement}
     */
    function createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);

        for (const [key, value] of Object.entries(attrs)) {
            if (key === 'className') {
                el.className = value;
            } else if (key === 'dataset') {
                Object.assign(el.dataset, value);
            } else if (key.startsWith('on')) {
                el.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                el.setAttribute(key, value);
            }
        }

        if (typeof children === 'string') {
            el.textContent = children;
        } else {
            for (const child of children) {
                if (typeof child === 'string') {
                    el.appendChild(document.createTextNode(child));
                } else if (child) {
                    el.appendChild(child);
                }
            }
        }

        return el;
    }

    /**
     * Apply theme to document
     * @param {string} theme - 'light', 'dark', or 'system'
     */
    function applyTheme(theme) {
        if (theme === 'system') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }

        // Update theme buttons
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }

    /**
     * Create tooltip trigger element
     * Wraps target element with tooltip functionality
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {string} content - Tooltip text content
     * @param {Object} options - Configuration options
     * @param {string} [options.position='top'] - Position: 'top', 'bottom', 'left', 'right'
     * @param {boolean} [options.showOnFocus=true] - Show on keyboard focus
     */
    function createTooltip(element, content, options = {}) {
        if (!element || !content) {
            console.warn('[Components.createTooltip] Missing element or content');
            return;
        }

        const position = options.position || 'top';
        const showOnFocus = options.showOnFocus !== false;

        // Create tooltip container
        const tooltip = document.createElement('span');
        tooltip.className = `tooltip tooltip-${position}`;
        tooltip.setAttribute('role', 'tooltip');
        tooltip.setAttribute('aria-hidden', 'true');

        // Create tooltip text
        const tooltipText = document.createElement('span');
        tooltipText.className = 'tooltip-text';
        tooltipText.textContent = content;

        tooltip.appendChild(tooltipText);

        // Wrap element if it's not already wrapped
        let wrapper = element;
        if (!element.classList.contains('tooltip-trigger')) {
            wrapper = document.createElement('span');
            wrapper.className = 'tooltip-trigger';
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-flex';
            wrapper.style.alignItems = 'center';
            
            // Insert wrapper before element and move element inside
            // Only if element is already in DOM
            if (element.parentNode) {
                element.parentNode.insertBefore(wrapper, element);
                wrapper.appendChild(element);
            } else {
                // Element not in DOM yet, just wrap it
                wrapper.appendChild(element);
            }
        }

        wrapper.appendChild(tooltip);

        // Add ARIA label for screen readers
        element.setAttribute('aria-describedby', `tooltip-${Date.now()}`);
        tooltip.id = element.getAttribute('aria-describedby');

        // Mouse events
        wrapper.addEventListener('mouseenter', () => showTooltip(tooltip));
        wrapper.addEventListener('mouseleave', () => hideTooltip(tooltip));

        // Focus events (keyboard accessibility)
        if (showOnFocus) {
            element.setAttribute('tabindex', element.getAttribute('tabindex') || '0');
            
            element.addEventListener('focus', () => showTooltip(tooltip));
            element.addEventListener('blur', () => hideTooltip(tooltip));
            
            // Escape key to close
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    hideTooltip(tooltip);
                    element.blur();
                }
            });
        }

        // Touch events (mobile)
        wrapper.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const isVisible = tooltip.classList.contains('tooltip-visible');
            // Hide all other tooltips first
            document.querySelectorAll('.tooltip-visible').forEach(t => {
                t.classList.remove('tooltip-visible');
            });
            if (!isVisible) {
                showTooltip(tooltip);
            }
        }, { passive: false });

        // Close tooltip when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                hideTooltip(tooltip);
            }
        });

        return { wrapper, tooltip, show: () => showTooltip(tooltip), hide: () => hideTooltip(tooltip) };
    }

    /**
     * Show tooltip
     * @param {HTMLElement} tooltip - Tooltip element to show
     */
    function showTooltip(tooltip) {
        if (!tooltip) return;
        
        // Hide other tooltips first
        document.querySelectorAll('.tooltip-visible').forEach(t => {
            if (t !== tooltip) {
                t.classList.remove('tooltip-visible');
            }
        });

        tooltip.classList.add('tooltip-visible');
        tooltip.setAttribute('aria-hidden', 'false');
    }

    /**
     * Hide tooltip
     * @param {HTMLElement} tooltip - Tooltip element to hide
     */
    function hideTooltip(tooltip) {
        if (!tooltip) return;
        
        tooltip.classList.remove('tooltip-visible');
        tooltip.setAttribute('aria-hidden', 'true');
    }

    /**
     * Create info icon with tooltip
     * @param {string} content - Tooltip content
     * @param {Object} options - Options for createTooltip
     * @returns {HTMLElement} Info icon element with tooltip
     */
    function createInfoIcon(content, options = {}) {
        const icon = document.createElement('span');
        icon.className = 'tooltip-info-icon';
        icon.innerHTML = 'ℹ️';
        icon.setAttribute('aria-label', 'More information');
        icon.setAttribute('role', 'button');
        
        createTooltip(icon, content, options);
        
        return icon;
    }

    // Public API
    return {
        showToast,
        openModal,
        closeModal,
        formatValue,
        setText,
        on,
        createElement,
        applyTheme,
        createTooltip,
        showTooltip,
        hideTooltip,
        createInfoIcon
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.Components = Components;
}
