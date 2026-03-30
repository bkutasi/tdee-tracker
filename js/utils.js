/**
 * TDEE Tracker - Utility Functions
 * Common helpers for precision, date handling, and validation
 */

const Utils = (function () {
    'use strict';
    
    // Declare AppConstants first (before usage)
    var AppConstants;
    
    // Define AppConstants for Node.js environment (not available in global scope)
    if (typeof window === 'undefined' && typeof AppConstants === 'undefined') {
        AppConstants = {
            MS_PER_SECOND: 1000,
            MS_PER_MINUTE: 60000,
            MS_PER_HOUR: 3600000,
            MS_PER_DAY: 86400000,
            SYNC_INTERVAL_MS: 30000,
            MAX_RETRIES: 3,
            RETRY_DELAY_MS: 1000,
            AUTH_TIMEOUT_MS: 5000,
            AUTH_POLL_INTERVAL_MS: 100,
            TOAST_AUTO_HIDE_DELAY_MS: 5000,
            MAX_SYNC_ERROR_HISTORY: 50,
            MAX_STORAGE_ENTRIES: 10000,
            STORAGE_KEY_ENTRIES: 'tdee_entries',
            STORAGE_KEY_SETTINGS: 'tdee_settings',
            MIN_WEIGHT_KG: 20,
            MAX_WEIGHT_KG: 300,
            MIN_WEIGHT_LB: 44,
            MAX_WEIGHT_LB: 660,
            MIN_CALORIES: 0,
            MAX_CALORIES: 15000,
            DEBOUNCE_DELAY_MS: 300,
            THROTTLE_LIMIT_MS: 100
        };
    }

    /**
     * Result object pattern for consistent error handling
     * @typedef {Object} Result
     * @property {boolean} success - Operation succeeded
     * @property {*} [data] - Result data (if success)
     * @property {string} [error] - Error message (if failed)
     * @property {string} [code] - Error code for programmatic handling
     */

    /**
     * Create success result
     * @param {*} data - Result data
     * @returns {Result} Success result
     */
    function success(data) {
        return { success: true, data };
    }

    /**
     * Create error result
     * @param {string} message - Error message
     * @param {string} [code='ERROR'] - Error code
     * @returns {Result} Error result
     */
    function error(message, code = 'ERROR') {
        return { success: false, error: message, code };
    }

    /**
     * Validation bounds for weight by unit
     * Based on realistic human weight ranges
     */
    const WEIGHT_BOUNDS = {
        kg: { min: AppConstants?.MIN_WEIGHT_KG || 20, max: AppConstants?.MAX_WEIGHT_KG || 300 },
        lb: { min: AppConstants?.MIN_WEIGHT_LB || 44, max: AppConstants?.MAX_WEIGHT_LB || 660 }
    };

    /**
     * Validation bounds for calorie intake
     * Allows for extreme outliers while catching obvious errors
     */
    const CALORIE_BOUNDS = { 
        min: AppConstants?.MIN_CALORIES || 0, 
        max: AppConstants?.MAX_CALORIES || 15000 
    };

    /**
     * Debounce default wait time in milliseconds
     */
    const DEBOUNCE_DELAY = AppConstants?.DEBOUNCE_DELAY_MS || 300;

    /**
     * Throttle default limit in milliseconds
     */
    const THROTTLE_LIMIT = AppConstants?.THROTTLE_LIMIT_MS || 100;

    /**
     * Format date as YYYY-MM-DD
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date string
     */
    function formatDate(date) {
        if (!date) {
            return '';
        }
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
     * @param {string|Date} dateStr - Date in YYYY-MM-DD format or Date object
     * @returns {Date} Date object
     */
    function parseDate(dateStr) {
        // Handle Date objects directly (clone to avoid mutation)
        if (dateStr instanceof Date) {
            return new Date(dateStr.getTime());
        }
        
        // Handle null/undefined/invalid input
        if (!dateStr || typeof dateStr !== 'string') {
            return new Date(); // Return current date as fallback
        }
        
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
        const diff = day === 0 ? -6 : 1 - day; // Monday-based: Mon(1)→0, Tue(2)→-1, ..., Sun(0)→-6
        d.setDate(d.getDate() + diff);
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
        return Math.ceil((((d - yearStart) / AppConstants.MS_PER_DAY) + 1) / 7);
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
     * @returns {Result} Success with validated value or error with message
     */
    function validateWeight(value, unit = 'kg') {
        if (!isValidNumber(value)) {
            return error('Invalid weight value', 'INVALID_INPUT');
        }

        const num = Number(value);
        const bounds = WEIGHT_BOUNDS[unit];

        if (num < bounds.min || num > bounds.max) {
            return error(
                `Weight must be between ${bounds.min} and ${bounds.max} ${unit}`,
                'OUT_OF_RANGE'
            );
        }

        return success(num);
    }

    /**
     * Validate calorie value
     * @param {*} value - Calorie value
     * @returns {Result} Success with validated value or error with message
     */
    function validateCalories(value) {
        if (!isValidNumber(value)) {
            return error('Invalid calorie value', 'INVALID_INPUT');
        }

        const num = Number(value);

        if (num < CALORIE_BOUNDS.min || num > CALORIE_BOUNDS.max) {
            return error(
                `Calories must be between ${CALORIE_BOUNDS.min} and ${CALORIE_BOUNDS.max}`,
                'OUT_OF_RANGE'
            );
        }

        return success(Math.round(num));
    }

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    function debounce(func, wait = DEBOUNCE_DELAY) {
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
    function throttle(func, limit = THROTTLE_LIMIT) {
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
     * 
     * LIMITATIONS:
     * - Does NOT clone functions (copied by reference)
     * - Does NOT clone prototype chains
     * - Does NOT handle circular references (will throw)
     * - Date objects become plain objects
     * - undefined values become null in JSON
     * 
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     * @throws {Error} If circular reference detected
     * 
     * @example
     * const cloned = Utils.deepClone({ a: 1, b: { c: 2 } });
     * // { a: 1, b: { c: 2 } }
     */
    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Lazy load a script on demand
     * @param {string} src - Script source path
     * @returns {Promise<void>}
     */
    function loadScript(src) {
        'use strict';
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
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

    /**
     * Round to specified decimal places (handles floating-point precision)
     * @param {number} value - Value to round
     * @param {number} decimals - Decimal places
     * @returns {number} Rounded value
     */
    function round(value, decimals = 2) {
        if (value === null || value === undefined || isNaN(value)) return null;
        const factor = Math.pow(10, decimals);
        return Math.round((value + Number.EPSILON) * factor) / factor;
    }

    /**
     * Calculate basic statistics (single pass for mean/min/max)
     * @param {number[]} data - Array of numbers
     * @returns {Object} { mean, stdDev, min, max }
     */
    function calculateStats(data) {
        if (data.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };

        // Single pass for sum, min, max
        let sum = 0, min = Infinity, max = -Infinity;
        for (const value of data) {
            sum += value;
            if (value < min) min = value;
            if (value > max) max = value;
        }
        const mean = sum / data.length;

        // Second pass for variance (necessary)
        let sumSqDiff = 0;
        for (const value of data) {
            sumSqDiff += (value - mean) ** 2;
        }
        const variance = sumSqDiff / data.length;

        return {
            mean: round(mean, 4),
            stdDev: round(Math.sqrt(variance), 4),
            min: round(min, 4),
            max: round(max, 4)
        };
    }

    /**
     * Validate date format (YYYY-MM-DD)
     * @param {string} dateStr - Date string to validate
     * @returns {Result} Validation result with parsed date if valid
     */
    function validateDateFormat(dateStr) {
        if (!dateStr) {
            return error('Date is required', 'MISSING_INPUT');
        }

        // Validate format (YYYY-MM-DD)
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(dateStr)) {
            return error('Invalid date format. Use YYYY-MM-DD', 'INVALID_FORMAT');
        }

        // Parse and validate the date (use parseDate to avoid timezone shifts)
        const parsed = parseDate(dateStr);
        if (isNaN(parsed.getTime())) {
            return error('Invalid date', 'INVALID_DATE');
        }

        return success(parsed);
    }

    /**
     * Validate date range for data queries
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @param {number} maxDays - Maximum allowed range (default: 730 = 2 years)
     * @returns {Result} Validation result with parsed dates and day count
     */
    function validateDateRange(startDate, endDate, maxDays = 730) {
        // Check for null/undefined
        if (!startDate || !endDate) {
            return error('Start date and end date are required', 'MISSING_INPUT');
        }

        // Validate start date format
        const startValidation = validateDateFormat(startDate);
        if (!startValidation.success) {
            return startValidation;
        }

        // Validate end date format
        const endValidation = validateDateFormat(endDate);
        if (!endValidation.success) {
            return endValidation;
        }

        const start = startValidation.data;
        const end = endValidation.data;

        // Check order
        if (start > end) {
            return error('Start date must be before end date', 'INVALID_RANGE');
        }

        // Check range limit
        const diffDays = Math.round((end - start) / AppConstants.MS_PER_DAY);
        if (diffDays > maxDays) {
            return error(
                `Date range exceeds maximum of ${maxDays} days (${Math.round(maxDays / 365)} years)`,
                'RANGE_EXCEEDED'
            );
        }

        return success({ start, end, days: diffDays });
    }

    // Public API
    return {
        // Result helpers for consistent error handling
        success,
        error,
        // Date utilities
        formatDate,
        parseDate,
        getWeekStart,
        getWeekNumber,
        getDateRange,
        getDayName,
        // Validation
        isValidNumber,
        validateWeight,
        validateCalories,
        validateDateFormat,
        validateDateRange,
        // Function utilities
        debounce,
        throttle,
        // Data utilities
        generateId,
        deepClone,
        formatNumber,
        // Math utilities (consolidated from calculator modules)
        round,
        calculateStats,
        // Script loading
        loadScript
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
