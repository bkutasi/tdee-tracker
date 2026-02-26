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
        const container = document.getElementById('toast-container');
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

    // Public API
    return {
        showToast,
        openModal,
        closeModal,
        formatValue,
        setText,
        on,
        createElement,
        applyTheme
    };
})();
