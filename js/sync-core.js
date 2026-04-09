/**
 * Sync Core Module - Orchestrator for SyncErrors, SyncQueue, SyncMerge
 *
 * Load order (enforced in index.html):
 *   1. sync-errors.js  2. sync-queue.js  3. sync-merge.js  4. sync-core.js
 */

'use strict';

function _getSyncDebug() {
    if (typeof module !== 'undefined' && module.exports) {
        try { return require('./sync-debug.js'); } catch (_) { return null; }
    }
    if (typeof window !== 'undefined' && window.SyncDebug) return window.SyncDebug;
    return null;
}

const _SyncDebug = new Proxy({}, {
    get: function(_, prop) {
        const debug = _getSyncDebug();
        if (debug && debug[prop]) return debug[prop];
        return function() { return null; };
    }
});

const Sync = (function() {
    'use strict';

    var AppConstants;
    if (typeof window !== 'undefined' && window.AppConstants) {
        AppConstants = window.AppConstants;
    } else if (typeof global !== 'undefined' && global.AppConstants) {
        AppConstants = global.AppConstants;
    } else {
        AppConstants = {
            SYNC_INTERVAL_MS: 30000, MAX_RETRIES: 3, AUTH_TIMEOUT_MS: 5000,
            AUTH_POLL_INTERVAL_MS: 100, TOAST_AUTO_HIDE_DELAY_MS: 5000,
            MAX_SYNC_ERROR_HISTORY: 50
        };
    }

    let isInitialized = false;
    const SYNC_INTERVAL = AppConstants?.SYNC_INTERVAL_MS || 30000;
    const AUTH_TIMEOUT = AppConstants?.AUTH_TIMEOUT_MS || 5000;
    const AUTH_POLL_INTERVAL = AppConstants?.AUTH_POLL_INTERVAL_MS || 100;
    const TOAST_AUTO_HIDE_DELAY = AppConstants?.TOAST_AUTO_HIDE_DELAY_MS || 5000;

    async function init() {
        if (isInitialized) { _SyncDebug.info('Already initialized'); return; }
        if (typeof SyncErrors?.loadErrorHistory === 'function') SyncErrors.loadErrorHistory();
        if (typeof SyncQueue?.loadSyncQueue === 'function') SyncQueue.loadSyncQueue();
        setupNetworkListeners();
        setupAuthStateListener();
        const Auth = window.Auth;
        if (Auth) {
            _SyncDebug.info('Waiting for auth session...');
            const authReady = await waitForAuth(Auth, AUTH_TIMEOUT);
            if (authReady) _SyncDebug.info('Auth session ready');
            else _SyncDebug.warn('Auth timeout - sync will retry when auth ready');
        }
        startBackgroundSync();
        isInitialized = true;
        _SyncDebug.info('Initialized');
    }

    async function waitForAuth(Auth, timeout) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            try { const { session } = await Auth.getSession(); if (session) return true; }
            catch (error) { _SyncDebug.debug(`Auth check pending: ${error.message}`); }
            await sleep(AUTH_POLL_INTERVAL);
        }
        return false;
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function setupNetworkListeners() {
        window.addEventListener('online', async () => { _SyncDebug.info('Network online - starting sync'); await syncAll(); });
        window.addEventListener('offline', () => { _SyncDebug.warn('Network offline - queuing operations'); });
    }

    function setupAuthStateListener() {
        const Auth = window.Auth;
        if (!Auth) { _SyncDebug.warn('Auth module not available - skipping auth listener setup'); return; }
        Auth.onAuthStateChange(async (event) => {
            _SyncDebug.info('Auth state changed:', event);
            if (event === 'SIGNED_IN') {
                _SyncDebug.info('User signed in - syncing bidirectional data...');
                await fetchAndMergeData();
                const backfillResult = await queueLocalEntriesForSync();
                if (backfillResult.success && backfillResult.queued > 0) {
                    _SyncDebug.info(`Queued ${backfillResult.queued} local entries for upload`);
                    showToast(`Syncing ${backfillResult.queued} local entr${backfillResult.queued === 1 ? 'y' : 'ies'} to cloud...`, 'info');
                }
            } else if (event === 'SIGNED_OUT') {
                _SyncDebug.info('User signed out - pausing sync');
            }
        });
    }

    function startBackgroundSync() {
        if (typeof SyncQueue?.startBackgroundSync === 'function') { SyncQueue.startBackgroundSync(); return; }
        setInterval(async () => { if (navigator.onLine && !isSyncing) await syncAll(); }, SYNC_INTERVAL);
    }

    function refreshUI() {
        if (window.Dashboard?.refresh) window.Dashboard.refresh();
        if (window.Chart?.refresh) window.Chart.refresh();
        if (window.WeeklyView?.refresh) window.WeeklyView.refresh();
        window.dispatchEvent(new CustomEvent('ui:refresh'));
    }

    function showToast(message, type) {
        if (type === undefined) type = 'info';
        _SyncDebug.info(`Toast (${type}):`, message);
        if (window.Components?.showToast) { window.Components.showToast(message, type); return; }
        if (typeof document === 'undefined') return;
        let tc = document.getElementById('toast-container');
        if (!tc) { tc = document.createElement('div'); tc.id = 'toast-container'; tc.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;'; document.body.appendChild(tc); }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `padding:12px 20px;margin-top:10px;border-radius:8px;background:${type==='success'?'#10b981':type==='error'?'#ef4444':'#3b82f6'};color:white;font-size:14px;box-shadow:0 4px 6px rgba(0,0,0,0.1);animation:slideIn 0.3s ease;`;
        toast.textContent = message;
        tc.appendChild(toast);
        setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease'; setTimeout(() => toast.remove(), 300); }, TOAST_AUTO_HIDE_DELAY);
    }

    async function syncAll() { if (SyncQueue?.syncAll) return SyncQueue.syncAll(); _SyncDebug.error('SyncQueue.syncAll not available'); }
    async function saveWeightEntry(entry) { if (SyncQueue?.saveWeightEntry) return SyncQueue.saveWeightEntry(entry); _SyncDebug.error('SyncQueue.saveWeightEntry not available'); return { success: false, error: 'SyncQueue not available' }; }
    async function updateWeightEntry(entry) { if (SyncQueue?.updateWeightEntry) return SyncQueue.updateWeightEntry(entry); _SyncDebug.error('SyncQueue.updateWeightEntry not available'); return { success: false, error: 'SyncQueue not available' }; }
    async function deleteWeightEntry(id) { if (SyncQueue?.deleteWeightEntry) return SyncQueue.deleteWeightEntry(id); _SyncDebug.error('SyncQueue.deleteWeightEntry not available'); return { success: false, error: 'SyncQueue not available' }; }
    async function fetchWeightEntries() { if (SyncQueue?.fetchWeightEntries) return SyncQueue.fetchWeightEntries(); _SyncDebug.error('SyncQueue.fetchWeightEntries not available'); return { success: false, error: 'SyncQueue not available' }; }
    function mergeEntries(remoteEntries) { if (SyncMerge?.mergeEntries) return SyncMerge.mergeEntries(remoteEntries); _SyncDebug.error('SyncMerge.mergeEntries not available'); return remoteEntries || []; }
    async function fetchAndMergeData() { if (SyncMerge?.fetchAndMergeData) return SyncMerge.fetchAndMergeData({ refreshUI, showToast }); _SyncDebug.error('SyncMerge.fetchAndMergeData not available'); }
    async function queueLocalEntriesForSync() { if (SyncMerge?.queueLocalEntriesForSync) return SyncMerge.queueLocalEntriesForSync({ showToast }); _SyncDebug.error('SyncMerge.queueLocalEntriesForSync not available'); return { success: false, error: 'SyncMerge not available' }; }

    function getStatus() {
        const Auth = window.Auth;
        const authDetails = Auth ? { isAuthenticated: Auth.isAuthenticated(), hasSession: Auth.isAuthenticated() || false, currentUser: Auth.getCurrentUser?.email ?? null } : { isAuthenticated: false };
        const qs = SyncQueue?.getStatus?.() || { isSyncing: false, lastSyncTime: null, pendingOperations: 0 };
        const eh = SyncErrors?.getErrorHistory?.() || [];
        return { isOnline: navigator.onLine, ...authDetails, pendingOperations: qs.pendingOperations, lastSyncTime: qs.lastSyncTime, lastSyncTimeFormatted: qs.lastSyncTime ? new Date(qs.lastSyncTime).toLocaleString() : 'Never', isSyncing: qs.isSyncing, errorCount: eh.length, recentErrors: eh.slice(0, 5), debugMode: _SyncDebug.DEBUG_MODE };
    }

    function getQueue() {
        if (!SyncQueue?.getQueue) return [];
        return SyncQueue.getQueue().map(op => ({ ...op, timestampFormatted: new Date(op.timestamp).toLocaleString() }));
    }

    function getLastSyncTime() { return SyncQueue?.getLastSyncTime?.() || 'Never'; }
    function getErrorHistory() { return SyncErrors?.getErrorHistory?.() || []; }
    function clearErrorHistory() { SyncErrors?.clearErrorHistory?.(); }
    function clearQueue() { SyncQueue?.clearQueue?.(); }

    function filterInvalidOperations() {
        if (!SyncErrors?.filterInvalidOperations) return { filtered: 0, remaining: 0 };
        return SyncErrors.filterInvalidOperations({
            getQueue: () => SyncQueue?.getQueue?.() || [],
            setQueue: (q) => { SyncQueue?.setQueue?.(q); },
            saveQueue: () => { SyncQueue?.saveQueue?.(); },
            showToast
        });
    }

    function queueOperation(type, table, data, localId) {
        if (SyncQueue?.queueOperation) return SyncQueue.queueOperation(type, table, data, localId);
        _SyncDebug.error('SyncQueue.queueOperation not available');
        return null;
    }

    return {
        init, syncAll, saveWeightEntry, updateWeightEntry, deleteWeightEntry,
        fetchWeightEntries, mergeEntries, fetchAndMergeData, queueLocalEntriesForSync,
        getStatus, getQueue, getLastSyncTime, getErrorHistory, clearErrorHistory,
        clearQueue, filterInvalidOperations, queueOperation
    };
})();

if (typeof window !== 'undefined') window.Sync = Sync;
if (typeof module !== 'undefined' && module.exports) module.exports = Sync;
