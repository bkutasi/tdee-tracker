'use strict';

/**
 * Application-wide constants
 * Centralized magic numbers for maintainability
 */
window.AppConstants = {
    // Time constants (milliseconds)
    MS_PER_SECOND: 1000,
    MS_PER_MINUTE: 60000,
    MS_PER_HOUR: 3600000,
    MS_PER_DAY: 86400000,
    
    // Sync constants
    SYNC_INTERVAL_MS: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    AUTH_TIMEOUT_MS: 5000,
    AUTH_POLL_INTERVAL_MS: 100,
    TOAST_AUTO_HIDE_DELAY_MS: 5000,
    MAX_SYNC_ERROR_HISTORY: 50,
    
    // Storage constants
    MAX_STORAGE_ENTRIES: 10000,
    STORAGE_KEY_ENTRIES: 'tdee_entries',
    STORAGE_KEY_SETTINGS: 'tdee_settings',
    
    // Validation constants
    MIN_WEIGHT_KG: 20,
    MAX_WEIGHT_KG: 300,
    MIN_WEIGHT_LB: 44,
    MAX_WEIGHT_LB: 660,
    MIN_CALORIES: 0,
    MAX_CALORIES: 15000,
    
    // UI constants
    DEBOUNCE_DELAY_MS: 300,
    THROTTLE_LIMIT_MS: 100
};
