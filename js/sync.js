/**
 * Sync Module - Offline-first data synchronization between LocalStorage and Supabase.
 *
 * Consolidated from: sync-errors.js, sync-queue.js, sync-merge.js, sync-core.js
 * Architecture: Single IIFE with direct internal function calls.
 *
 * Features:
 * - Optimistic UI updates (LocalStorage first, instant feedback)
 * - Background sync queue (processes when online + authenticated)
 * - Conflict resolution (newest timestamp wins)
 * - Offline support (queue operations, sync when reconnected)
 * - Multi-device sync (automatic merge on login)
 * - Error history persistence and stuck operation cleanup
 */

'use strict';

const Sync = (function() {
    'use strict';

    // ─── SyncDebug Reference ───────────────────────────────────────────────
    // Direct global reference — no proxy pattern, no _SyncDebug

    const SyncDebugRef = (typeof window !== 'undefined' && window.SyncDebug)
        ? window.SyncDebug
        : { log: function() {}, info: function() {}, warn: function() {}, error: function() {}, debug: function() {} };

    // ─── AppConstants Resolution ────────────────────────────────────────────

    var AppConstants;
    if (typeof window !== 'undefined' && window.AppConstants) {
        AppConstants = window.AppConstants;
    } else if (typeof global !== 'undefined' && global.AppConstants) {
        AppConstants = global.AppConstants;
    } else {
        AppConstants = {
            SYNC_INTERVAL_MS: 30000,
            MAX_RETRIES: 3,
            AUTH_TIMEOUT_MS: 5000,
            AUTH_POLL_INTERVAL_MS: 100,
            TOAST_AUTO_HIDE_DELAY_MS: 5000,
            MAX_SYNC_ERROR_HISTORY: 50
        };
    }

    // ─── Constants ──────────────────────────────────────────────────────────

    const SYNC_INTERVAL = AppConstants?.SYNC_INTERVAL_MS || 30000;
    const MAX_RETRIES = AppConstants?.MAX_RETRIES || 3;
    const AUTH_TIMEOUT = AppConstants?.AUTH_TIMEOUT_MS || 5000;
    const AUTH_POLL_INTERVAL = AppConstants?.AUTH_POLL_INTERVAL_MS || 100;
    const TOAST_AUTO_HIDE_DELAY = AppConstants?.TOAST_AUTO_HIDE_DELAY_MS || 5000;
    const MAX_ERROR_HISTORY = AppConstants?.MAX_SYNC_ERROR_HISTORY || 50;
    const QUEUE_KEY = 'tdee_sync_queue';
    const SYNC_HISTORY_KEY = 'tdee_sync_history';

    // ─── State ──────────────────────────────────────────────────────────────

    let isInitialized = false;
    let syncQueue = [];
    let isSyncing = false;
    let lastSyncTime = null;
    let syncErrorHistory = [];

    // ─── Error History Functions (from sync-errors.js) ──────────────────────

    function loadErrorHistory() {
        try {
            const stored = localStorage.getItem(SYNC_HISTORY_KEY);
            if (stored) {
                syncErrorHistory = JSON.parse(stored);
                SyncDebugRef.info(`Loaded ${syncErrorHistory.length} error history entries`);
            }
        } catch (error) {
            SyncDebugRef.error(`Failed to load error history: ${error.message}`);
            syncErrorHistory = [];
        }
    }

    function saveErrorHistory() {
        try {
            localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(syncErrorHistory));
        } catch (error) {
            SyncDebugRef.error(`Failed to save error history: ${error.message}`);
        }
    }

    function recordError(operation, error, details) {
        if (details === undefined) details = {};

        const errorMessage = (error && error.message) ? error.message : error;

        const errorEntry = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            operation,
            error: errorMessage,
            details,
            resolved: false
        };

        syncErrorHistory.unshift(errorEntry);

        if (syncErrorHistory.length > MAX_ERROR_HISTORY) {
            syncErrorHistory = syncErrorHistory.slice(0, MAX_ERROR_HISTORY);
        }

        saveErrorHistory();
        SyncDebugRef.error(`Error recorded: ${operation} - ${errorMessage}`);
    }

    function getErrorHistory() {
        return syncErrorHistory.map(err => ({
            ...err,
            timestampFormatted: new Date(err.timestamp).toLocaleString()
        }));
    }

    function clearErrorHistory() {
        syncErrorHistory = [];
        saveErrorHistory();
        SyncDebugRef.log('Error history cleared', 'info');
    }

    function removeStuckOperations() {
        const initialCount = syncQueue.length;
        const stuckOps = syncQueue.filter(op => op.retries > MAX_RETRIES);
        const keptOps = syncQueue.filter(op => op.retries <= MAX_RETRIES);

        if (stuckOps.length > 0) {
            syncQueue = keptOps;
            saveSyncQueue();
            SyncDebugRef.log(`Removed ${stuckOps.length} stuck operations (retry limit exceeded). ${keptOps.length} operations remaining.`, 'warn');
            showToast(`Removed ${stuckOps.length} stuck operations from queue`, 'info');
            return { removed: stuckOps.length, remaining: keptOps.length };
        }

        SyncDebugRef.log('No stuck operations found in queue', 'info');
        return { removed: 0, remaining: initialCount };
    }

    function filterInvalidOperations() {
        const initialCount = syncQueue.length;
        let removedCount = 0;

        const filteredQueue = syncQueue.filter(op => {
            if (op.table === 'weight_entries' && (op.type === 'create' || op.type === 'update')) {
                const hasWeight = op.data.weight !== null && op.data.weight !== undefined && op.data.weight !== '';
                const hasCalories = op.data.calories !== null && op.data.calories !== undefined && op.data.calories !== '';

                if (!hasWeight && !hasCalories) {
                    SyncDebugRef.log(`Removing invalid operation [ID: ${op.id}] - missing both weight and calories`, 'warn');
                    removedCount++;
                    return false;
                }
            }
            return true;
        });

        if (removedCount > 0) {
            syncQueue = filteredQueue;
            saveSyncQueue();
            SyncDebugRef.log(`Filtered ${removedCount} invalid operations from queue (${initialCount} → ${filteredQueue.length})`, 'warn');
            showToast(`Removed ${removedCount} invalid entries from sync queue (must have weight or calories)`, 'info');
            return { filtered: removedCount, remaining: filteredQueue.length };
        }

        return { filtered: 0, remaining: filteredQueue.length };
    }

    // ─── Queue Functions (from sync-queue.js) ───────────────────────────────

    function loadSyncQueue() {
        try {
            const stored = localStorage.getItem(QUEUE_KEY);
            if (stored) {
                syncQueue = JSON.parse(stored);
                SyncDebugRef.info(`Loaded ${syncQueue.length} pending operations`);
            }
        } catch (error) {
            SyncDebugRef.error(`Failed to load queue: ${error.message}`);
            syncQueue = [];
        }
    }

    function saveSyncQueue() {
        try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(syncQueue));
        } catch (error) {
            SyncDebugRef.error(`Failed to save queue: ${error.message}`);
        }
    }

    function queueOperation(type, table, data, localId) {
        if (localId === undefined) localId = null;
        const operation = {
            id: crypto.randomUUID(),
            type,
            table,
            data,
            localId,
            timestamp: Date.now(),
            retries: 0
        };

        syncQueue.push(operation);
        saveSyncQueue();

        SyncDebugRef.log(`Queued ${type} operation for ${table} [ID: ${operation.id}]`, 'info', { operation });

        if (navigator.onLine) {
            syncAll();
        }

        return operation.id;
    }

    function clearQueue() {
        const count = syncQueue.length;
        syncQueue = [];
        saveSyncQueue();
        SyncDebugRef.log(`Queue cleared (${count} operations removed)`, 'warn');
    }

    function canSync() {
        const Auth = window.Auth;
        if (!Auth) {
            SyncDebugRef.error('Auth module not available');
            return false;
        }

        const isAuthenticated = Auth.isAuthenticated();
        const isOnline = navigator.onLine;

        if (!isAuthenticated) {
            SyncDebugRef.warn('Not authenticated - skipping sync');
            return false;
        }

        if (!isOnline) {
            SyncDebugRef.info('Offline - will queue operations for later sync');
            return false;
        }

        SyncDebugRef.debug(`canSync: authenticated=${isAuthenticated}, online=${isOnline} → can sync now`);
        return true;
    }

    // ─── Supabase API Functions (from sync-queue.js) ────────────────────────

    async function getSupabase() {
        const Auth = window.Auth;
        if (!Auth) {
            SyncDebugRef.log('getSupabase: Auth module not available', 'error');
            return null;
        }

        try {
            const { session } = await Auth.getSession();
            if (!session) {
                SyncDebugRef.log('getSupabase: No active session', 'warn');
                return null;
            }

            const supabase = Auth._getSupabase ? Auth._getSupabase() : null;
            if (!supabase) {
                SyncDebugRef.log('getSupabase: Auth._getSupabase() returned null', 'error');
            } else {
                SyncDebugRef.log('getSupabase: Supabase client retrieved successfully', 'debug');
            }
            return supabase;
        } catch (error) {
            SyncDebugRef.log(`getSupabase: Error getting session: ${error.message}`, 'error', { error });
            return null;
        }
    }

    async function createRecord(table, data) {
        const supabase = await getSupabase();

        if (!supabase) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            if (table === 'weight_entries' && data.user_id && data.date) {
                const { data: existing, error: fetchError } = await supabase
                    .from(table)
                    .select('id')
                    .eq('user_id', data.user_id)
                    .eq('date', data.date)
                    .maybeSingle();

                if (fetchError) {
                    return { success: false, error: fetchError };
                }

                if (existing && existing.id) {
                    SyncDebugRef.log(`Entry already exists [user_id: ${data.user_id}, date: ${data.date}] - converting to UPDATE`, 'info');
                    return await updateRecord(table, { id: existing.id, ...data });
                }
            }

            const { data: result, error } = await supabase
                .from(table)
                .insert(data)
                .select()
                .single();

            if (error) {
                return { success: false, error };
            }

            return { success: true, data: result };
        } catch (error) {
            return { success: false, error };
        }
    }

    async function updateRecord(table, data) {
        const supabase = await getSupabase();

        if (!supabase) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const { id, ...updates } = data;
            const { data: result, error } = await supabase
                .from(table)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                return { success: false, error };
            }

            return { success: true, data: result };
        } catch (error) {
            return { success: false, error };
        }
    }

    async function deleteRecord(table, data) {
        const supabase = await getSupabase();

        if (!supabase) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', data.id);

            if (error) {
                return { success: false, error };
            }

            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    }

    async function executeOperation(operation) {
        const { type, table, data, id } = operation;

        SyncDebugRef.log(`Executing ${type} on ${table} [ID: ${id}]`, 'debug');

        try {
            let result;

            switch (type) {
                case 'create':
                    result = await createRecord(table, data);
                    break;
                case 'update':
                    result = await updateRecord(table, data);
                    break;
                case 'delete':
                    result = await deleteRecord(table, data);
                    break;
                default:
                    SyncDebugRef.log(`Unknown operation type: ${type}`, 'error', { operation });
                    return false;
            }

            if (result.success) {
                SyncDebugRef.log(`${type} ${table} synced successfully [ID: ${id}]`, 'info');
                return true;
            }

            const errorMessage = result.error?.message || result.error || 'Unknown error';
            const errorCode = result.error?.code || result.error?.status;
            const isDuplicateKey = errorMessage.includes('duplicate key') ||
                                   errorCode === '409' ||
                                   errorCode === '23505';

            if (isDuplicateKey) {
                SyncDebugRef.log(`Duplicate key detected [ID: ${id}] - removing from queue`, 'warn');
                recordError(`${type} ${table} (duplicate)`, result.error || new Error('Duplicate key'), { operation });
                return false;
            }

            recordError(`${type} ${table}`, result.error || new Error('Operation failed'), { operation });
            return false;
        } catch (error) {
            SyncDebugRef.log(`Operation failed with exception [ID: ${id}]: ${error.message}`, 'error', { operation, error });
            recordError(operation.type, error, { operation });
            return false;
        }
    }

    function sleepWithBackoff(attempt) {
        const baseDelay = 1000;
        const maxDelay = 30000;
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    async function syncAll() {
        const TIMEOUT_MS = 30000;

        const syncPromise = (async () => {
            if (isSyncing) {
                SyncDebugRef.log('Sync already in progress', 'warn');
                return;
            }

            if (!canSync()) {
                return;
            }

            if (syncQueue.length === 0) {
                SyncDebugRef.log('No pending operations', 'info');
                return;
            }

            isSyncing = true;
            const startTime = Date.now();
            const operationCount = syncQueue.length;
            SyncDebugRef.log(`Starting sync of ${operationCount} operations`, 'info');

            const failed = [];
            const removed = [];

            for (const operation of syncQueue) {
                try {
                    let success = false;
                    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                        success = await executeOperation(operation);
                        if (success) {
                            break;
                        }

                        const errorMessage = operation.lastError?.message || '';
                        const isDuplicateKey = errorMessage.includes('duplicate key') ||
                                              errorMessage.includes('23505');

                        if (isDuplicateKey) {
                            removed.push(operation);
                            break;
                        }

                        if (attempt === MAX_RETRIES) {
                            operation.retries = (operation.retries || 0) + 1;
                            if (operation.retries > MAX_RETRIES) {
                                removed.push(operation);
                            } else {
                                failed.push(operation);
                            }
                            break;
                        }

                        SyncDebugRef.log(`Attempt ${attempt + 1} failed, retrying with backoff...`, 'warn');
                        await sleepWithBackoff(attempt);
                    }
                } catch (error) {
                    SyncDebugRef.log(`Operation failed: ${error.message}`, 'error', { operation, error });
                    recordError(operation.type, error, { operation });
                    failed.push(operation);
                }
            }

            syncQueue = failed;
            saveSyncQueue();

            isSyncing = false;
            lastSyncTime = Date.now();
            const duration = Date.now() - startTime;

            SyncDebugRef.log(`Sync complete: ${operationCount - failed.length - removed.length}/${operationCount} succeeded. ${failed.length} pending retry. ${removed.length} removed (retry limit).`,
                failed.length > 0 || removed.length > 0 ? 'warn' : 'info');

            if (removed.length > 0) {
                showToast(`${removed.length} operations removed from queue (max retries exceeded)`, 'error');
            }

            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('sync:complete', {
                    detail: {
                        success: failed.length === 0 && removed.length === 0,
                        processed: operationCount - failed.length - removed.length,
                        failed: failed.length,
                        removed: removed.length,
                        duration
                    }
                }));
            }
        })();

        const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`syncAll timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
        });

        try {
            await Promise.race([syncPromise, timeout]);
        } catch (error) {
            SyncDebugRef.log(`syncAll error: ${error.message}`, 'error', { error });
            isSyncing = false;
            recordError('syncAll', error);
        }
    }

    // ─── CRUD Operations (from sync-queue.js) ───────────────────────────────

    async function saveWeightEntry(entry) {
        if (!entry || typeof entry !== 'object') {
            return { success: false, error: 'Entry must be an object' };
        }
        if (!entry.date) {
            return { success: false, error: 'Entry must include date field' };
        }

        const hasValidWeight = entry.weight !== null && entry.weight !== undefined && entry.weight !== '' && !isNaN(entry.weight);
        const hasCalories = entry.calories !== null && entry.calories !== undefined && entry.calories !== '';
        const hasNotes = entry.notes !== null && entry.notes !== undefined && entry.notes !== '';

        if (!hasValidWeight && !hasCalories && !hasNotes) {
            return { success: false, error: 'Entry must include at least one of: weight, calories, or notes' };
        }

        const Storage = window.Storage;
        if (!Storage || typeof Storage.saveEntry !== 'function') {
            return { success: false, error: 'Storage module not available' };
        }

        Storage.saveEntry(entry.date, {
            weight: hasValidWeight ? entry.weight : null,
            calories: entry.calories !== undefined ? entry.calories : null,
            notes: entry.notes || '',
            updatedAt: new Date().toISOString()
        });

        if (hasValidWeight) {
            const Auth = window.Auth;
            let userId = null;
            if (Auth && typeof Auth.isAuthenticated === 'function' && Auth.isAuthenticated()) {
                try {
                    const { session } = await Auth.getSession();
                    if (session && session.user) userId = session.user.id;
                } catch (_error) { /* Auth session check may fail gracefully */ }
            }

            queueOperation('create', 'weight_entries', {
                user_id: userId,
                date: entry.date,
                weight: entry.weight,
                calories: entry.calories || null,
                notes: entry.notes || null
            }, entry.date);
        }

        return { success: true, date: entry.date };
    }

    async function updateWeightEntry(entry) {
        if (!entry || typeof entry !== 'object' || !entry.date) {
            return { success: false, error: 'Entry must include date field' };
        }

        const Storage = window.Storage;
        if (!Storage || typeof Storage.getEntry !== 'function' || typeof Storage.saveEntry !== 'function') {
            return { success: false, error: 'Storage module not available' };
        }

        const existing = Storage.getEntry(entry.date);
        if (!existing) {
            return { success: false, error: 'Entry not found: ' + entry.date };
        }

        Storage.saveEntry(entry.date, {
            weight: entry.weight !== undefined ? entry.weight : existing.weight,
            calories: entry.calories !== undefined ? entry.calories : existing.calories,
            notes: entry.notes !== undefined ? entry.notes : existing.notes,
            updatedAt: new Date().toISOString()
        });

        const hasValidWeight = entry.weight !== null && entry.weight !== undefined && entry.weight !== '' && !isNaN(entry.weight);
        if (hasValidWeight) {
            queueOperation('update', 'weight_entries', {
                date: entry.date,
                weight: entry.weight,
                calories: entry.calories || null,
                notes: entry.notes || null
            }, entry.date);
        }

        return { success: true, date: entry.date };
    }

    async function deleteWeightEntry(id) {
        if (!id || typeof id !== 'string' || id.trim() === '') {
            return { success: false, error: 'ID must be a non-empty string' };
        }

        const Storage = window.Storage;
        if (!Storage || typeof Storage.deleteEntry !== 'function') {
            return { success: false, error: 'Storage module not available' };
        }

        Storage.deleteEntry(id);

        queueOperation('delete', 'weight_entries', { id }, id);

        return { success: true, id };
    }

    async function fetchWeightEntries() {
        const supabase = await getSupabase();
        if (!supabase) {
            return { success: false, error: 'Not authenticated', entries: [] };
        }

        try {
            const { data: entries, error } = await supabase
                .from('weight_entries')
                .select('*')
                .order('date', { ascending: false });

            if (error) {
                return { success: false, error, entries: [] };
            }

            return { success: true, entries: entries || [] };
        } catch (error) {
            SyncDebugRef.log(`fetchWeightEntries failed: ${error.message}`, 'error', { error });
            return { success: false, error, entries: [] };
        }
    }

    // ─── Merge Functions (from sync-merge.js) ───────────────────────────────

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

    async function _fetchRemoteData() {
        const remoteResult = await fetchWeightEntries();
        if (!remoteResult.success) {
            SyncDebugRef.error('Failed to fetch remote data:', remoteResult.error);
            showToast('Failed to fetch remote data. Using local data only.', 'error');
            return null;
        }
        const remoteEntries = remoteResult.entries || [];
        SyncDebugRef.info(`Fetched ${remoteEntries.length} remote entries`);
        return remoteEntries;
    }

    function _mergeAndSave(remoteEntries) {
        const Storage = window.Storage;
        const mergedEntries = mergeEntries(remoteEntries);
        SyncDebugRef.info(`Merged ${mergedEntries.length} entries total`);

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
            showToast(`Synced ${remoteCount} remote entrie${remoteCount === 1 ? 'y' : 's'}`, 'success');
        } else {
            showToast('Sync complete - no new data', 'success');
        }
        window.dispatchEvent(new CustomEvent('sync:data-merged', {
            detail: { count: mergedCount, remoteCount }
        }));
    }

    async function fetchAndMergeData() {
        try {
            SyncDebugRef.info('Fetching remote data...');
            const remoteEntries = await _fetchRemoteData();
            if (!remoteEntries) return { success: false, remoteEntries: null };

            const mergedEntries = _mergeAndSave(remoteEntries);
            _showSyncResult(remoteEntries.length, mergedEntries.length);
            await queueLocalEntriesForSync(remoteEntries);
            return { success: true, remoteEntries, mergedEntries };
        } catch (error) {
            SyncDebugRef.error('Fetch and merge failed:', error);
            showToast('Sync failed. Your local data is safe.', 'error');
            return { success: false, error };
        }
    }

    async function _getRemoteDates(cachedRemoteEntries) {
        const remoteDates = new Set();
        let entries = cachedRemoteEntries;
        if (!entries) {
            const remoteResult = await fetchWeightEntries();
            if (remoteResult.success && remoteResult.entries) entries = remoteResult.entries;
        }
        if (entries) {
            entries.forEach(entry => { if (entry.date) remoteDates.add(entry.date); });
            SyncDebugRef.info(`Found ${remoteDates.size} remote dates`);
        }
        return remoteDates;
    }

    function _isValidEntryForSync(entry) {
        const hasWeight = entry.weight !== null && entry.weight !== undefined && entry.weight !== '';
        const hasCalories = entry.calories !== null && entry.calories !== undefined && entry.calories !== '';
        return hasWeight || hasCalories;
    }

    function _queueEntryForSync(entry, userId) {
        queueOperation('create', 'weight_entries', {
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
                SyncDebugRef.debug(`Skipping ${entry.date} - already exists remotely`);
                skippedCount++;
                return;
            }
            if (!_isValidEntryForSync(entry)) {
                SyncDebugRef.warn(`Skipping ${entry.date} - no valid weight or calories`);
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
            SyncDebugRef.warn(`${invalidCount} invalid entries skipped during queue`);
            showToast(`${invalidCount} invalid entrie${invalidCount === 1 ? 'y was' : 's were'} skipped`, 'info');
        }
        if (skippedCount > 0) {
            SyncDebugRef.debug(`${skippedCount} entries already exist remotely, skipped`);
        }
    }

    async function queueLocalEntriesForSync(cachedRemoteEntries) {
        const Storage = window.Storage;
        const Auth = window.Auth;

        if (!Auth || typeof Auth.isAuthenticated !== 'function' || !Auth.isAuthenticated()) {
            SyncDebugRef.info('Not authenticated - skipping');
            return { success: false, error: 'Not authenticated' };
        }

        let session;
        if (typeof Auth.getSession === 'function') {
            const sessionResult = await Auth.getSession();
            session = sessionResult && sessionResult.session ? sessionResult.session : null;
        }
        if (!session || !session.user) {
            SyncDebugRef.info('No user - skipping');
            return { success: false, error: 'No user found' };
        }
        const user = session.user;

        const allEntriesObj = Storage.getAllEntries();
        const localEntries = Object.entries(allEntriesObj || {}).map(([date, entry]) => ({ date, ...entry }));

        if (localEntries.length === 0) {
            SyncDebugRef.info('No local entries to queue');
            return { success: true, queued: 0 };
        }
        SyncDebugRef.info(`Found ${localEntries.length} local entries to potentially queue`);

        const remoteDates = await _getRemoteDates(Array.isArray(cachedRemoteEntries) ? cachedRemoteEntries : null);
        const { queuedCount, skippedCount, invalidCount } = _processEntriesForQueue(localEntries, remoteDates, user.id);
        SyncDebugRef.info(`Queue processing: ${queuedCount} queued, ${skippedCount} skipped, ${invalidCount} invalid`);
        _showQueueNotifications(invalidCount, skippedCount);

        if (navigator.onLine) {
            await syncAll();
        }
        return { success: true, queued: queuedCount };
    }

    // ─── Utility Functions (deduplicated) ───────────────────────────────────

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function _refreshUI() {
        SyncDebugRef.info('Refreshing UI components');
        if (window.Dashboard?.refresh) window.Dashboard.refresh();
        if (window.Chart?.refresh) window.Chart.refresh();
        if (window.WeeklyView?.refresh) window.WeeklyView.refresh();
        window.dispatchEvent(new CustomEvent('ui:refresh'));
    }

    function showToast(message, type) {
        if (type === undefined) type = 'info';
        SyncDebugRef.info(`Toast (${type}):`, message);

        if (window.Components?.showToast) {
            window.Components.showToast(message, type);
            return;
        }

        if (typeof document === 'undefined') return;

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
        setTimeout(() => { toast.style.animation = 'slideOut 0.3s ease'; setTimeout(() => toast.remove(), 300); }, TOAST_AUTO_HIDE_DELAY);
    }

    // ─── Initialization (from sync-core.js) ─────────────────────────────────

    async function init() {
        if (isInitialized) { SyncDebugRef.info('Already initialized'); return; }
        loadErrorHistory();
        loadSyncQueue();
        setupNetworkListeners();
        setupAuthStateListener();
        const Auth = window.Auth;
        if (Auth) {
            SyncDebugRef.info('Waiting for auth session...');
            const authReady = await waitForAuth(Auth, AUTH_TIMEOUT);
            if (authReady) SyncDebugRef.info('Auth session ready');
            else SyncDebugRef.warn('Auth timeout - sync will retry when auth ready');
        }
        startBackgroundSync();
        isInitialized = true;
        SyncDebugRef.info('Initialized');
    }

    async function waitForAuth(Auth, timeout) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            try { const { session } = await Auth.getSession(); if (session) return true; }
            catch (error) { SyncDebugRef.debug(`Auth check pending: ${error.message}`); }
            await sleep(AUTH_POLL_INTERVAL);
        }
        return false;
    }

    function setupNetworkListeners() {
        window.addEventListener('online', async () => { SyncDebugRef.info('Network online - starting sync'); await syncAll(); });
        window.addEventListener('offline', () => { SyncDebugRef.warn('Network offline - queuing operations'); });
    }

    function setupAuthStateListener() {
        const Auth = window.Auth;
        if (!Auth) { SyncDebugRef.warn('Auth module not available - skipping auth listener setup'); return; }
        Auth.onAuthStateChange(async (event) => {
            SyncDebugRef.info('Auth state changed:', event);
            if (event === 'SIGNED_IN') {
                SyncDebugRef.info('User signed in - syncing bidirectional data...');
                await fetchAndMergeData();
                const backfillResult = await queueLocalEntriesForSync();
                if (backfillResult.success && backfillResult.queued > 0) {
                    SyncDebugRef.info(`Queued ${backfillResult.queued} local entries for upload`);
                    showToast(`Syncing ${backfillResult.queued} local entr${backfillResult.queued === 1 ? 'y' : 'ies'} to cloud...`, 'info');
                }
            } else if (event === 'SIGNED_OUT') {
                SyncDebugRef.info('User signed out - pausing sync');
            }
        });
    }

    function startBackgroundSync() {
        setInterval(async () => { if (navigator.onLine && !isSyncing) await syncAll(); }, SYNC_INTERVAL);
    }

    // ─── Status/Query Functions ─────────────────────────────────────────────

    function getStatus() {
        const Auth = window.Auth;
        const authDetails = Auth ? { isAuthenticated: Auth.isAuthenticated(), hasSession: Auth.isAuthenticated() || false, currentUser: Auth.getCurrentUser?.email ?? null } : { isAuthenticated: false };
        return {
            isOnline: navigator.onLine,
            ...authDetails,
            pendingOperations: syncQueue.length,
            lastSyncTime,
            lastSyncTimeFormatted: lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never',
            isSyncing,
            errorCount: syncErrorHistory.length,
            recentErrors: syncErrorHistory.slice(0, 5),
            debugMode: SyncDebugRef.DEBUG_MODE
        };
    }

    function getQueue() {
        return syncQueue.map(op => ({ ...op, timestampFormatted: new Date(op.timestamp).toLocaleString() }));
    }

    function getLastSyncTime() { return lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never'; }

    // ─── Public API ─────────────────────────────────────────────────────────

    const SyncAPI = {
        init,
        syncAll,
        saveWeightEntry,
        updateWeightEntry,
        deleteWeightEntry,
        fetchWeightEntries,
        mergeEntries,
        fetchAndMergeData,
        queueLocalEntriesForSync,
        getStatus,
        getQueue,
        getLastSyncTime,
        getErrorHistory,
        clearErrorHistory,
        clearQueue,
        filterInvalidOperations,
        queueOperation
    };

    if (typeof window !== 'undefined') window.Sync = SyncAPI;
    if (typeof module !== 'undefined' && module.exports) module.exports = SyncAPI;

    return SyncAPI;
})();
