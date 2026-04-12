/**
 * TDEE Tracker - Version Management
 * Service worker update detection and version indicator
 */

const VersionManager = (function () {
    'use strict';

    // Version constants
    const APP_VERSION = '1.0.7';             // Current app version - must match sw.js CACHE_VERSION

    // DOM elements
    let versionBadge = null;
    let registration = null;

    /**
     * Initialize version manager
     * Sets up version badge and SW update detection
     */
    async function init() {
        // Create version badge in footer
        createVersionBadge();

        // Register service worker update listener
        await registerSWListener();
    }

    /**
     * Create version badge in footer
     */
    function createVersionBadge() {
        // Find or create footer
        let footer = document.querySelector('footer.app-footer');
        if (!footer) {
            footer = document.createElement('footer');
            footer.className = 'app-footer';
            document.body.appendChild(footer);
        }

        // Create version badge
        versionBadge = document.createElement('div');
        versionBadge.className = 'version-badge';
        versionBadge.innerHTML = `
            <span class="version-badge__label">Version</span>
            <span class="version-badge__version">${APP_VERSION}</span>
            <span class="version-badge__indicator hidden" title="Update available"></span>
        `;

        footer.appendChild(versionBadge);
    }

    /**
     * Register service worker update listener
     */
    async function registerSWListener() {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        try {
            // Register service worker if not already registered
            try {
                registration = await navigator.serviceWorker.register('/sw.js');
            } catch (_error) {
                // SW registration failed - silently fail
                return;
            }

            // Check for updates immediately
            checkForUpdates();

            // Listen for update events
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        // New SW installed - auto-activate by sending SKIP_WAITING
                        if (navigator.serviceWorker.controller) {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                        // Update version badge indicator
                        const indicator = versionBadge?.querySelector('.version-badge__indicator');
                        if (indicator) {
                            indicator.classList.remove('hidden');
                            indicator.title = 'New version available - refreshing...';
                        }
                    }
                });
            });

            // Listen for controller change (after new SW activates)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });

        } catch (_error) {
            // SW registration error - silently fail as SW is optional
        }
    }

    /**
     * Check for service worker updates
     */
    async function checkForUpdates() {
        if (!registration) return;

        try {
            await registration.update();
        } catch (_error) {
            // Update check failed - silently fail
        }
    }

    /**
     * Get current version
     * @returns {string} Current app version
     */
    function getVersion() {
        return APP_VERSION;
    }

    return {
        init,
        getVersion,
        checkForUpdates
    };
})();
