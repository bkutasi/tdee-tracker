/**
 * Settings UI Component
 * Handles settings modal and configuration
 */

const Settings = (function () {
    'use strict';

    /**
     * Initialize the settings component
     * @description Sets up event listeners for all settings controls, loads current settings
     * into form fields, and displays storage usage information. Called once on app startup.
     * 
     * @description Initializes:
     * - Modal open/close handlers (button, overlay click, Escape key)
     * - Settings change auto-save handlers
     * - Theme toggle buttons
     * - Export/import/clear data buttons
     * - Advanced settings toggle
     * 
     * @example
     * // Called once on app startup
     * Settings.init();
     */
    function init() {
        try {
            setupEventListeners();
            loadSettings();
            updateStorageInfo();
        } catch (error) {
            console.error('Settings.init:', error);
            Components.showError('Failed to initialize settings', 'Settings');
        }
    }

    /**
     * Set up event listeners for settings modal and controls
     * @description Binds all event handlers for settings interactions including modal management,
     * settings auto-save, theme switching, data export/import, and data clearing. Includes
     * null checks for graceful degradation if elements are missing.
     * 
     * @description Event Categories:
     * - Modal: Open (settings-btn), Close (close-settings-btn, overlay click, Escape key)
     * - Settings Auto-Save: All input change events trigger saveSettings()
     * - Theme: Theme buttons apply theme immediately and persist to storage
     * - Export: Pretty-print JSON (default) and compact JSON (advanced)
     * - Import: File input handler with validation and sync queuing
     * - Clear: Confirmation dialog before deleting all data
     * - Advanced: Toggle visibility of advanced settings section
     * 
     * @example
     * // Called internally by init()
     * setupEventListeners();
     */
    function setupEventListeners() {
        try {
            // Open/close modal - with null checks
            const settingsBtn = document.getElementById('settings-btn');
            const closeSettingsBtn = document.getElementById('close-settings-btn');
            const settingsModal = document.getElementById('settings-modal');
            
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => {
                    Components.openModal('settings-modal');
                    loadSettings();
                });
            }

            if (closeSettingsBtn) {
                closeSettingsBtn.addEventListener('click', () => {
                    Components.closeModal('settings-modal');
                });
            }

            if (settingsModal) {
                // Close on overlay click
                settingsModal.addEventListener('click', (e) => {
                    if (e.target.classList.contains('modal-overlay')) {
                        Components.closeModal('settings-modal');
                    }
                });
            }

            // Close on Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    Components.closeModal('settings-modal');
                }
            });

            // Settings changes
            // User Profile changes
            document.getElementById('user-gender').addEventListener('change', saveSettings);
            document.getElementById('user-age').addEventListener('change', saveSettings);
            document.getElementById('user-height').addEventListener('change', saveSettings);
            document.getElementById('activity-level').addEventListener('change', saveSettings);

            document.getElementById('starting-weight').addEventListener('change', saveSettings);
            document.getElementById('goal-weight').addEventListener('change', saveSettings);
            document.getElementById('target-deficit').addEventListener('change', saveSettings);
            document.getElementById('weight-unit').addEventListener('change', () => {
                saveSettings();
                DailyEntry.refresh();
                WeeklyView.refresh();
                Dashboard.refresh();
            });
            document.getElementById('calorie-unit').addEventListener('change', saveSettings);

            // Theme toggle
            document.querySelectorAll('.theme-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const theme = btn.dataset.theme;
                    Storage.saveSettings({ theme });
                    Components.applyTheme(theme);
                });
            });

            // Export data (pretty-printed by default)
            const exportBtn = document.getElementById('export-data-btn');
            if (exportBtn) {
                exportBtn.addEventListener('click', exportDataPretty);
            }

            // Export compact (advanced section)
            const exportCompactBtn = document.getElementById('export-compact-btn');
            if (exportCompactBtn) {
                exportCompactBtn.addEventListener('click', () => {
                    exportData('compact');
                });
            }

            // Advanced settings toggle
            const advancedToggle = document.getElementById('advanced-settings-toggle');
            if (advancedToggle) {
                advancedToggle.addEventListener('click', () => {
                    const isExpanded = advancedToggle.getAttribute('aria-expanded') === 'true';
                    const content = document.getElementById('advanced-settings-content');
                    
                    advancedToggle.setAttribute('aria-expanded', !isExpanded);
                    content.classList.toggle('hidden', isExpanded);
                });
            }

            // Import data
            document.getElementById('import-data-btn').addEventListener('click', () => {
                document.getElementById('import-file').click();
            });

            document.getElementById('import-file').addEventListener('change', importData);

            // Clear data
            document.getElementById('clear-data-btn').addEventListener('click', clearData);
        } catch (error) {
            console.error('Settings.setupEventListeners:', error);
            Components.showError('Failed to initialize settings controls', 'Settings');
        }
    }

    /**
     * Clear all user data with confirmation
     * @description Prompts user for confirmation, then deletes all LocalStorage data including
     * entries, settings, and sync queue. Refreshes all UI components to reflect empty state.
     * This action is irreversible.
     * 
     * @description Clear Sequence:
     * 1. Show confirmation dialog (browser native confirm)
     * 2. Clear sync queue (prevents orphaned operations)
     * 3. Clear LocalStorage (Storage.clearAll())
     * 4. Reload settings (resets to defaults)
     * 5. Refresh all UI components (DailyEntry, WeeklyView, Dashboard, Chart)
     * 6. Show success toast notification
     * 
     * @example
     * // Called when user clicks "Clear Data" button
     * clearData();
     */
    function clearData() {
        if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
            // Clear sync queue first (if available)
            if (window.Sync && typeof Sync.clearQueue === 'function') {
                Sync.clearQueue();
            }
            
            // Clear LocalStorage
            Storage.clearAll();
            loadSettings();
            DailyEntry.refresh();
            WeeklyView.refresh();
            Dashboard.refresh();
            Chart.refresh();
            Components.showToast('All data deleted', 'success');
        }
    }

    /**
     * Load settings from storage and populate form fields
     * @description Retrieves user settings from LocalStorage and updates all form controls
     * to reflect current values. Also applies the current theme and updates storage info
     * display. Uses nullish coalescing (??) to provide defaults for unset values.
     * 
     * @description Form Fields Populated:
     * - user-gender, user-age, user-height, activity-level (User Profile)
     * - starting-weight, goal-weight, target-deficit (Goals)
     * - weight-unit, calorie-unit (Preferences)
     * - Theme buttons (visual selection via Components.applyTheme)
     * 
     * @example
     * // Called internally by init() and after clearing data
     * loadSettings();
     */
    function loadSettings() {
        try {
            const settings = Storage.getSettings();

            const genderEl = document.getElementById('user-gender');
            const ageEl = document.getElementById('user-age');
            const heightEl = document.getElementById('user-height');
            const activityEl = document.getElementById('activity-level');
            const startingWeightEl = document.getElementById('starting-weight');
            const goalWeightEl = document.getElementById('goal-weight');
            const targetDeficitEl = document.getElementById('target-deficit');
            const weightUnitEl = document.getElementById('weight-unit');
            const calorieUnitEl = document.getElementById('calorie-unit');

            // Null checks for graceful degradation
            if (!genderEl || !ageEl || !heightEl || !activityEl || 
                !startingWeightEl || !goalWeightEl || !targetDeficitEl || 
                !weightUnitEl || !calorieUnitEl) {
                console.warn('Settings.loadSettings: form elements not found');
                return;
            }

            genderEl.value = settings.gender ?? 'male';
            ageEl.value = settings.age ?? '';
            heightEl.value = settings.height ?? '';
            activityEl.value = settings.activityLevel ?? '1.2';

            startingWeightEl.value = settings.startingWeight ?? '';
            goalWeightEl.value = settings.goalWeight ?? '';
            targetDeficitEl.value = settings.targetDeficit ?? -0.2;
            weightUnitEl.value = settings.weightUnit ?? 'kg';
            calorieUnitEl.value = settings.calorieUnit ?? 'cal';

            // Apply theme
            Components.applyTheme(settings.theme || 'system');

            updateStorageInfo();
        } catch (error) {
            console.error('Settings.loadSettings:', error);
            Components.showError('Failed to load settings', 'Settings');
        }
    }

    /**
     * Save settings from form to LocalStorage
     * @description Reads all settings form values, converts to appropriate types (int/float),
     * and persists to LocalStorage. Triggers dashboard refresh to recalculate TDEE with
     * updated profile data. Called automatically on any settings change.
     * 
     * @description Type Conversion:
     * - age, height: parseInt() → number or null if empty
     * - activityLevel, startingWeight, goalWeight, targetDeficit: parseFloat() → number or null
     * - gender, weightUnit, calorieUnit: string (no conversion)
     * 
     * @description Side Effects:
     * - Storage.saveSettings(settings) - persists to LocalStorage
     * - Dashboard.refresh() - recalculates TDEE with new profile data
     * 
     * @example
     * // Called automatically when any settings input changes
     * saveSettings();
     */
    function saveSettings() {
        const settings = {
            gender: document.getElementById('user-gender').value,
            age: parseInt(document.getElementById('user-age').value) || null,
            height: parseInt(document.getElementById('user-height').value) || null,
            activityLevel: parseFloat(document.getElementById('activity-level').value),
            startingWeight: parseFloat(document.getElementById('starting-weight').value) || null,
            goalWeight: parseFloat(document.getElementById('goal-weight').value) || null,
            targetDeficit: parseFloat(document.getElementById('target-deficit').value),
            weightUnit: document.getElementById('weight-unit').value,
            calorieUnit: document.getElementById('calorie-unit').value
        };

        Storage.saveSettings(settings);
        Dashboard.refresh();
    }

    /**
     * Update storage usage information display
     * @description Fetches storage statistics from Storage.getStorageInfo() and displays
     * the entry count and storage space used in the settings modal. Helps users monitor
     * LocalStorage usage (limit is typically 5-10MB).
     * 
     * @description Display Format:
     * "X entries • Y.YY KB used" (or MB if larger)
     * 
     * @example
     * // Called internally by init() and loadSettings()
     * updateStorageInfo();
     */
    function updateStorageInfo() {
        try {
            const info = Storage.getStorageInfo();
            Components.setText('storage-info', `${info.entriesCount} entries • ${info.usedFormatted} used`);
        } catch (error) {
            console.error('Settings.updateStorageInfo:', error);
            // Silently fail - storage info is non-critical
        }
    }

    /**
     * Export data (pretty-printed by default)
     */
    function exportDataPretty() {
        exportData('pretty');
    }

    /**
     * Export data in specified format
     * @param {string} format - 'pretty' or 'compact'
     */
    function exportData(format = 'pretty') {
        const data = Storage.exportData();
        const jsonString = format === 'compact' 
            ? JSON.stringify(data) 
            : JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `tdee-tracker-backup-${Utils.formatDate(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const formatMessage = format === 'compact' ? 'Compact' : 'Pretty';
        Components.showToast(`Data exported (${formatMessage})!`, 'success');
    }

    /**
     * Import data from JSON backup file
     * @description Reads a JSON backup file, validates the format, and imports entries and
     * settings using Storage.importData(). Shows appropriate toast notifications for success
     * or failure. If authenticated, queues imported entries for sync to Supabase.
     * 
     * @param {Event} e - File input change event containing the selected file
     * 
     * @description Import Process:
     * 1. Read file using FileReader
     * 2. Parse JSON and validate structure
     * 3. Import via Storage.importData() (handles merging)
     * 4. Show toast with import results (entries imported/skipped)
     * 5. Refresh all UI components
     * 6. Queue for sync if authenticated (Sync.syncAll())
     * 
     * @description Error Handling:
     * - File read errors → "Failed to read file" toast
     * - Invalid JSON → Import failed toast with error message
     * - Skipped entries → Toast shows count, details in console
     * 
     * @example
     * // Called when user selects a backup file
     * importData(event);
     */
    function importData(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = Storage.importData(event.target.result);

            if (result.success) {
                // Check if any entries were skipped
                if (result.entriesSkipped > 0) {
                    Components.showToast(
                        `Imported ${result.entriesImported} entries. ${result.entriesSkipped} skipped (check console).`,
                        'error'
                    );
                } else if (result.entriesImported > 0) {
                    Components.showToast(`Imported ${result.entriesImported} entries!`, 'success');
                } else {
                    Components.showToast('No entries imported. Check file format.', 'error');
                }
                loadSettings();
                DailyEntry.refresh();
                WeeklyView.refresh();
                Dashboard.refresh();
                Chart.refresh();
                
                // Queue imported entries for sync if authenticated
                if (window.Sync && window.Auth && Auth.isAuthenticated()) {
                    // Trigger sync to process queued operations
                    Sync.syncAll().catch(() => {
                        // Sync failed - silently continue
                    });
                }
            } else {
                Components.showToast(`Import failed: ${result.error}`, 'error');
            }
        };

        reader.onerror = () => {
            Components.showToast('Failed to read file', 'error');
        };

        reader.readAsText(file);

        // Reset file input
        e.target.value = '';
    }


    return {
        init,
        refresh: loadSettings
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.Settings = Settings;
}
