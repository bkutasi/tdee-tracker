/**
 * Settings UI Component
 * Handles settings modal and configuration
 */

const Settings = (function () {
    'use strict';

    function init() {
        setupEventListeners();
        loadSettings();
        updateStorageInfo();
    }

    function setupEventListeners() {
        // Open/close modal
        document.getElementById('settings-btn').addEventListener('click', () => {
            Components.openModal('settings-modal');
            loadSettings();
        });

        document.getElementById('close-settings-btn').addEventListener('click', () => {
            Components.closeModal('settings-modal');
        });

        // Close on overlay click
        document.getElementById('settings-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                Components.closeModal('settings-modal');
            }
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                Components.closeModal('settings-modal');
            }
        });

        // Settings changes
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

        // Export data
        document.getElementById('export-data-btn').addEventListener('click', exportData);

        // Import data
        document.getElementById('import-data-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });

        document.getElementById('import-file').addEventListener('change', importData);
    }

    function loadSettings() {
        const settings = Storage.getSettings();

        document.getElementById('starting-weight').value = settings.startingWeight ?? '';
        document.getElementById('goal-weight').value = settings.goalWeight ?? '';
        document.getElementById('target-deficit').value = settings.targetDeficit ?? -0.2;
        document.getElementById('weight-unit').value = settings.weightUnit ?? 'kg';
        document.getElementById('calorie-unit').value = settings.calorieUnit ?? 'cal';

        // Apply theme
        Components.applyTheme(settings.theme || 'system');

        updateStorageInfo();
    }

    function saveSettings() {
        const settings = {
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
        const info = Storage.getStorageInfo();
        Components.setText('storage-info', `${info.entriesCount} entries • ${info.usedFormatted} used`);
    }

    function exportData() {
        const data = Storage.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `tdee-tracker-backup-${Utils.formatDate(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Components.showToast('Data exported!', 'success');
    }

    function importData(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = Storage.importData(event.target.result);

            if (result.success) {
                Components.showToast(`Imported ${result.entriesImported} entries!`, 'success');
                loadSettings();
                DailyEntry.refresh();
                WeeklyView.refresh();
                Dashboard.refresh();
                Chart.refresh();
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
