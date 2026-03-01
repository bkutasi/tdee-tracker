/**
 * TDEE Tracker - Main Application
 * Entry point and initialization
 */

const App = (function () {
    'use strict';

    async function init() {
        console.log('TDEE Tracker initializing...');

        // Initialize configuration (if not already loaded)
        if (!window.SUPABASE_CONFIG) {
            console.warn('[App] Supabase config not found. Auth features disabled.');
        }

        // Initialize storage
        Storage.init();

        // Load and apply theme
        const settings = Storage.getSettings();
        Components.applyTheme(settings.theme || 'system');

        // Initialize auth & sync (if configured)
        if (window.SUPABASE_CONFIG) {
            try {
                console.log('[App] Initializing auth...');
                await Auth.init();
                
                // Check if user is already authenticated (existing session)
                const user = Auth.getCurrentUser();
                if (user) {
                    console.log('[App] User already authenticated, fetching data...');
                    // Fetch and merge data from Supabase
                    await Sync.fetchAndMergeData();
                }
                
                console.log('[App] Auth ready, initializing sync...');
                await Sync.init();
                AuthModal.init();
                console.log('[App] Auth & sync initialized');
            } catch (error) {
                console.error('[App] Auth initialization failed:', error);
            }
        }

        // Initialize UI components
        DailyEntry.init();
        WeeklyView.init();
        Dashboard.init();
        Settings.init();
        Chart.init();

        // Set up auth modal button
        setupAuthModal();

        // Register global keyboard shortcuts
        registerKeyboardShortcuts();

        console.log('TDEE Tracker ready!');
    }

    function setupAuthModal() {
        const authModalBtn = document.getElementById('auth-modal-btn');
        if (authModalBtn) {
            authModalBtn.addEventListener('click', () => {
                AuthModal.show();
            });
        }
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
