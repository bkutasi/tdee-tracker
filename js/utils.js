/**
 * TDEE Tracker - Utility Functions
 * Common helpers for precision, date handling, and validation
 */

const Utils = (function () {
    'use strict';

    /**
     * Format date as YYYY-MM-DD
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date string
     */
    function formatDate(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Parse date string to Date object
     * @param {string} dateStr - Date in YYYY-MM-DD format
     * @returns {Date} Date object
     */
    function parseDate(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    /**
     * Get start of week (Monday) for a given date
     * @param {Date|string} date - Date to find week start for
     * @returns {Date} Monday of that week
     */
    function getWeekStart(date) {
        if (typeof date === 'string') date = parseDate(date);
        const d = new Date(date);
        const day = d.getDay();
        // Convert to Monday-based: Sunday (0) becomes 6, Mon-Sat (1-6) become 0-5
        const diff = day === 0 ? 6 : day - 1;
        d.setDate(d.getDate() - diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /**
     * Get week number within year
     * @param {Date|string} date - Date to get week number for
     * @returns {number} Week number (1-53)
     */
    function getWeekNumber(date) {
        if (typeof date === 'string') date = parseDate(date);
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    /**
     * Generate array of dates between start and end
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {string[]} Array of date strings
     */
    function getDateRange(startDate, endDate) {
        const dates = [];
        const current = parseDate(startDate);
        const end = parseDate(endDate);

        while (current <= end) {
            dates.push(formatDate(current));
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }

    /**
     * Get day of week name
     * @param {Date|string} date - Date
     * @returns {string} Day name (Sun, Mon, etc.)
     */
    function getDayName(date) {
        if (typeof date === 'string') date = parseDate(date);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[date.getDay()];
    }

    /**
     * Check if value is a valid number
     * @param {*} value - Value to check
     * @returns {boolean} True if valid number
     */
    function isValidNumber(value) {
        return value !== null &&
            value !== undefined &&
            value !== '' &&
            !isNaN(Number(value)) &&
            isFinite(Number(value));
    }

    /**
     * Validate weight value
     * @param {*} value - Weight value
     * @param {string} unit - 'kg' or 'lb'
     * @returns {Object} { valid: boolean, error?: string, value?: number }
     */
    function validateWeight(value, unit = 'kg') {
        if (!isValidNumber(value)) {
            return { valid: false, error: 'Invalid weight value' };
        }

        const num = Number(value);
        const minWeight = unit === 'kg' ? 20 : 44;
        const maxWeight = unit === 'kg' ? 300 : 660;

        if (num < minWeight || num > maxWeight) {
            return { valid: false, error: `Weight must be between ${minWeight} and ${maxWeight} ${unit}` };
        }

        return { valid: true, value: num };
    }

    /**
     * Validate calorie value
     * @param {*} value - Calorie value
     * @returns {Object} { valid: boolean, error?: string, value?: number }
     */
    function validateCalories(value) {
        if (!isValidNumber(value)) {
            return { valid: false, error: 'Invalid calorie value' };
        }

        const num = Number(value);

        if (num < 0 || num > 15000) {
            return { valid: false, error: 'Calories must be between 0 and 15000' };
        }

        return { valid: true, value: Math.round(num) };
    }

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    function debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Minimum time between calls
     * @returns {Function} Throttled function
     */
    function throttle(func, limit = 100) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Generate unique ID
     * @returns {string} Unique identifier
     */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Format number with locale-specific formatting
     * @param {number} value - Number to format
     * @param {number} decimals - Decimal places
     * @returns {string} Formatted number string
     */
    function formatNumber(value, decimals = 0) {
        if (value === null || value === undefined || isNaN(value)) return '-';
        return Number(value).toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    // Public API
    return {
        formatDate,
        parseDate,
        getWeekStart,
        getWeekNumber,
        getDateRange,
        getDayName,
        isValidNumber,
        validateWeight,
        validateCalories,
        debounce,
        throttle,
        generateId,
        deepClone,
        formatNumber
    };
})();

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
