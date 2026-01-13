/**
 * TDEE Tracker - Storage Layer
 * LocalStorage-based persistence with future Supabase migration path
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
            weekStartsOn: 0,    // 0 = Sunday
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Save daily entry
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {Object} entry - Entry data
     * @returns {boolean} Success
     */
    function saveEntry(date, entry) {
        try {
            const entries = getAllEntries();
            entries[date] = {
                weight: entry.weight !== undefined ? entry.weight : null,
                calories: entry.calories !== undefined ? entry.calories : null,
                notes: entry.notes || '',
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
            return true;
        } catch (error) {
            console.error('Failed to save entry:', error);
            return false;
        }
    }

    /**
     * Get entry for a specific date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Object|null} Entry or null
     */
    function getEntry(date) {
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
        const allEntries = getAllEntries();
        const result = [];

        // Use Utils if available, otherwise simple date iteration
        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date(start);

        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
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
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {boolean} Success
     */
    function deleteEntry(date) {
        try {
            const entries = getAllEntries();
            if (entries[date]) {
                delete entries[date];
                localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
            }
            return true;
        } catch (error) {
            console.error('Failed to delete entry:', error);
            return false;
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
     * @returns {boolean} Success
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
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
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
     * @returns {Object} { success: boolean, entriesImported?: number, error?: string }
     */
    function importData(data) {
        try {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }

            if (!data || typeof data !== 'object') {
                return { success: false, error: 'Invalid data format' };
            }

            // Import settings if present
            if (data.settings) {
                saveSettings(data.settings);
            }

            // Import entries
            let entriesImported = 0;
            if (data.entries && typeof data.entries === 'object') {
                const existingEntries = getAllEntries();
                const mergedEntries = { ...existingEntries };

                for (const [date, entry] of Object.entries(data.entries)) {
                    // Validate date format
                    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                        mergedEntries[date] = entry;
                        entriesImported++;
                    }
                }

                localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(mergedEntries));
            }

            return { success: true, entriesImported };
        } catch (error) {
            console.error('Import failed:', error);
            return { success: false, error: error.message };
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
     * @returns {Object} { used: number, available: number, entries: number }
     */
    function getStorageInfo() {
        const entries = getAllEntries();
        const entriesStr = JSON.stringify(entries);
        const settingsStr = localStorage.getItem(STORAGE_KEYS.SETTINGS) || '';

        const used = new Blob([entriesStr, settingsStr]).size;

        return {
            used,
            usedFormatted: formatBytes(used),
            entriesCount: Object.keys(entries).length,
            // LocalStorage limit is typically 5-10MB
            estimatedLimit: 5 * 1024 * 1024
        };
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
        getDefaultSettings,
        CURRENT_SCHEMA_VERSION
    };
})();

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
