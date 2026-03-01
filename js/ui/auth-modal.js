/**
 * Auth Modal UI Component
 * 
 * Handles login/logout UI with magic link authentication
 * Displays user status, sync state, and account settings
 * 
 * Usage:
 *   AuthModal.init();
 *   AuthModal.show();
 *   AuthModal.hide();
 */

'use strict';

const AuthModal = (function() {
    // Private state
    let modal = null;
    let modalContent = null;
    let closeButton = null;
    let emailInput = null;
    let sendLinkButton = null;
    let logoutButton = null;
    let statusContainer = null;
    let messageElement = null;

    /**
     * Initialize auth modal
     */
    function init() {
        createModal();
        setupEventListeners();
        setupAuthStateListener();
        console.log('[AuthModal] Initialized');
    }

    /**
     * Create modal DOM structure
     */
    function createModal() {
        // Create overlay wrapper (backdrop)
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay hidden';
        overlay.id = 'auth-modal-overlay';

        // Modal container
        modal = document.createElement('div');
        modal.id = 'auth-modal';
        modal.className = 'modal';
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');

        // Modal content
        modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">
                    <span class="modal-icon">👤</span>
                    Account
                </h2>
                <button class="btn-icon modal-close" aria-label="Close modal">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div id="auth-status" class="auth-status"></div>
                <div id="auth-message" class="auth-message hidden"></div>
            </div>
        `;

        modal.appendChild(modalContent);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Cache elements
        closeButton = modalContent.querySelector('.modal-close');
        statusContainer = document.getElementById('auth-status');
        messageElement = document.getElementById('auth-message');

        // Render initial state
        renderAuthState();
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Close button
        closeButton.addEventListener('click', () => hide());

        // Close on outside click (overlay click)
        const overlay = document.getElementById('auth-modal-overlay');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                hide();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isShown()) {
                hide();
            }
        });
    }

    /**
     * Set up auth state change listener
     */
    function setupAuthStateListener() {
        // Retry up to 3 times with delay in case Auth is still loading
        let attempts = 0;
        const maxAttempts = 3;
        
        function trySetup() {
            const Auth = window.Auth;
            if (!Auth) {
                attempts++;
                if (attempts < maxAttempts) {
                    console.log('[AuthModal] Retrying auth listener setup...');
                    setTimeout(trySetup, 100);
                    return;
                }
                console.error('[AuthModal] Auth module not available after retries');
                return;
            }

            Auth.onAuthStateChange((event, user) => {
                console.log('[AuthModal] Auth state changed:', event);
                
                // Re-render the auth UI on any state change
                // Use setTimeout to ensure Auth module has processed the state
                setTimeout(() => {
                    renderAuthState();
                    
                    // Auto-close modal on successful sign in
                    if (event === 'SIGNED_IN' && user) {
                        console.log('[AuthModal] User signed in, modal will stay open to show status');
                        // Don't auto-hide - let user see they're logged in
                    }
                }, 50);
            });
            
            // Initial render after setting up listener
            setTimeout(renderAuthState, 100);
        }
        
        trySetup();
    }

    /**
     * Render auth state UI
     */
    function renderAuthState() {
        // Guard against missing elements
        if (!statusContainer) {
            statusContainer = document.getElementById('auth-status');
            if (!statusContainer) return;
        }
        
        const Auth = window.Auth;
        if (!Auth) {
            console.warn('[AuthModal] Auth not available for render');
            return;
        }
        
        let user = null;
        
        // Try to get user - handle case where Auth module exists but not initialized
        try {
            user = Auth.getCurrentUser ? Auth.getCurrentUser() : null;
        } catch (e) {
            console.warn('[AuthModal] Error getting user:', e);
        }
        
        // If no user from getCurrentUser, check if we have a recent auth event
        if (!user && Auth._lastUser) {
            user = Auth._lastUser;
        }

        if (user) {
            renderLoggedInState(user);
        } else {
            renderLoggedOutState();
        }
    }

    /**
     * Render logged in state
     */
    function renderLoggedInState(user) {
        const syncStatus = window.Sync?.getStatus() || {};
        const pendingOps = syncStatus.pendingOperations || 0;
        const lastSync = syncStatus.lastSyncTimeFormatted || 'Never';
        const hasErrors = (syncStatus.errorCount || 0) > 0;

        statusContainer.innerHTML = `
            <div class="auth-logged-in">
                <div class="user-info">
                    <div class="user-avatar">
                        ${getAvatar(user.email)}
                    </div>
                    <div class="user-details">
                        <div class="user-email">${escapeHtml(user.email)}</div>
                        <div class="user-meta">
                            <span class="badge ${syncStatus.isOnline ? 'badge-success' : 'badge-warning'}">
                                ${syncStatus.isOnline ? 'Online' : 'Offline'}
                            </span>
                            ${user.last_sign_in_at ? `
                                <span class="text-muted">
                                    Last login: ${formatDate(user.last_sign_in_at)}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <div class="sync-status-section mt-3">
                    <div class="sync-status ${syncStatus.isOnline ? 'online' : 'offline'}">
                        <div class="sync-indicator"></div>
                        <div class="sync-info">
                            <div class="sync-text">
                                ${syncStatus.isOnline ? 'Synced' : 'Offline'}
                                ${pendingOps > 0 ? `<span class="badge badge-warning ml-2">${pendingOps} pending</span>` : ''}
                                ${hasErrors ? `<span class="badge badge-danger ml-2">${syncStatus.errorCount} errors</span>` : ''}
                            </div>
                            <div class="sync-subtext text-muted text-sm mt-1">
                                Last sync: ${lastSync}
                                ${syncStatus.isOnline ? '• Data synced across devices' : '• Changes saved locally'}
                            </div>
                        </div>
                    </div>
                    
                    ${pendingOps > 0 || hasErrors ? `
                        <div class="sync-debug-actions mt-2">
                            ${pendingOps > 0 ? `
                                <button id="view-queue-btn" class="btn btn-sm btn-ghost">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                    View Queue (${pendingOps})
                                </button>
                            ` : ''}
                            ${hasErrors ? `
                                <button id="view-errors-btn" class="btn btn-sm btn-ghost">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                    </svg>
                                    View Errors (${syncStatus.errorCount})
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>

                <div class="auth-actions mt-3">
                    <button id="sync-now-btn" class="btn btn-secondary btn-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6"></path>
                            <path d="M1 20v-6h6"></path>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Sync Now
                    </button>
                    <button id="logout-btn" class="btn btn-danger btn-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Sign Out
                    </button>
                </div>

                <div class="account-info mt-4">
                    <h4 class="text-sm font-semibold mb-2">Account Details</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">User ID</span>
                            <span class="info-value text-mono">${user.id.slice(0, 8)}...</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Created</span>
                            <span class="info-value">${formatDate(user.created_at)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Attach event listeners
        const logoutBtn = statusContainer.querySelector('#logout-btn');
        const syncNowBtn = statusContainer.querySelector('#sync-now-btn');
        const viewQueueBtn = statusContainer.querySelector('#view-queue-btn');
        const viewErrorsBtn = statusContainer.querySelector('#view-errors-btn');

        logoutBtn?.addEventListener('click', handleLogout);
        syncNowBtn?.addEventListener('click', handleSyncNow);
        viewQueueBtn?.addEventListener('click', handleViewQueue);
        viewErrorsBtn?.addEventListener('click', handleViewErrors);
    }

    /**
     * Render logged out state
     */
    function renderLoggedOutState() {
        statusContainer.innerHTML = `
            <div class="auth-logged-out">
                <div class="auth-header text-center mb-4">
                    <div class="auth-icon mb-3">🔐</div>
                    <h3 class="text-lg font-semibold">Sign in to sync your data</h3>
                    <p class="text-muted text-sm">
                        Access your TDEE data from any device
                    </p>
                </div>

                <form id="magic-link-form" class="auth-form">
                    <div class="form-group">
                        <label for="email-input">Email address</label>
                        <input 
                            type="email" 
                            id="email-input" 
                            class="form-control" 
                            placeholder="you@example.com"
                            required
                            autocomplete="email"
                        />
                    </div>

                    <button type="submit" id="send-link-btn" class="btn btn-primary btn-block">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        Send Magic Link
                    </button>
                </form>

                <div class="auth-info mt-4">
                    <div class="info-box">
                        <div class="info-icon">✨</div>
                        <div class="info-text">
                            <strong>No password needed!</strong>
                            <span class="text-sm text-muted">
                                We'll send you a magic link to sign in securely
                            </span>
                        </div>
                    </div>
                </div>

                <div class="auth-benefits mt-4">
                    <h4 class="text-sm font-semibold mb-2">Why sign in?</h4>
                    <ul class="benefits-list">
                        <li>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Access data from any device
                        </li>
                        <li>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Automatic backup & sync
                        </li>
                        <li>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Never lose your progress
                        </li>
                    </ul>
                </div>
            </div>
        `;

        // Attach form listener
        const form = statusContainer.querySelector('#magic-link-form');
        form?.addEventListener('submit', handleMagicLinkSubmit);
    }

    /**
     * Handle magic link form submission
     */
    async function handleMagicLinkSubmit(e) {
        e.preventDefault();

        const Auth = window.Auth;
        if (!Auth) {
            showMessage('Auth module not available', 'error');
            return;
        }

        const emailInput = statusContainer.querySelector('#email-input');
        const submitBtn = statusContainer.querySelector('#send-link-btn');
        const email = emailInput.value.trim();

        if (!email) {
            showMessage('Please enter your email', 'error');
            return;
        }

        // Disable button during request
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
            Sending...
        `;

        // Send magic link
        const result = await Auth.signInWithMagicLink(email);

        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            Send Magic Link
        `;

        if (result.success) {
            showMessage(result.message, 'success');
            emailInput.value = '';
        } else {
            showMessage(result.error || 'Failed to send magic link', 'error');
        }
    }

    /**
     * Handle logout
     */
    async function handleLogout() {
        const Auth = window.Auth;
        if (!Auth) {
            showMessage('Auth module not available', 'error');
            return;
        }

        const result = await Auth.signOut();

        if (result.success) {
            showMessage('Signed out successfully', 'success');
            renderAuthState();
        } else {
            showMessage(result.error || 'Failed to sign out', 'error');
        }
    }

    /**
     * Handle manual sync
     */
    async function handleSyncNow() {
        const Sync = window.Sync;
        if (!Sync) {
            showMessage('Sync module not available', 'error');
            return;
        }

        const syncBtn = statusContainer.querySelector('#sync-now-btn');
        syncBtn.disabled = true;
        syncBtn.innerHTML = 'Syncing...';

        await Sync.syncAll();

        syncBtn.disabled = false;
        syncBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Sync Now
        `;

        showMessage('Sync complete', 'success');
        
        // Re-render to update status
        setTimeout(renderAuthState, 500);
    }
    
    /**
     * Handle view queue button
     */
    function handleViewQueue() {
        const Sync = window.Sync;
        if (!Sync) {
            showMessage('Sync module not available', 'error');
            return;
        }
        
        const queue = Sync.getQueue();
        
        if (queue.length === 0) {
            showMessage('Queue is empty', 'info');
            return;
        }
        
        // Create and show queue modal
        showQueueModal(queue);
    }
    
    /**
     * Handle view errors button
     */
    function handleViewErrors() {
        const Sync = window.Sync;
        if (!Sync) {
            showMessage('Sync module not available', 'error');
            return;
        }
        
        const errors = Sync.getErrorHistory();
        
        if (errors.length === 0) {
            showMessage('No errors in history', 'info');
            return;
        }
        
        // Create and show errors modal
        showErrorsModal(errors);
    }
    
    /**
     * Show queue details modal
     * @param {array} queue - Array of pending operations
     */
    function showQueueModal(queue) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'queue-modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'queue-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">
                        <span class="modal-icon">📋</span>
                        Pending Operations (${queue.length})
                    </h2>
                    <button class="btn-icon modal-close" id="close-queue-modal">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="queue-list">
                        ${queue.map(op => `
                            <div class="queue-item">
                                <div class="queue-item-header">
                                    <span class="badge badge-${op.type === 'create' ? 'success' : op.type === 'update' ? 'info' : 'danger'}">
                                        ${op.type.toUpperCase()}
                                    </span>
                                    <span class="text-mono text-sm">${op.table}</span>
                                    <span class="text-muted text-sm">ID: ${op.id.slice(0, 8)}...</span>
                                </div>
                                <div class="queue-item-details">
                                    <span>Time: ${op.timestampFormatted}</span>
                                    <span>Retries: ${op.retries}</span>
                                    ${op.localId ? `<span>Local ID: ${op.localId}</span>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="modal-actions mt-4">
                        <button id="clear-queue-btn" class="btn btn-danger btn-sm">
                            Clear Queue
                        </button>
                        <button id="close-queue-btn" class="btn btn-secondary btn-sm">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Show modal
        setTimeout(() => {
            overlay.classList.remove('hidden');
            modal.classList.add('show');
            modal.style.animation = 'slideUp var(--transition-normal) ease';
        }, 10);
        
        // Attach close handlers
        document.getElementById('close-queue-modal')?.addEventListener('click', () => {
            closeQueueModal(overlay);
        });
        
        document.getElementById('close-queue-btn')?.addEventListener('click', () => {
            closeQueueModal(overlay);
        });
        
        document.getElementById('clear-queue-btn')?.addEventListener('click', () => {
            const Sync = window.Sync;
            if (Sync) {
                Sync.clearQueue();
                closeQueueModal(overlay);
                showMessage('Queue cleared', 'success');
                renderAuthState();
            }
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeQueueModal(overlay);
            }
        });
    }
    
    /**
     * Close queue modal
     * @param {HTMLElement} overlay - Modal overlay element
     */
    function closeQueueModal(overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => {
            overlay.remove();
        }, 200);
    }
    
    /**
     * Show error history modal
     * @param {array} errors - Array of error entries
     */
    function showErrorsModal(errors) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'errors-modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'errors-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">
                        <span class="modal-icon">⚠️</span>
                        Sync Errors (${errors.length})
                    </h2>
                    <button class="btn-icon modal-close" id="close-errors-modal">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="errors-list">
                        ${errors.map(err => `
                            <div class="error-item">
                                <div class="error-item-header">
                                    <span class="badge badge-danger">${err.operation}</span>
                                    <span class="text-muted text-sm">${err.timestampFormatted}</span>
                                </div>
                                <div class="error-item-message text-danger text-sm mt-1">
                                    ${escapeHtml(err.error)}
                                </div>
                                ${err.details?.operation ? `
                                    <div class="error-item-details text-muted text-xs mt-1">
                                        Type: ${err.details.operation.type}, 
                                        Table: ${err.details.operation.table},
                                        Retries: ${err.details.operation.retries}
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div class="modal-actions mt-4">
                        <button id="clear-errors-btn" class="btn btn-danger btn-sm">
                            Clear Error History
                        </button>
                        <button id="close-errors-btn" class="btn btn-secondary btn-sm">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Show modal
        setTimeout(() => {
            overlay.classList.remove('hidden');
            modal.classList.add('show');
            modal.style.animation = 'slideUp var(--transition-normal) ease';
        }, 10);
        
        // Attach close handlers
        document.getElementById('close-errors-modal')?.addEventListener('click', () => {
            closeErrorsModal(overlay);
        });
        
        document.getElementById('close-errors-btn')?.addEventListener('click', () => {
            closeErrorsModal(overlay);
        });
        
        document.getElementById('clear-errors-btn')?.addEventListener('click', () => {
            const Sync = window.Sync;
            if (Sync) {
                Sync.clearErrorHistory();
                closeErrorsModal(overlay);
                showMessage('Error history cleared', 'success');
                renderAuthState();
            }
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeErrorsModal(overlay);
            }
        });
    }
    
    /**
     * Close errors modal
     * @param {HTMLElement} overlay - Modal overlay element
     */
    function closeErrorsModal(overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => {
            overlay.remove();
        }, 200);
    }

    /**
     * Show message in modal
     */
    function showMessage(message, type = 'info') {
        if (!messageElement) return;

        messageElement.textContent = message;
        messageElement.className = `auth-message ${type}`;
        messageElement.classList.remove('hidden');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, 5000);
    }

    /**
     * Show modal
     */
    function show() {
        const overlay = document.getElementById('auth-modal-overlay');
        if (!overlay || !modal) return;

        overlay.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Trigger slideUp animation
        modal.style.animation = 'slideUp var(--transition-normal) ease';

        // Always re-render auth state when modal opens
        renderAuthState();

        // Focus first interactive element
        setTimeout(() => {
            const firstFocusable = modalContent.querySelector('button, input');
            firstFocusable?.focus();
        }, 100);
    }

    /**
     * Hide modal
     */
    function hide() {
        const overlay = document.getElementById('auth-modal-overlay');
        if (!overlay || !modal) return;

        overlay.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    /**
     * Check if modal is shown
     */
    function isShown() {
        const overlay = document.getElementById('auth-modal-overlay');
        return overlay ? !overlay.classList.contains('hidden') : false;
    }

    /**
     * Generate avatar from email
     */
    function getAvatar(email) {
        const initial = email?.charAt(0).toUpperCase() || '?';
        return `<div class="avatar-placeholder">${initial}</div>`;
    }

    /**
     * Format date
     */
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API
    return {
        init,
        show,
        hide,
        isShown,
        showMessage
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.AuthModal = AuthModal;
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthModal;
}
