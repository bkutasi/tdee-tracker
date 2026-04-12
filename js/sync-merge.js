/**
 * Sync Merge Module - Remote/Local Data Merging
 * Extracted from sync.js (Task 7 - streamline-and-simplify)
 *
 * Usage:
 *   await SyncMerge.fetchAndMergeData();
 *   await SyncMerge.queueLocalEntriesForSync();
 *   const merged = SyncMerge.mergeEntries(remoteEntries);
 */

'use strict';

const SyncMerge = (function() {
    'use strict';

    function _getSyncDebug() {
        if (typeof module !== 'undefined' && module.exports) {
            try { return require('./sync-debug.js'); } catch (_) { return null; }
        }
        if (typeof window !== 'undefined' && window.SyncDebug) return window.SyncDebug;
        return null;
    }

    const _SyncDebug = new Proxy({}, {
        get: function(target, prop) {
            const debug = _getSyncDebug();
            if (debug && debug[prop]) return debug[prop];
            return function() { return null; };
        }
    });

    async function _fetchRemoteData() {
        const Sync = window.Sync;
        if (!Sync || typeof Sync.fetchWeightEntries !== 'function') {
            _SyncDebug.error('Sync.fetchWeightEntries not available');
            return null;
        }
        const remoteResult = await Sync.fetchWeightEntries();
        if (!remoteResult.success) {
            _SyncDebug.error('Failed to fetch remote data:', remoteResult.error);
            _showToast('Failed to fetch remote data. Using local data only.', 'error');
            return null;
        }
        const remoteEntries = remoteResult.entries || [];
        _SyncDebug.info(`Fetched ${remoteEntries.length} remote entries`);
        return remoteEntries;
    }

    function _mergeAndSave(remoteEntries) {
        const Storage = window.Storage;
        const mergedEntries = mergeEntries(remoteEntries);
        _SyncDebug.info(`Merged ${mergedEntries.length} entries total`);

        const allEntries = Storage.getAllEntries();
        mergedEntries.forEach(entry => {
            if (entry.date) {
                allEntries[entry.date] = {
                    weight: entry.weight,
                    calories: entry.calories,
                    notes: entry.notes || '',
                    updatedAt: entry.updated_at || new Date().toISOString()
                };
            }
        });

        localStorage.setItem('tdee_entries', JSON.stringify(allEntries));
        Storage.entriesCache = null;
        return mergedEntries;
    }

    function _showSyncResult(remoteCount, mergedCount) {
        _refreshUI();
        if (remoteCount > 0) {
            _showToast(`Synced ${remoteCount} remote entrie${remoteCount === 1 ? 'y' : 's'}`, 'success');
        } else {
            _showToast('Sync complete - no new data', 'success');
        }
        window.dispatchEvent(new CustomEvent('sync:data-merged', {
            detail: { count: mergedCount, remoteCount }
        }));
    }

    async function fetchAndMergeData(options = {}) {
        const { refreshUI: _refreshUI, showToast: _showToastCb } = options;
        try {
            _SyncDebug.info('Fetching remote data...');
            const remoteEntries = await _fetchRemoteData();
            if (!remoteEntries) return { success: false, remoteEntries: null };

            const mergedEntries = _mergeAndSave(remoteEntries);
            _showSyncResult(remoteEntries.length, mergedEntries.length);
            await queueLocalEntriesForSync(remoteEntries);
            return { success: true, remoteEntries, mergedEntries };
        } catch (error) {
            _SyncDebug.error('Fetch and merge failed:', error);
            _showToast('Sync failed. Your local data is safe.', 'error');
            return { success: false, error };
        }
    }

    async function _getRemoteDates(cachedRemoteEntries) {
        const remoteDates = new Set();
        let entries = cachedRemoteEntries;
        if (!entries) {
            const Sync = window.Sync;
            if (Sync && typeof Sync.fetchWeightEntries === 'function') {
                const remoteResult = await Sync.fetchWeightEntries();
                if (remoteResult.success && remoteResult.entries) entries = remoteResult.entries;
            }
        }
        if (entries) {
            entries.forEach(entry => { if (entry.date) remoteDates.add(entry.date); });
            _SyncDebug.info(`Found ${remoteDates.size} remote dates`);
        }
        return remoteDates;
    }

    function _isValidEntryForSync(entry) {
        const hasWeight = entry.weight !== null && entry.weight !== undefined && entry.weight !== '';
        const hasCalories = entry.calories !== null && entry.calories !== undefined && entry.calories !== '';
        return hasWeight || hasCalories;
    }

    function _queueEntryForSync(entry, userId) {
        const SyncQueue = window.SyncQueue;
        if (!SyncQueue || typeof SyncQueue.queueOperation !== 'function') {
            _SyncDebug.error('SyncQueue.queueOperation not available');
            return;
        }
        SyncQueue.queueOperation('create', 'weight_entries', {
            user_id: userId,
            date: entry.date,
            weight: entry.weight || null,
            calories: entry.calories || null,
            notes: entry.notes || null
        }, entry.date);
    }

    function _processEntriesForQueue(localEntries, remoteDates, userId) {
        let queuedCount = 0, skippedCount = 0, invalidCount = 0;
        localEntries.forEach(entry => {
            if (remoteDates.has(entry.date)) {
                _SyncDebug.debug(`Skipping ${entry.date} - already exists remotely`);
                skippedCount++;
                return;
            }
            if (!_isValidEntryForSync(entry)) {
                _SyncDebug.warn(`Skipping ${entry.date} - no valid weight or calories`);
                invalidCount++;
                return;
            }
            _queueEntryForSync(entry, userId);
            queuedCount++;
        });
        return { queuedCount, skippedCount, invalidCount };
    }

    function _showQueueNotifications(invalidCount, skippedCount) {
        if (invalidCount > 0) {
            _SyncDebug.warn(`${invalidCount} invalid entries skipped during queue`);
            _showToast(`${invalidCount} invalid entrie${invalidCount === 1 ? 'y was' : 's were'} skipped`, 'info');
        }
        if (skippedCount > 0) {
            _SyncDebug.debug(`${skippedCount} entries already exist remotely, skipped`);
        }
    }

    async function queueLocalEntriesForSync(options = {}) {
        // Accept either an options object (from sync-core) or a direct array (legacy)
        const cachedRemoteEntries = Array.isArray(options) ? options : null;
        const Storage = window.Storage;
        const Auth = window.Auth;

        if (!Auth || typeof Auth.isAuthenticated !== 'function' || !Auth.isAuthenticated()) {
            _SyncDebug.info('Not authenticated - skipping');
            return { success: false, error: 'Not authenticated' };
        }

        let session;
        if (typeof Auth.getSession === 'function') {
            const sessionResult = await Auth.getSession();
            session = sessionResult && sessionResult.session ? sessionResult.session : null;
        }
        if (!session || !session.user) {
            _SyncDebug.info('No user - skipping');
            return { success: false, error: 'No user found' };
        }
        const user = session.user;

        const allEntriesObj = Storage.getAllEntries();
        const localEntries = Object.entries(allEntriesObj || {}).map(([date, entry]) => ({ date, ...entry }));

        if (localEntries.length === 0) {
            _SyncDebug.info('No local entries to queue');
            return { success: true, queued: 0 };
        }
        _SyncDebug.info(`Found ${localEntries.length} local entries to potentially queue`);

        const remoteDates = await _getRemoteDates(cachedRemoteEntries);
        const { queuedCount, skippedCount, invalidCount } = _processEntriesForQueue(localEntries, remoteDates, user.id);
        _SyncDebug.info(`Queue processing: ${queuedCount} queued, ${skippedCount} skipped, ${invalidCount} invalid`);
        _showQueueNotifications(invalidCount, skippedCount);

        if (navigator.onLine) {
            const SyncQueue = window.SyncQueue;
            if (SyncQueue && typeof SyncQueue.syncAll === 'function') {
                _SyncDebug.info('Triggering immediate sync...');
                await SyncQueue.syncAll();
            }
        }
        return { success: true, queued: queuedCount };
    }

    function mergeEntries(remoteEntries) {
        const Storage = window.Storage;
        const localEntriesObj = Storage.getAllEntries();
        const localEntries = Object.entries(localEntriesObj || {}).map(([date, entry]) => ({ date, ...entry }));

        const localMap = new Map();
        localEntries.forEach(entry => localMap.set(entry.date, entry));

        const merged = [];
        remoteEntries.forEach(remote => {
            const local = localMap.get(remote.date);
            if (!local) {
                merged.push(remote);
            } else {
                const remoteTime = new Date(remote.updated_at || remote.created_at).getTime();
                const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
                if (remoteTime > localTime) {
                    merged.push(remote);
                } else {
                    merged.push(local);
                }
                localMap.delete(remote.date);
            }
        });

        localMap.forEach(entry => merged.push(entry));
        merged.sort((a, b) => new Date(b.date) - new Date(a.date));
        return merged;
    }

    function _refreshUI() {
        _SyncDebug.info('Refreshing UI components');
        if (window.Dashboard && typeof window.Dashboard.refresh === 'function') window.Dashboard.refresh();
        if (window.Chart && typeof window.Chart.refresh === 'function') window.Chart.refresh();
        if (window.WeeklyView && typeof window.WeeklyView.refresh === 'function') window.WeeklyView.refresh();
        window.dispatchEvent(new CustomEvent('ui:refresh'));
    }

    function _showToast(message, type = 'info') {
        _SyncDebug.info('Toast:', message);
        if (window.Components && typeof window.Components.showToast === 'function') {
            window.Components.showToast(message, type);
            return;
        }
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;';
            document.body.appendChild(toastContainer);
        }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `padding:12px 20px;margin-top:10px;border-radius:8px;background:${type==='success'?'#10b981':type==='error'?'#ef4444':'#3b82f6'};color:white;font-size:14px;box-shadow:0 4px 6px rgba(0,0,0,0.1);animation:slideIn 0.3s ease;`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    return {
        mergeEntries, fetchAndMergeData, queueLocalEntriesForSync,
        _mergeAndSave, _fetchRemoteData, _getRemoteDates, _showSyncResult,
        _isValidEntryForSync, _queueEntryForSync, _processEntriesForQueue, _showQueueNotifications
    };
})();

if (typeof window !== 'undefined') window.SyncMerge = SyncMerge;
if (typeof module !== 'undefined' && module.exports) module.exports = SyncMerge;
