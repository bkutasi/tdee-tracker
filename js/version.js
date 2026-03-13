/**
 * TDEE Tracker - Version Management
 * Service worker update detection and version indicator
 */

const VersionManager = (function () {
    'use strict';

    // Current app version - must match sw.js CACHE_VERSION
    const APP_VERSION = '1.0.0';

    // DOM elements
    let versionBadge = null;
    let updateNotification = null;
    let registration = null;

    /**
     * Initialize version manager
     * Sets up version badge and SW update detection
     */
    async function init() {
        console.log('[Version] Initializing...');

        // Create version badge in footer
        createVersionBadge();

        // Register service worker update listener
        await registerSWListener();

        console.log(`[Version] Ready - v${APP_VERSION}`);
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
            console.warn('[Version] Service workers not supported');
            return;
        }

        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            registration = registrations.find(r => r.scope === window.location.origin + '/');

            if (!registration) {
                console.warn('[Version] No service worker registration found');
                return;
            }

            // Check for updates immediately
            checkForUpdates();

            // Listen for update events
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('[Version] New service worker installing...');

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        // New SW installed but waiting
                        if (navigator.serviceWorker.controller) {
                            // Controller exists = old SW active, new one waiting
                            showUpdateNotification();
                        } else {
                            // First install = no controller yet
                            console.log('[Version] Service worker installed for first time');
                        }
                    }

                    if (newWorker.state === 'activating') {
                        console.log('[Version] Service worker activating...');
                    }
                });
            });

            // Listen for controller change (after user accepts update)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[Version] Service worker activated, reloading...');
                // SW activated successfully
                if (updateNotification) {
                    updateNotification.remove();
                    updateNotification = null;
                }
            });

        } catch (error) {
            console.error('[Version] SW registration error:', error);
        }
    }

    /**
     * Check for service worker updates
     */
    async function checkForUpdates() {
        if (!registration) return;

        try {
            await registration.update();
            console.log('[Version] Checked for SW updates');
        } catch (error) {
            console.error('[Version] Update check failed:', error);
        }
    }

    /**
     * Show update available notification
     */
    function showUpdateNotification() {
        console.log('[Version] Update available - showing notification');

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
            console.log('[Version] User accepted update - reloading');
            if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            // Reload page to activate new SW
            window.location.reload();
        });

        refreshLaterBtn.addEventListener('click', () => {
            console.log('[Version] User deferred update');
            hideUpdateNotification();
        });

        closeBtn.addEventListener('click', () => {
            console.log('[Version] User dismissed update notification');
            hideUpdateNotification();
        });

        // Add to toast container
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            toastContainer.appendChild(updateNotification);

            // Auto-hide after 10 seconds
            setTimeout(() => {
                if (updateNotification && updateNotification.parentNode) {
                    updateNotification.style.animation = 'toastOut 0.5s ease forwards';
                    setTimeout(() => {
                        if (updateNotification) {
                            updateNotification.remove();
                            updateNotification = null;
                        }
                    }, 500);
                }
            }, 10000);
        }
    }

    /**
     * Hide update notification
     */
    function hideUpdateNotification() {
        if (updateNotification) {
            updateNotification.style.animation = 'toastOut 0.5s ease forwards';
            setTimeout(() => {
                if (updateNotification && updateNotification.parentNode) {
                    updateNotification.remove();
                }
                updateNotification = null;
            }, 500);
        }
    }

    /**
     * Get current version
     * @returns {string} Current app version
     */
    function getVersion() {
        return APP_VERSION;
    }

    /**
     * Show update indicator on version badge
     */
    function showUpdateIndicator() {
        const indicator = versionBadge?.querySelector('.version-badge__indicator');
        if (indicator) {
            indicator.classList.remove('hidden');
        }
    }

    /**
     * Hide update indicator on version badge
     */
    function hideUpdateIndicator() {
        const indicator = versionBadge?.querySelector('.version-badge__indicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }

    return {
        init,
        getVersion,
        checkForUpdates,
        showUpdateIndicator,
        hideUpdateIndicator
    };
})();
