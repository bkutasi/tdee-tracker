/**
 * TDEE Tracker - Storage Layer
 * LocalStorage-based persistence with future Supabase migration path
 * Uses Utils.Result pattern for consistent error handling
 */

const Storage = (function () {
    'use strict';

    const STORAGE_KEYS = {
        ENTRIES: 'tdee_entries',
        SETTINGS: 'tdee_settings',
        SCHEMA_VERSION: 'tdee_schema_version'
    };

    const CURRENT_SCHEMA_VERSION = 1;

    /**
     * Create success result (alias for Utils.success)
     * @param {*} data - Result data
     * @returns {Object} Success result
     */
    function success(data) {
        return { success: true, ...data };
    }

    /**
     * Create error result (alias for Utils.error)
     * @param {string} message - Error message
     * @param {string} [code='ERROR'] - Error code
     * @returns {Object} Error result
     */
    function error(message, code = 'ERROR') {
        return { success: false, error: message, code };
    }

    /**
     * Sanitize string to prevent XSS attacks
     * Removes HTML tags and trims whitespace
     * @param {*} str - Value to sanitize
     * @returns {string} Sanitized string or empty string
     */
    function sanitizeString(str) {
        if (typeof str !== 'string') return '';
        // Remove HTML tags completely (not just angle brackets)
        const withoutTags = str.replace(/<[^>]*>/g, '');
        // Also remove any remaining angle brackets (safety fallback)
        const withoutBrackets = withoutTags.replace(/[<>]/g, '');
        return withoutBrackets.trim();
    }

    /**
     * Sanitize entry data to prevent XSS attacks
     * @param {Object} entry - Entry data to sanitize
     * @returns {Object} Sanitized entry
     */
    function sanitizeEntry(entry) {
        if (!entry || typeof entry !== 'object') return entry;
        return {
            weight: entry.weight !== undefined ? entry.weight : null,
            calories: entry.calories !== undefined ? entry.calories : null,
            notes: sanitizeString(entry.notes),
            updatedAt: entry.updatedAt || new Date().toISOString()
        };
    }

    /**
     * Initialize storage and run migrations if needed
     */
    function init() {
        const version = getSchemaVersion();
        if (version < CURRENT_SCHEMA_VERSION) {
            migrateSchema(version, CURRENT_SCHEMA_VERSION);
        }
    }

    /**
     * Get current schema version
     * @returns {number} Schema version
     */
    function getSchemaVersion() {
        const version = localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION);
        return version ? parseInt(version, 10) : 0;
    }

    /**
     * Migrate schema between versions
     * @param {number} fromVersion - Current version
     * @param {number} toVersion - Target version
     */
    function migrateSchema(fromVersion, toVersion) {
        console.log(`Migrating storage schema from v${fromVersion} to v${toVersion}`);

        // Initial setup (v0 -> v1)
        if (fromVersion < 1) {
            // Ensure default settings exist
            if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
                saveSettings(getDefaultSettings());
            }
            if (!localStorage.getItem(STORAGE_KEYS.ENTRIES)) {
                localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify({}));
            }
        }

        // Add future migrations here
        // if (fromVersion < 2) { ... }

        localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, toVersion.toString());
    }

    /**
     * Get default settings
     * @returns {Object} Default settings
     */
    function getDefaultSettings() {
        return {
            weightUnit: 'kg',
            calorieUnit: 'cal',
            gender: 'male',
            age: null,
            height: null,
            activityLevel: 1.2,
            startingWeight: null,
            goalWeight: null,
            targetDeficit: 0.2,  // 20% deficit
            theme: 'system',    // 'light', 'dark', 'system'
            weekStartsOn: 1,    // 1 = Monday
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Save daily entry
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {Object} entry - Entry data
     * @returns {boolean|Object} true for success, or error object with {success: false, error, code}
     */
    function saveEntry(date, entry) {
        // Validate date format
        const dateValidation = Utils.validateDateFormat(date);
        if (!dateValidation.success) {
            console.error('saveEntry:', dateValidation.error);
            return dateValidation;
        }

        try {
            const entries = getAllEntries();
            entries[date] = sanitizeEntry({
                weight: entry.weight !== undefined ? entry.weight : null,
                calories: entry.calories !== undefined ? entry.calories : null,
                notes: entry.notes || '',
                updatedAt: new Date().toISOString()
            });
            localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
            return true;
        } catch (err) {
            if (err.name === 'QuotaExceededError') {
                console.error('Storage limit reached');
                return error('Storage limit reached. Please export and clear old data.', 'QUOTA_EXCEEDED');
            }
            console.error('Failed to save entry:', err);
            return error(err.message);
        }
    }

    /**
     * Get entry for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Object|null} Entry or null
     */
    function getEntry(date) {
        // Validate date format
        const dateValidation = Utils.validateDateFormat(date);
        if (!dateValidation.success) {
            console.error('getEntry:', dateValidation.error);
            return null;
        }

        const entries = getAllEntries();
        return entries[date] || null;
    }

    /**
     * Get all entries
     * @returns {Object} All entries keyed by date
     */
    function getAllEntries() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.ENTRIES);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Failed to load entries:', error);
            return {};
        }
    }

    /**
     * Get entries within a date range
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Object[]} Array of entries with dates
     */
    function getEntriesInRange(startDate, endDate) {
        // Validate date range
        const validation = Utils.validateDateRange(startDate, endDate);
        if (!validation.success) {
            return [];
        }

        // Safety check: ensure validation returned proper data
        if (!validation.data || !validation.data.start || !validation.data.end) {
            return [];
        }

        const allEntries = getAllEntries();
        const result = [];
        
        // validation.data.start and .end are already Date objects - use them directly
        const current = new Date(validation.data.start.getTime());
        const end = new Date(validation.data.end.getTime());

        while (current <= end) {
            const dateStr = Utils.formatDate(current);
            const entry = allEntries[dateStr];
            result.push({
                date: dateStr,
                weight: entry?.weight ?? null,
                calories: entry?.calories ?? null,
                notes: entry?.notes ?? ''
            });
            current.setDate(current.getDate() + 1);
        }

        return result;
    }

    /**
     * Delete entry for a specific date
    /**
     * Delete entry for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {boolean|Object} true for success, or error object with {success: false, error, code}
     */
    function deleteEntry(date) {
        // Validate date format
        const dateValidation = Utils.validateDateFormat(date);
        if (!dateValidation.success) {
            console.error('deleteEntry:', dateValidation.error);
            return dateValidation;
        }

        try {
            const entries = getAllEntries();
            if (entries[date]) {
                delete entries[date];
                localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
            }
            return true;
        } catch (err) {
            if (err.name === 'QuotaExceededError') {
                console.error('Storage limit reached during delete');
                return error('Storage limit reached. Please export and clear old data.', 'QUOTA_EXCEEDED');
            }
            console.error('Failed to delete entry:', err);
            return error(err.message);
        }
    }

    /**
     * Get user settings
     * @returns {Object} Settings
     */
    function getSettings() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return data ? { ...getDefaultSettings(), ...JSON.parse(data) } : getDefaultSettings();
        } catch (error) {
            console.error('Failed to load settings:', error);
            return getDefaultSettings();
        }
    }

    /**
     * Save user settings
     * @param {Object} settings - Settings to save (merged with existing)
     * @returns {boolean|Object} true for success, or error object with {success: false, error, code}
     */
    function saveSettings(settings) {
        try {
            const current = getSettings();
            const updated = {
                ...current,
                ...settings,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
            return true;
        } catch (err) {
            if (err.name === 'QuotaExceededError') {
                console.error('Storage limit reached');
                return error('Storage limit reached. Please export and clear old data.', 'QUOTA_EXCEEDED');
            }
            console.error('Failed to save settings:', err);
            return error(err.message);
        }
    }

    /**
     * Export all data for backup
     * @returns {Object} All data
     */
    function exportData() {
        return {
            version: CURRENT_SCHEMA_VERSION,
            exportedAt: new Date().toISOString(),
            settings: getSettings(),
            entries: getAllEntries()
        };
    }

    /**
     * Import data from backup
     * @param {Object|string} data - Data to import (object or JSON string)
     * @returns {Object} { success: boolean, entriesImported?: number, error?: string, code?: string }
     */
    function importData(data) {
        try {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }

            if (!data || typeof data !== 'object') {
                console.error('[Storage.importData] Invalid data format: expected object, got', typeof data);
                return error('Invalid data format. Expected a JSON object with "entries" and/or "settings".', 'INVALID_FORMAT');
            }

            // Import settings if present
            if (data.settings) {
                console.log('[Storage.importData] Importing settings...');
                saveSettings(data.settings);
            }

            // Import entries
            let entriesImported = 0;
            let entriesSkipped = 0;
            const skippedDates = [];
            
            if (data.entries && typeof data.entries === 'object') {
                const existingEntries = getAllEntries();
                const mergedEntries = { ...existingEntries };

                for (const [date, entry] of Object.entries(data.entries)) {
                    // Validate date format
                    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        // Sanitize entry data to prevent XSS
                        mergedEntries[date] = sanitizeEntry(entry);
                        entriesImported++;
                    } else {
                        // Log skipped dates for debugging
                        console.warn('[Storage.importData] Skipped invalid date format:', date, '- Expected YYYY-MM-DD');
                        entriesSkipped++;
                        skippedDates.push(date);
                    }
                }

                localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(mergedEntries));
                
                // Log summary
                if (entriesSkipped > 0) {
                    console.error(`[Storage.importData] WARNING: ${entriesSkipped} entries were skipped due to invalid date format. Skipped dates:`, skippedDates);
                }
                console.log(`[Storage.importData] Successfully imported ${entriesImported} entries`);
            }

            return success({ entriesImported, entriesSkipped });
        } catch (err) {
            if (err.name === 'QuotaExceededError') {
                console.error('[Storage.importData] Storage limit reached during import');
                return error('Storage limit reached. Please export and clear old data.', 'QUOTA_EXCEEDED');
            }
            console.error('[Storage.importData] Import failed:', err.message, '\nFull error:', err);
            return error(err.message);
        }
    }


    /**
     * Clear all data (use with caution!)
     * @returns {boolean} Success
     */
    function clearAll() {
        try {
            localStorage.removeItem(STORAGE_KEYS.ENTRIES);
            localStorage.removeItem(STORAGE_KEYS.SETTINGS);
            localStorage.removeItem(STORAGE_KEYS.SCHEMA_VERSION);
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }

    /**
     * Get storage size info
     * @returns {Object} Storage usage information
     */
    function getStorageInfo() {
        const entries = getAllEntries();
        const entriesStr = JSON.stringify(entries);
        const settingsStr = localStorage.getItem(STORAGE_KEYS.SETTINGS) || '';

        const used = new Blob([entriesStr, settingsStr]).size;
        const estimatedLimit = 5 * 1024 * 1024; // LocalStorage limit is typically 5-10MB
        const available = Math.max(0, estimatedLimit - used);
        const percentageUsed = ((used / estimatedLimit) * 100).toFixed(1);

        return {
            used,
            usedFormatted: formatBytes(used),
            available,
            availableFormatted: formatBytes(available),
            entriesCount: Object.keys(entries).length,
            estimatedLimit,
            limitFormatted: formatBytes(estimatedLimit),
            percentageUsed: parseFloat(percentageUsed),
            usageLevel: getUsageLevel(percentageUsed)
        };
    }

    /**
     * Get storage usage level classification
     * @param {number} percentageUsed - Percentage of storage used (0-100)
     * @returns {string} Usage level: 'low', 'medium', 'high', 'critical'
     */
    function getUsageLevel(percentageUsed) {
        const pct = parseFloat(percentageUsed);
        if (pct < 50) return 'low';
        if (pct < 75) return 'medium';
        if (pct < 90) return 'high';
        return 'critical';
    }

    /**
     * Format bytes to human-readable
     * @param {number} bytes - Bytes
     * @returns {string} Formatted string
     */
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Public API
    return {
        init,
        saveEntry,
        getEntry,
        getAllEntries,
        getEntriesInRange,
        deleteEntry,
        getSettings,
        saveSettings,
        exportData,
        importData,
        clearAll,
        getStorageInfo,
        getUsageLevel,
        getDefaultSettings,
        sanitizeString,
        sanitizeEntry,
        CURRENT_SCHEMA_VERSION
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.Storage = Storage;
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
