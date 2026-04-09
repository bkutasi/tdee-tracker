/**
 * TDEE Tracker - Version Management
 * Service worker update detection and version indicator
 */

const VersionManager = (function () {
    'use strict';

    // Version constants
    const APP_VERSION = '1.0.4';             // Current app version - must match sw.js CACHE_VERSION
    const UPDATE_CHECK_INTERVAL = 10000;     // 10 seconds - auto-hide delay for update notification
    const UPDATE_ANIMATION_DURATION = 500;   // 500ms - animation duration for hide

    // DOM elements
    let versionBadge = null;
    let updateNotification = null;
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
            const registrations = await navigator.serviceWorker.getRegistrations();
            registration = registrations.find(r => r.scope === window.location.origin + '/');

            if (!registration) {
                return;
            }

            // Check for updates immediately
            checkForUpdates();

            // Listen for update events
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        // New SW installed but waiting
                        if (navigator.serviceWorker.controller) {
                            // Controller exists = old SW active, new one waiting
                            showUpdateNotification();
                        }
                    }
                });
            });

            // Listen for controller change (after user accepts update)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                // SW activated successfully
                if (updateNotification) {
                    updateNotification.remove();
                    updateNotification = null;
                }
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
     * Show update available notification
     */
    function showUpdateNotification() {
        // Update version badge indicator
        const indicator = versionBadge?.querySelector('.version-badge__indicator');
        if (indicator) {
            indicator.classList.remove('hidden');
            indicator.title = 'New version available - refresh to update';
        }

        // Create notification toast
        updateNotification = document.createElement('div');
        updateNotification.className = 'update-notification toast';
        updateNotification.setAttribute('role', 'alert');
        updateNotification.innerHTML = `
            <svg class="update-notification__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
            </svg>
            <span class="update-notification__text">New version available!</span>
            <div class="update-notification__actions">
                <button class="btn btn-sm btn-primary" id="refresh-now-btn">Refresh now</button>
                <button class="btn btn-sm btn-ghost" id="refresh-later-btn">Later</button>
            </div>
            <button class="update-notification__close" aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        // Add event listeners
        const refreshNowBtn = updateNotification.querySelector('#refresh-now-btn');
        const refreshLaterBtn = updateNotification.querySelector('#refresh-later-btn');
        const closeBtn = updateNotification.querySelector('.update-notification__close');

        refreshNowBtn.addEventListener('click', () => {
            if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            // Reload page to activate new SW
            window.location.reload();
        });

        refreshLaterBtn.addEventListener('click', () => {
            hideUpdateNotification();
        });

        closeBtn.addEventListener('click', () => {
            hideUpdateNotification();
        });

        // Add to toast container
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            toastContainer.appendChild(updateNotification);

            // Auto-hide after configured interval
            setTimeout(() => {
                if (updateNotification && updateNotification.parentNode) {
                    updateNotification.style.animation = `toastOut ${UPDATE_ANIMATION_DURATION / 1000}s ease forwards`;
                    setTimeout(() => {
                        if (updateNotification) {
                            updateNotification.remove();
                            updateNotification = null;
                        }
                    }, UPDATE_ANIMATION_DURATION);
                }
            }, UPDATE_CHECK_INTERVAL);
        }
    }

    /**
     * Hide update notification
     */
    function hideUpdateNotification() {
        if (updateNotification) {
            updateNotification.style.animation = `toastOut ${UPDATE_ANIMATION_DURATION / 1000}s ease forwards`;
            setTimeout(() => {
                if (updateNotification && updateNotification.parentNode) {
                    updateNotification.remove();
                }
                updateNotification = null;
            }, UPDATE_ANIMATION_DURATION);
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
