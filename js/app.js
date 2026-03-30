/**
 * TDEE Tracker - Main Application
 * Entry point and initialization
 */

const App = (function () {
    'use strict';

    async function init() {
        // Initialize configuration (if not already loaded)
        if (!window.SUPABASE_CONFIG) {
            // Auth features will be disabled - no logging needed
        }

        // Initialize version manager (check for SW updates)
        if (typeof VersionManager !== 'undefined') {
            await VersionManager.init();
        }

        // Initialize storage
        Storage.init();

        // Load and apply theme
        const settings = Storage.getSettings();
        Components.applyTheme(settings.theme || 'system');

        // Initialize auth & sync (if configured)
        if (window.SUPABASE_CONFIG) {
            try {
                await Auth.init();
                
                // Wait for auth session to stabilize (prevents race condition)
                const { session } = await Auth.getSession();
                if (session && session.user) {
                    // Small delay to ensure auth state is fully initialized
                    await new Promise(resolve => setTimeout(resolve, 100));
                    // Fetch and merge data from Supabase
                    await Sync.fetchAndMergeData();
                }
                
                await Sync.init();
                // AuthModal.init() removed - will be called when lazy loaded on first click
            } catch (_error) {
                // Auth initialization failed - error is handled internally
            }
        }

        // Initialize UI components (critical path)
        DailyEntry.init();
        WeeklyView.init();
        Dashboard.init();
        Settings.init();
        
        // Lazy load chart modules on demand (only when progress section is visible)
        // Chart is not critical for initial page load - load when needed
        const progressSection = document.getElementById('progress-section');
        if (progressSection) {
            // Use IntersectionObserver to load chart when it scrolls into view
            const chartObserver = new IntersectionObserver(async (entries) => {
                if (entries[0].isIntersecting) {
                    try {
                        // Load chart modules lazily
                        await Utils.loadScript('js/ui/chart-data.js');
                        await Utils.loadScript('js/ui/chart-render.js');
                        await Utils.loadScript('js/ui/chart.js');
                        Chart.init();
                        chartObserver.disconnect(); // Stop observing after loading
                    } catch (error) {
                        console.error('Failed to lazy load chart modules:', error);
                    }
                }
            }, { threshold: 0.1 }); // Load when 10% visible
            
            chartObserver.observe(progressSection);
        }

        // Set up auth modal button
        setupAuthModal();

        // Register global keyboard shortcuts
        registerKeyboardShortcuts();
    }

    async function setupAuthModal() {
        const authModalBtn = document.getElementById('auth-modal-btn');
        if (authModalBtn) {
            authModalBtn.addEventListener('click', async () => {
                // Lazy load auth-modal on first click
                if (typeof AuthModal === 'undefined' || !AuthModal.show) {
                    try {
                        await Utils.loadScript('js/ui/auth-modal.js');
                        await Utils.loadScript('js/ui/focusTrap.js');
                        AuthModal.init();
                    } catch (error) {
                        console.error('Failed to lazy load auth-modal:', error);
                        return;
                    }
                }
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
