/**
 * Sync Module - Offline-First Data Synchronization
 * 
 * Manages data synchronization between LocalStorage and Supabase
 * Handles offline queue, conflict resolution, and bidirectional sync
 * 
 * Architecture:
 *   - Optimistic UI updates (LocalStorage first)
 *   - Background sync to Supabase when online
 *   - Conflict resolution: newest timestamp wins
 *   - Queue failed operations for retry
 * 
 * Usage:
 *   await Sync.init();
 *   await Sync.saveWeightEntry(entry);
 *   await Sync.syncAll();
 */

'use strict';

const Sync = (function() {
    // Private state
    let isInitialized = false;
    let supabase = null;
    let syncQueue = [];
    let isSyncing = false;
    let lastSyncTime = null;
    const SYNC_INTERVAL = 30000; // 30 seconds
    const QUEUE_KEY = 'tdee_sync_queue';
    const SYNC_HISTORY_KEY = 'tdee_sync_history';
    
    // Debug mode flag (enabled in development)
    const DEBUG_MODE = (typeof window !== 'undefined' && window.location) ? 
                       (window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.protocol === 'file:') : false;
    
    // Sync error history (last 50 errors)
    let syncErrorHistory = [];
    const MAX_ERROR_HISTORY = 50;

    /**
     * Initialize sync module
     */
    async function init() {
        if (isInitialized) {
            log('Already initialized', 'info');
            return;
        }

        // Load pending sync queue and error history from LocalStorage
        loadSyncQueue();
        loadErrorHistory();

        // Set up online/offline listeners
        setupNetworkListeners();

        // Set up auth state listener for auto-sync on sign-in
        setupAuthStateListener();

        // Wait for auth to be ready if Auth module exists
        const Auth = window.Auth;
        if (Auth) {
            log('Waiting for auth session...', 'info');
            const authReady = await waitForAuthReady(Auth, 5000);
            if (authReady) {
                log('Auth session ready', 'info');
            } else {
                log('Auth timeout - sync will retry when auth ready', 'warn');
            }
        }

        // Start background sync after auth is ready
        startBackgroundSync();

        isInitialized = true;
        log('Initialized', 'info');
        
        if (DEBUG_MODE) {
            log('Debug mode enabled', 'warn');
        }
    }

    /**
     * Wait for auth session to be ready
     * @param {object} Auth - Auth module
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<boolean>} True if auth ready, false if timeout
     */
    async function waitForAuthReady(Auth, timeout = 5000) {
        const start = Date.now();
        
        while (Date.now() - start < timeout) {
            try {
                const { session } = await Auth.getSession();
                if (session) {
                    return true;
                }
            } catch (error) {
                // Auth may not be fully initialized yet, continue polling
                log(`Auth check pending: ${error.message}`, 'debug');
            }
            
            await sleep(100);
        }
        
        return false;
    }

    /**
     * Sleep helper
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Load pending sync operations from LocalStorage
     */
    function loadSyncQueue() {
        try {
            const stored = localStorage.getItem(QUEUE_KEY);
            if (stored) {
                syncQueue = JSON.parse(stored);
                log(`Loaded ${syncQueue.length} pending operations`, 'info');
            }
        } catch (error) {
            log(`Failed to load queue: ${error.message}`, 'error');
            syncQueue = [];
        }
    }

    /**
     * Save sync queue to LocalStorage
     */
    function saveSyncQueue() {
        try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(syncQueue));
        } catch (error) {
            log(`Failed to save queue: ${error.message}`, 'error');
        }
    }
    
    /**
     * Load sync error history from LocalStorage
     */
    function loadErrorHistory() {
        try {
            const stored = localStorage.getItem(SYNC_HISTORY_KEY);
            if (stored) {
                syncErrorHistory = JSON.parse(stored);
                log(`Loaded ${syncErrorHistory.length} error history entries`, 'info');
            }
        } catch (error) {
            log(`Failed to load error history: ${error.message}`, 'error');
            syncErrorHistory = [];
        }
    }
    
    /**
     * Save sync error history to LocalStorage
     */
    function saveErrorHistory() {
        try {
            localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(syncErrorHistory));
        } catch (error) {
            log(`Failed to save error history: ${error.message}`, 'error');
        }
    }
    
    /**
     * Record an error to the error history
     * @param {string} operation - Operation that failed
     * @param {string} error - Error message
     * @param {object} details - Additional error details
     */
    function recordError(operation, error, details = {}) {
        const errorEntry = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            operation,
            error: error.message || error,
            details,
            resolved: false
        };
        
        syncErrorHistory.unshift(errorEntry);
        
        // Trim to max size
        if (syncErrorHistory.length > MAX_ERROR_HISTORY) {
            syncErrorHistory = syncErrorHistory.slice(0, MAX_ERROR_HISTORY);
        }
        
        saveErrorHistory();
        log(`Error recorded: ${operation} - ${error.message || error}`, 'error');
    }
    
    /**
     * Logging utility with timestamps and levels
     * @param {string} message - Log message
     * @param {string} level - Log level ('info', 'warn', 'error', 'debug')
     * @param {object} data - Additional data to log
     */
    function log(message, level = 'info', data = null) {
        const timestamp = new Date().toISOString();
        const prefix = `[Sync][${timestamp}]`;
        
        // Always log errors and warnings
        if (level === 'error' || level === 'warn') {
            console[level](`${prefix} ${message}`);
            if (data) console[level](data);
            return;
        }
        
        // Info and debug only in debug mode or if explicitly enabled
        if (DEBUG_MODE || level === 'info') {
            console[level](`${prefix} ${message}`);
            if (data) console[level](data);
        }
    }

    /**
     * Set up network status listeners
     */
    function setupNetworkListeners() {
        window.addEventListener('online', async () => {
            log('Network online - starting sync', 'info');
            await syncAll();
        });

        window.addEventListener('offline', () => {
            log('Network offline - queuing operations', 'warn');
        });
    }

    /**
     * Set up auth state change listener
     * Triggers data fetch/merge on sign-in, pauses sync on sign-out
     */
    function setupAuthStateListener() {
        const Auth = window.Auth;
        if (!Auth) {
            console.warn('[Sync] Auth module not available - skipping auth listener setup');
            return;
        }

        Auth.onAuthStateChange(async (event, user) => {
            console.log('[Sync] Auth state changed:', event);

            if (event === 'SIGNED_IN') {
                console.log('[Sync] User signed in - fetching and merging data');
                await fetchAndMergeData();
            } else if (event === 'SIGNED_OUT') {
                console.log('[Sync] User signed out - pausing sync');
                // Keep queue for later, just pause sync operations
                isSyncing = false;
            }
        });
    }

    /**
     * Fetch remote data and merge with local storage
     * Called automatically on sign-in
     */
    async function fetchAndMergeData() {
        const Storage = window.Storage;

        try {
            console.log('[Sync] Fetching remote data...');

            // Fetch from Supabase
            const remoteResult = await fetchWeightEntries();

            if (!remoteResult.success) {
                console.error('[Sync] Failed to fetch remote data:', remoteResult.error);
                showToast('Failed to fetch remote data. Using local data only.', 'error');
                return;
            }

            const remoteEntries = remoteResult.entries || [];
            console.log(`[Sync] Fetched ${remoteEntries.length} remote entries`);

            // Merge with local data
            const mergedEntries = mergeEntries(remoteEntries);
            console.log(`[Sync] Merged to ${mergedEntries.length} total entries`);

            // Save merged data to LocalStorage
            Storage.clearEntries();
            mergedEntries.forEach(entry => {
                Storage.addEntry(entry);
            });

            console.log('[Sync] Merged data saved to LocalStorage');

            // Refresh UI components
            refreshUI();

            // Show success message
            const newCount = remoteEntries.length > 0 ? remoteEntries.length : 0;
            if (newCount > 0) {
                showToast(`Synced ${newCount} entr${newCount === 1 ? 'y' : 'ies'} from cloud`, 'success');
            } else {
                showToast('Sync complete - no new data', 'success');
            }

            // Dispatch sync complete event
            window.dispatchEvent(new CustomEvent('sync:data-merged', {
                detail: { count: mergedEntries.length, remoteCount: remoteEntries.length }
            }));

        } catch (error) {
            console.error('[Sync] Fetch and merge failed:', error);
            showToast('Sync failed. Your local data is safe.', 'error');
        }
    }

    /**
     * Refresh all UI components after data merge
     */
    function refreshUI() {
        console.log('[Sync] Refreshing UI components');

        // Refresh Dashboard
        if (window.Dashboard && typeof window.Dashboard.refresh === 'function') {
            window.Dashboard.refresh();
        }

        // Refresh Chart
        if (window.Chart && typeof window.Chart.refresh === 'function') {
            window.Chart.refresh();
        }

        // Refresh WeeklyView
        if (window.WeeklyView && typeof window.WeeklyView.refresh === 'function') {
            window.WeeklyView.refresh();
        }

        // Dispatch custom event for other components to listen
        window.dispatchEvent(new CustomEvent('ui:refresh'));
    }

    /**
     * Show toast notification to user
     * @param {string} message - Message to display
     * @param {string} type - Type: 'success', 'error', 'info'
     */
    function showToast(message, type = 'info') {
        console.log(`[Sync] Toast (${type}):`, message);

        // Check if Components module has showToast
        if (window.Components && typeof window.Components.showToast === 'function') {
            window.Components.showToast(message, type);
            return;
        }

        // Fallback: create simple toast element
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
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    /**
     * Start background sync loop
     */
    function startBackgroundSync() {
        setInterval(async () => {
            if (navigator.onLine && !isSyncing) {
                await syncAll();
            }
        }, SYNC_INTERVAL);
    }

    /**
     * Check if sync can be executed immediately (authenticated AND online)
     * Note: This is for immediate sync execution, NOT for queuing decisions.
     * Operations should be queued whenever user is authenticated, regardless of online status.
     * @returns {boolean} True if sync can execute now
     */
    function canSync() {
        const Auth = window.Auth;
        if (!Auth) {
            log('Auth module not available', 'error');
            return false;
        }

        const isAuthenticated = Auth.isAuthenticated();
        const isOnline = navigator.onLine;

        if (!isAuthenticated) {
            log('Not authenticated - skipping sync', 'warn');
            return false;
        }

        if (!isOnline) {
            log('Offline - will queue operations for later sync', 'info');
            return false;
        }

        log(`canSync: authenticated=${isAuthenticated}, online=${isOnline} → can sync now`, 'debug');
        return true;
    }

    /**
     * Add operation to sync queue
     * @param {string} type - Operation type ('create', 'update', 'delete')
     * @param {string} table - Table name ('weight_entries', 'profiles')
     * @param {object} data - Operation data
     * @param {string} localId - Local identifier for conflict resolution
     */
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

        log(`Queued ${type} operation for ${table} [ID: ${operation.id}]`, 'info', { operation });

        // Attempt immediate sync if online
        if (navigator.onLine) {
            syncAll();
        }
        
        return operation.id;
    }

    /**
     * Sync all pending operations
     */
    async function syncAll() {
        if (isSyncing) {
            log('Sync already in progress', 'warn');
            return;
        }

        if (!canSync()) {
            return;
        }

        if (syncQueue.length === 0) {
            log('No pending operations', 'info');
            return;
        }

        isSyncing = true;
        const startTime = Date.now();
        const operationCount = syncQueue.length;
        log(`Starting sync of ${operationCount} operations`, 'info');

        const failed = [];

        for (const operation of syncQueue) {
            try {
                const success = await executeOperation(operation);
                if (!success) {
                    failed.push(operation);
                }
            } catch (error) {
                log(`Operation failed: ${error.message}`, 'error', { operation, error });
                recordError(operation.type, error, { operation });
                failed.push(operation);
            }
        }

        // Keep failed operations for retry
        syncQueue = failed;
        saveSyncQueue();

        isSyncing = false;
        lastSyncTime = Date.now();
        const duration = Date.now() - startTime;
        
        log(`Sync complete: ${operationCount - failed.length}/${operationCount} succeeded in ${duration}ms. ${failed.length} failed.`, 
            failed.length > 0 ? 'warn' : 'info');

        // Dispatch sync complete event
        window.dispatchEvent(new CustomEvent('sync:complete', {
            detail: { 
                success: failed.length === 0, 
                failed: failed.length,
                succeeded: operationCount - failed.length,
                duration
            }
        }));
    }

    /**
     * Execute a single sync operation
     */
    async function executeOperation(operation) {
        const Auth = window.Auth;
        const supabase = Auth.getSession ? await Auth.getSession() : null;

        if (!supabase) {
            throw new Error('Supabase client not available');
        }

        const { type, table, data, retries, id } = operation;

        // Retry limit
        if (retries > 3) {
            log(`Operation exceeded retry limit [ID: ${id}]`, 'error', { operation });
            recordError(`${type} (retry limit)`, new Error('Max retries exceeded'), { operation });
            return false;
        }

        log(`Executing ${type} on ${table} [ID: ${id}, Retry: ${retries}]`, 'debug');

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
                log(`Unknown operation type: ${type}`, 'error', { operation });
                return false;
        }

        if (result.success) {
            log(`${type} ${table} synced successfully [ID: ${id}]`, 'info');
            return true;
        } else {
            log(`Operation failed [ID: ${id}]: ${result.error?.message || result.error}`, 'error', { error: result.error });
            recordError(`${type} ${table}`, result.error || new Error('Operation failed'), { operation });
            operation.retries = retries + 1;
            return false;
        }
    }

    /**
     * Create record in Supabase
     */
    async function createRecord(table, data) {
        const Auth = window.Auth;
        const supabase = await getSupabase();

        if (!supabase) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
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

    /**
     * Update record in Supabase
     */
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

    /**
     * Delete record from Supabase
     */
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

    /**
     * Get Supabase client from Auth module
     */
    async function getSupabase() {
        const Auth = window.Auth;
        if (!Auth) {
            log('getSupabase: Auth module not available', 'error');
            return null;
        }

        try {
            const { session } = await Auth.getSession();
            if (!session) {
                log('getSupabase: No active session', 'warn');
                return null;
            }

            // Get Supabase instance from Auth
            const supabase = Auth._getSupabase ? Auth._getSupabase() : null;
            if (!supabase) {
                log('getSupabase: Auth._getSupabase() returned null', 'error');
            } else {
                log('getSupabase: Supabase client retrieved successfully', 'debug');
            }
            return supabase;
        } catch (error) {
            log(`getSupabase: Error getting session: ${error.message}`, 'error', { error });
            return null;
        }
    }

    /**
     * Save weight entry (LocalStorage + Sync Queue)
     * @param {object} entry - Weight entry data (must include date, weight, calories, notes)
     * @returns {Promise<{success: boolean, id?: string, error?: string}>}
     */
    async function saveWeightEntry(entry) {
        const Storage = window.Storage;

        console.log('[Sync.saveWeightEntry] Called with entry:', entry);

        // Validate entry has required date field
        if (!entry || !entry.date) {
            console.error('[Sync.saveWeightEntry] Missing date field');
            return { success: false, error: 'Entry must include date field' };
        }

        // Save to LocalStorage immediately (optimistic UI)
        console.log('[Sync.saveWeightEntry] Saving to LocalStorage...');
        const localResult = Storage.saveEntry(entry.date, {
            weight: entry.weight,
            calories: entry.calories,
            notes: entry.notes || ''
        });
        
        console.log('[Sync.saveWeightEntry] LocalStorage result:', localResult);
        
        if (!localResult.success) {
            console.error('[Sync.saveWeightEntry] LocalStorage save failed');
            return localResult;
        }

        // Check authentication status
        const Auth = window.Auth;
        if (!Auth) {
            log('Auth module not available - entry saved locally only', 'warn');
            console.warn('[Sync.saveWeightEntry] Auth module not available');
            return localResult;
        }

        const isAuthenticated = Auth.isAuthenticated();
        const user = Auth.getCurrentUser();

        console.log('[Sync.saveWeightEntry] Auth check:', { 
            isAuthenticated, 
            userEmail: user?.email,
            userId: user?.id 
        });

        log(`saveWeightEntry: isAuthenticated=${isAuthenticated}, user=${user ? user.email : 'null'}`, 'debug');

        // Queue sync to Supabase if authenticated (regardless of online status)
        // Offline users should still have operations queued for later sync
        if (isAuthenticated && user) {
            const isOnline = navigator.onLine;
            console.log('[Sync.saveWeightEntry] Queueing operation for Supabase sync...');
            log(`Queueing operation: online=${isOnline}, userId=${user.id}`, 'info');
            
            queueOperation('create', 'weight_entries', {
                user_id: user.id,
                date: entry.date,
                weight: entry.weight,
                calories: entry.calories || null,
                notes: entry.notes || null
            }, localResult.id);
            
            console.log('[Sync.saveWeightEntry] Operation queued. Queue length:', syncQueue.length);
        } else {
            console.warn('[Sync.saveWeightEntry] NOT queueing - user not authenticated');
            log('User not authenticated - entry saved locally only (not queued)', 'warn');
        }

        return localResult;
    }

    /**
     * Update weight entry
     * @param {object} entry - Updated entry data
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async function updateWeightEntry(entry) {
        const Storage = window.Storage;

        // Update LocalStorage
        const localResult = Storage.updateEntry(entry);

        if (!localResult.success) {
            return localResult;
        }

        // Check authentication status
        const Auth = window.Auth;
        if (!Auth) {
            log('Auth module not available - entry updated locally only', 'warn');
            return localResult;
        }

        const isAuthenticated = Auth.isAuthenticated();
        const user = Auth.getCurrentUser();

        // Queue sync to Supabase if authenticated (regardless of online status)
        if (isAuthenticated && user) {
            log(`Queueing update operation: userId=${user.id}, entryId=${entry.id}`, 'info');
            queueOperation('update', 'weight_entries', entry, entry.id);
        } else {
            log('User not authenticated - entry updated locally only (not queued)', 'warn');
        }

        return localResult;
    }

    /**
     * Delete weight entry
     * @param {string} id - Entry ID
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async function deleteWeightEntry(id) {
        const Storage = window.Storage;

        // Delete from LocalStorage
        const localResult = Storage.deleteEntry(id);

        if (!localResult.success) {
            return localResult;
        }

        // Check authentication status
        const Auth = window.Auth;
        if (!Auth) {
            log('Auth module not available - entry deleted locally only', 'warn');
            return localResult;
        }

        const isAuthenticated = Auth.isAuthenticated();

        // Queue sync to Supabase if authenticated (regardless of online status)
        if (isAuthenticated) {
            log(`Queueing delete operation: entryId=${id}`, 'info');
            queueOperation('delete', 'weight_entries', { id }, id);
        } else {
            log('User not authenticated - entry deleted locally only (not queued)', 'warn');
        }

        return localResult;
    }

    /**
     * Fetch weight entries from Supabase
     * @returns {Promise<{success: boolean, entries?: array, error?: string}>}
     */
    async function fetchWeightEntries() {
        if (!canSync()) {
            return { success: false, error: 'Not authenticated or offline' };
        }

        const supabase = await getSupabase();

        if (!supabase) {
            return { success: false, error: 'Supabase not available' };
        }

        try {
            const { data, error } = await supabase
                .from('weight_entries')
                .select('*')
                .order('date', { ascending: false });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, entries: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Merge remote entries with local data
     * @param {array} remoteEntries - Entries from Supabase
     * @returns {array} Merged entries
     */
    function mergeEntries(remoteEntries) {
        const Storage = window.Storage;
        const localEntriesObj = Storage.getAllEntries();
        
        // Convert local entries object to array with dates
        const localEntries = Object.entries(localEntriesObj || {}).map(([date, entry]) => ({
            date,
            ...entry
        }));

        // Create map of local entries by date
        const localMap = new Map();
        localEntries.forEach(entry => {
            localMap.set(entry.date, entry);
        });

        // Merge: prefer newer timestamp
        const merged = [];

        // Add remote entries
        remoteEntries.forEach(remote => {
            const local = localMap.get(remote.date);
            
            if (!local) {
                merged.push(remote);
            } else {
                // Compare timestamps, keep newer
                const remoteTime = new Date(remote.updated_at || remote.created_at).getTime();
                const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();

                if (remoteTime > localTime) {
                    merged.push(remote);
                    localMap.delete(remote.date);
                } else {
                    merged.push(local);
                }
            }
        });

        // Add remaining local entries
        localMap.forEach(entry => merged.push(entry));

        // Sort by date descending
        merged.sort((a, b) => new Date(b.date) - new Date(a.date));

        return merged;
    }

    /**
     * Get sync status
     * @returns {object} Sync status information
     */
    function getStatus() {
        const Auth = window.Auth;
        let authDetails = { isAuthenticated: false };
        
        if (Auth) {
            authDetails = {
                isAuthenticated: Auth.isAuthenticated(),
                hasSession: !!(Auth.getSession && Auth.getSession()),
                currentUser: Auth.getCurrentUser ? Auth.getCurrentUser()?.email : null
            };
        }
        
        return {
            isOnline: navigator.onLine,
            ...authDetails,
            pendingOperations: syncQueue.length,
            lastSyncTime,
            lastSyncTimeFormatted: lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never',
            isSyncing,
            errorCount: syncErrorHistory.length,
            recentErrors: syncErrorHistory.slice(0, 5),
            debugMode: DEBUG_MODE
        };
    }
    
    /**
     * Get pending queue operations
     * @returns {array} Array of pending operations
     */
    function getQueue() {
        return syncQueue.map(op => ({
            id: op.id,
            type: op.type,
            table: op.table,
            data: op.data,
            timestamp: op.timestamp,
            timestampFormatted: new Date(op.timestamp).toLocaleString(),
            retries: op.retries,
            localId: op.localId
        }));
    }
    
    /**
     * Get formatted last sync time
     * @returns {string} Formatted date string or 'Never'
     */
    function getLastSyncTime() {
        if (!lastSyncTime) return 'Never';
        return new Date(lastSyncTime).toLocaleString();
    }
    
    /**
     * Get error history
     * @returns {array} Array of error entries
     */
    function getErrorHistory() {
        return syncErrorHistory.map(err => ({
            ...err,
            timestampFormatted: new Date(err.timestamp).toLocaleString()
        }));
    }
    
    /**
     * Clear error history
     */
    function clearErrorHistory() {
        syncErrorHistory = [];
        saveErrorHistory();
        log('Error history cleared', 'info');
    }

    /**
     * Clear sync queue (use with caution)
     */
    function clearQueue() {
        const count = syncQueue.length;
        syncQueue = [];
        saveSyncQueue();
        log(`Queue cleared (${count} operations removed)`, 'warn');
    }

    // Public API
    return {
        init,
        syncAll,
        saveWeightEntry,
        updateWeightEntry,
        deleteWeightEntry,
        fetchWeightEntries,
        mergeEntries,
        fetchAndMergeData,  // Added for auth state data fetch
        getStatus,
        getQueue,
        getLastSyncTime,
        getErrorHistory,
        clearErrorHistory,
        clearQueue,
        queueOperation
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.Sync = Sync;
    
    // Expose debug utilities in development mode
    const DEBUG_MODE = (typeof window !== 'undefined' && window.location) ? 
                       (window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.protocol === 'file:') : false;
    
    if (DEBUG_MODE) {
        window.SyncDebug = {
            /**
             * Get current sync status
             * @returns {object} Detailed sync status
             */
            status: () => Sync.getStatus(),
            
            /**
             * Get pending queue operations
             * @returns {array} Array of pending operations
             */
            queue: () => Sync.getQueue(),
            
            /**
             * Get error history
             * @returns {array} Array of error entries
             */
            errors: () => Sync.getErrorHistory(),
            
            /**
             * Force a sync operation
             * @returns {Promise<void>}
             */
            forceSync: () => Sync.syncAll(),
            
            /**
             * Clear the sync queue
             */
            clearQueue: () => Sync.clearQueue(),
            
            /**
             * Clear error history
             */
            clearErrors: () => Sync.clearErrorHistory(),
            
            /**
             * Get last sync time (formatted)
             * @returns {string} Formatted date string
             */
            lastSync: () => Sync.getLastSyncTime(),
            
            /**
             * Create a test entry for debugging
             * @returns {Promise<{success: boolean, id?: string}>}
             */
            testEntry: async () => {
                const testEntry = {
                    date: new Date().toISOString().split('T')[0],
                    weight: Math.round((50 + Math.random() * 50) * 100) / 100,
                    calories: Math.round(1500 + Math.random() * 1000)
                };
                console.log('[SyncDebug] Creating test entry:', testEntry);
                return await Sync.saveWeightEntry(testEntry);
            },
            
            /**
             * Print debug info to console
             */
            info: () => {
                const status = Sync.getStatus();
                const queue = Sync.getQueue();
                const errors = Sync.getErrorHistory();
                
                console.groupCollapsed('[SyncDebug] Full Status Report');
                console.log('Status:', status);
                console.log(`Queue: ${queue.length} pending operations`);
                if (queue.length > 0) {
                    console.table(queue);
                }
                console.log(`Errors: ${errors.length} in history`);
                if (errors.length > 0) {
                    console.table(errors.slice(0, 10));
                }
                console.groupEnd();
                
                return { status, queue, errors };
            },
            
            /**
             * Help - list available commands
             */
            help: () => {
                console.log(`
[SyncDebug] Available commands:
  SyncDebug.status()     - Get detailed sync status
  SyncDebug.queue()      - Get pending operations
  SyncDebug.errors()     - Get error history
  SyncDebug.forceSync()  - Trigger immediate sync
  SyncDebug.clearQueue() - Clear pending operations
  SyncDebug.clearErrors()- Clear error history
  SyncDebug.lastSync()   - Get last sync time
  SyncDebug.testEntry()  - Create test entry
  SyncDebug.info()       - Full status report
  SyncDebug.help()       - Show this help
                `);
            }
        };
        
        console.log('[Sync] Debug utilities exposed (window.SyncDebug). Type SyncDebug.help() for commands.');
    }
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sync;
}
