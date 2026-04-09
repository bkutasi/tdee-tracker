/**
 * Settings UI Component
 * Handles settings modal and configuration
 */

const Settings = (function () {
    'use strict';

    /**
     * Initialize the settings component
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

    function saveSettings() {
        const settings = {
            gender: document.getElementById('user-gender').value,
            age: parseInt(document.getElementById('user-age').value, 10) || null,
            height: parseInt(document.getElementById('user-height').value, 10) || null,
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
     * @param {Event} e - File input change event
     */
    function importData(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
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
                        try {
                            // Trigger sync to process queued operations
                            await Sync.syncAll();
                            Components.showToast('Data synced to cloud', 'success');
                        } catch (syncError) {
                            console.error('Import sync failed:', syncError);
                            Components.showError(
                                `Import succeeded but sync failed: ${syncError.message}. Your data is saved locally.`,
                                'Settings.importData'
                            );
                        }
                    }
                } else {
                    Components.showToast(`Import failed: ${result.error}`, 'error');
                }
            } catch (error) {
                console.error('Import failed:', error);
                Components.showError(
                    `Import failed: ${error.message}. Please try again.`,
                    'Settings.importData'
                );
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
