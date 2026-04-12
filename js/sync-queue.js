'use strict';

const SyncQueue = (function() {
    'use strict';

    function _getSyncDebug() {
        if (typeof module !== 'undefined' && module.exports) {
            try {
                return require('./sync-debug.js');
            } catch (_) {
                return null;
            }
        }
        if (typeof window !== 'undefined' && window.SyncDebug) {
            return window.SyncDebug;
        }
        return null;
    }

    const _SyncDebug = new Proxy({}, {
        get: function(target, prop) {
            const debug = _getSyncDebug();
            if (debug && debug[prop]) {
                return debug[prop];
            }
            return function() { return null; };
        }
    });

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

    let syncQueue = [];
    let isSyncing = false;
    let lastSyncTime = null;

    const SYNC_INTERVAL = AppConstants?.SYNC_INTERVAL_MS || 30000;
    const MAX_RETRIES = AppConstants?.MAX_RETRIES || 3;
    const QUEUE_KEY = 'tdee_sync_queue';

    function sleepWithBackoff(attempt) {
        const baseDelay = 1000;
        const maxDelay = 30000;
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    function loadSyncQueue() {
        try {
            const stored = localStorage.getItem(QUEUE_KEY);
            if (stored) {
                syncQueue = JSON.parse(stored);
                _SyncDebug.info(`Loaded ${syncQueue.length} pending operations`);
            }
        } catch (error) {
            _SyncDebug.error(`Failed to load queue: ${error.message}`);
            syncQueue = [];
        }
    }

    function saveSyncQueue() {
        try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(syncQueue));
        } catch (error) {
            _SyncDebug.error(`Failed to save queue: ${error.message}`);
        }
    }

    function recordError(operation, error, details = {}) {
        if (typeof window !== 'undefined' && window.SyncErrors && typeof window.SyncErrors.recordError === 'function') {
            window.SyncErrors.recordError(operation, error, details);
            return;
        }
        _SyncDebug.error(`Error recorded: ${operation} - ${error.message || error}`);
    }

    function showToast(message, type = 'info') {
        _SyncDebug.info(`Toast (${type}):`, message);

        if (typeof window !== 'undefined' && window.Components && typeof window.Components.showToast === 'function') {
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
        toast.style.cssText = `
            padding: 12px 20px;
            margin-top: 10px;
            border-radius: 8px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
        `;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        const autoHideDelay = AppConstants?.TOAST_AUTO_HIDE_DELAY_MS || 5000;
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, autoHideDelay);
    }

    function queueOperation(type, table, data, localId = null) {
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

        _SyncDebug.log(`Queued ${type} operation for ${table} [ID: ${operation.id}]`, 'info', { operation });

        if (navigator.onLine) {
            syncAll();
        }
        
        return operation.id;
    }

    function clearQueue() {
        const count = syncQueue.length;
        syncQueue = [];
        saveSyncQueue();
        _SyncDebug.log(`Queue cleared (${count} operations removed)`, 'warn');
    }

    function canSync() {
        const Auth = window.Auth;
        if (!Auth) {
            _SyncDebug.error('Auth module not available');
            return false;
        }

        const isAuthenticated = Auth.isAuthenticated();
        const isOnline = navigator.onLine;

        if (!isAuthenticated) {
            _SyncDebug.warn('Not authenticated - skipping sync');
            return false;
        }

        if (!isOnline) {
            _SyncDebug.info('Offline - will queue operations for later sync');
            return false;
        }

        _SyncDebug.debug(`canSync: authenticated=${isAuthenticated}, online=${isOnline} → can sync now`);
        return true;
    }

    function startBackgroundSync() {
        setInterval(async () => {
            if (navigator.onLine && !isSyncing) {
                await syncAll();
            }
        }, SYNC_INTERVAL);
    }

    async function getSupabase() {
        const Auth = window.Auth;
        if (!Auth) {
            _SyncDebug.log('getSupabase: Auth module not available', 'error');
            return null;
        }

        try {
            const { session } = await Auth.getSession();
            if (!session) {
                _SyncDebug.log('getSupabase: No active session', 'warn');
                return null;
            }

            const supabase = Auth._getSupabase ? Auth._getSupabase() : null;
            if (!supabase) {
                _SyncDebug.log('getSupabase: Auth._getSupabase() returned null', 'error');
            } else {
                _SyncDebug.log('getSupabase: Supabase client retrieved successfully', 'debug');
            }
            return supabase;
        } catch (error) {
            _SyncDebug.log(`getSupabase: Error getting session: ${error.message}`, 'error', { error });
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
                    _SyncDebug.log(`Entry already exists [user_id: ${data.user_id}, date: ${data.date}] - converting to UPDATE`, 'info');
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

        _SyncDebug.log(`Executing ${type} on ${table} [ID: ${id}]`, 'debug');

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
                    _SyncDebug.log(`Unknown operation type: ${type}`, 'error', { operation });
                    return false;
            }

            if (result.success) {
                _SyncDebug.log(`${type} ${table} synced successfully [ID: ${id}]`, 'info');
                return true;
            }

            const errorMessage = result.error?.message || result.error || 'Unknown error';
            const errorCode = result.error?.code || result.error?.status;
            const isDuplicateKey = errorMessage.includes('duplicate key') ||
                                   errorCode === '409' ||
                                   errorCode === '23505';

            if (isDuplicateKey) {
                _SyncDebug.log(`Duplicate key detected [ID: ${id}] - removing from queue`, 'warn');
                recordError(`${type} ${table} (duplicate)`, result.error || new Error('Duplicate key'), { operation });
                return false;
            }

            recordError(`${type} ${table}`, result.error || new Error('Operation failed'), { operation });
            return false;
        } catch (error) {
            _SyncDebug.log(`Operation failed with exception [ID: ${id}]: ${error.message}`, 'error', { operation, error });
            recordError(operation.type, error, { operation });
            return false;
        }
    }

    async function syncAll() {
        const TIMEOUT_MS = 30000;

        const syncPromise = (async () => {
            if (isSyncing) {
                _SyncDebug.log('Sync already in progress', 'warn');
                return;
            }

            if (!canSync()) {
                return;
            }

            if (syncQueue.length === 0) {
                _SyncDebug.log('No pending operations', 'info');
                return;
            }

            isSyncing = true;
            const startTime = Date.now();
            const operationCount = syncQueue.length;
            _SyncDebug.log(`Starting sync of ${operationCount} operations`, 'info');

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

                        _SyncDebug.log(`Attempt ${attempt + 1} failed, retrying with backoff...`, 'warn');
                        await sleepWithBackoff(attempt);
                    }
                } catch (error) {
                    _SyncDebug.log(`Operation failed: ${error.message}`, 'error', { operation, error });
                    recordError(operation.type, error, { operation });
                    failed.push(operation);
                }
            }

            syncQueue = failed;
            saveSyncQueue();

            isSyncing = false;
            lastSyncTime = Date.now();
            const duration = Date.now() - startTime;

            _SyncDebug.log(`Sync complete: ${operationCount - failed.length - removed.length}/${operationCount} succeeded. ${failed.length} pending retry. ${removed.length} removed (retry limit).`,
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
            _SyncDebug.log(`syncAll error: ${error.message}`, 'error', { error });
            isSyncing = false;
            recordError('syncAll', error);
        }
    }

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
            _SyncDebug.log(`fetchWeightEntries failed: ${error.message}`, 'error', { error });
            return { success: false, error, entries: [] };
        }
    }

    loadSyncQueue();

    return {
        loadSyncQueue,
        saveSyncQueue: saveSyncQueue,
        queueOperation,
        clearQueue,
        startBackgroundSync,
        canSync,
        syncAll,
        getQueue: function() { return syncQueue; },
        setQueue: function(q) { syncQueue = q; },
        saveQueue: saveSyncQueue,
        getStatus: function() {
            return {
                isSyncing,
                lastSyncTime,
                pendingOperations: syncQueue.length
            };
        },
        executeOperation,
        createRecord,
        updateRecord,
        deleteRecord,
        getSupabase,
        sleepWithBackoff,
        saveWeightEntry,
        updateWeightEntry,
        deleteWeightEntry,
        fetchWeightEntries
    };
})();

if (typeof window !== 'undefined') window.SyncQueue = SyncQueue;
if (typeof module !== 'undefined' && module.exports) module.exports = SyncQueue;
