/**
 * TDEE Tracker - Main Application
 * Entry point and initialization
 */

const App = (function () {
    'use strict';

    function init() {
        console.log('TDEE Tracker initializing...');

        // Initialize storage
        Storage.init();

        // Load and apply theme
        const settings = Storage.getSettings();
        Components.applyTheme(settings.theme || 'system');

        // Initialize UI components
        DailyEntry.init();
        WeeklyView.init();
        Dashboard.init();
        Settings.init();
        Chart.init();

        // Register global keyboard shortcuts
        registerKeyboardShortcuts();

        console.log('TDEE Tracker ready!');
    }

    function registerKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                document.getElementById('save-entry-btn')?.click();
            }

            // Ctrl/Cmd + , for settings
            if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                e.preventDefault();
                Components.openModal('settings-modal');
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { init };
})();
