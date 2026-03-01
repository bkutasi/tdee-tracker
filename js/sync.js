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

// Load SyncDebug module (Node.js compatibility)
// In browser, SyncDebug is loaded via script tag before this file
let _SyncDebug;
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment - use require
    _SyncDebug = require('./sync-debug.js');
} else {
    // Browser environment - use global
    _SyncDebug = (typeof _SyncDebug !== 'undefined') ? SyncDebug : null;
}

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
    
    // Sync error history (last 50 errors)
    let syncErrorHistory = [];
    const MAX_ERROR_HISTORY = 50;

    /**
     * Initialize sync module
     */
    async function init() {
        if (isInitialized) {
            _SyncDebug.info('Already initialized');
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
            _SyncDebug.info('Waiting for auth session...');
            const authReady = await waitForAuthReady(Auth, 5000);
            if (authReady) {
                _SyncDebug.info('Auth session ready');
            } else {
                _SyncDebug.warn('Auth timeout - sync will retry when auth ready');
            }
        }

        // Start background sync after auth is ready
        startBackgroundSync();

        isInitialized = true;
        _SyncDebug.info('Initialized');
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
                _SyncDebug.debug(`Auth check pending: ${error.message}`);
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
                _SyncDebug.info(`Loaded ${syncQueue.length} pending operations`);
            }
        } catch (error) {
            _SyncDebug.error(`Failed to load queue: ${error.message}`);
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
            _SyncDebug.error(`Failed to save queue: ${error.message}`);
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
                _SyncDebug.info(`Loaded ${syncErrorHistory.length} error history entries`);
            }
        } catch (error) {
            _SyncDebug.error(`Failed to load error history: ${error.message}`);
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
            _SyncDebug.error(`Failed to save error history: ${error.message}`);
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
        _SyncDebug.error(`Error recorded: ${operation} - ${error.message || error}`);
    }

    /**
     * Set up network status listeners
     */
    function setupNetworkListeners() {
        window.addEventListener('online', async () => {
            _SyncDebug.info('Network online - starting sync');
            await syncAll();
        });

        window.addEventListener('offline', () => {
            _SyncDebug.warn('Network offline - queuing operations');
        });
    }

    /**
     * Set up auth state change listener
     * Triggers data fetch/merge + upload on sign-in, pauses sync on sign-out
     */
    function setupAuthStateListener() {
        const Auth = window.Auth;
        if (!Auth) {
            _SyncDebug.warn('Auth module not available - skipping auth listener setup');
            return;
        }

        Auth.onAuthStateChange(async (event, user) => {
            _SyncDebug.info('Auth state changed:', event);

            if (event === 'SIGNED_IN') {
                _SyncDebug.info('User signed in - syncing bidirectional data...');
                
                // First, fetch remote data and merge with local
                await fetchAndMergeData();
                
                // Then, upload any local-only entries to Supabase
                // This happens automatically - no user action needed
                const backfillResult = await queueLocalEntriesForSync();
                
                if (backfillResult.success && backfillResult.queued > 0) {
                    _SyncDebug.info(`Queued ${backfillResult.queued} local entries for upload`);
                    showToast(`Syncing ${backfillResult.queued} local entr${backfillResult.queued === 1 ? 'y' : 'ies'} to cloud...`, 'info');
                }
            } else if (event === 'SIGNED_OUT') {
                _SyncDebug.info('User signed out - pausing sync');
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
            _SyncDebug.info('Fetching remote data...');

            // Fetch from Supabase
            const remoteResult = await fetchWeightEntries();

            if (!remoteResult.success) {
                _SyncDebug.error('Failed to fetch remote data:', remoteResult.error);
                showToast('Failed to fetch remote data. Using local data only.', 'error');
                return;
            }

            const remoteEntries = remoteResult.entries || [];
            _SyncDebug.info(`Fetched ${remoteEntries.length} remote entries`);

            // Merge with local data
            const mergedEntries = mergeEntries(remoteEntries);
            _SyncDebug.info(`Merged to ${mergedEntries.length} total entries`);

            // Save merged data to LocalStorage
            // Storage expects entries as object keyed by date, not array
            const allEntries = Storage.getAllEntries();
            
            // Merge remote entries into existing entries
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
            
            // Save all entries back to LocalStorage
            localStorage.setItem('tdee_entries', JSON.stringify(allEntries));
            _SyncDebug.info('Merged data saved to LocalStorage');

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
            _SyncDebug.error('Fetch and merge failed:', error);
            showToast('Sync failed. Your local data is safe.', 'error');
        }
    }

    /**
     * Queue all local entries for upload to Supabase
     * Used for initial sync or backfilling unsynced data
     * @returns {Promise<{success: boolean, queued: number, error?: string}>}
     */
    async function queueLocalEntriesForSync() {
        const Storage = window.Storage;
        const Auth = window.Auth;

        // Check authentication
        if (!Auth || !Auth.isAuthenticated()) {
            _SyncDebug.info('Not authenticated - skipping');
            return { success: false, error: 'Not authenticated' };
        }

        const user = Auth.getCurrentUser();
        if (!user) {
            _SyncDebug.info('No user - skipping');
            return { success: false, error: 'No user found' };
        }

        // Get all local entries
        const allEntriesObj = Storage.getAllEntries();
        const localEntries = Object.entries(allEntriesObj || {}).map(([date, entry]) => ({
            date,
            ...entry
        }));

        if (localEntries.length === 0) {
            _SyncDebug.info('No local entries to queue');
            return { success: true, queued: 0 };
        }

        _SyncDebug.info(`Queuing ${localEntries.length} local entries for sync...`);

        // Fetch remote entries to avoid duplicates
        const remoteResult = await fetchWeightEntries();
        const remoteDates = new Set();
        
        if (remoteResult.success && remoteResult.entries) {
            remoteResult.entries.forEach(entry => {
                if (entry.date) {
                    remoteDates.add(entry.date);
                }
            });
            _SyncDebug.info(`Found ${remoteDates.size} remote entries`);
        }

        // Queue only entries that don't exist remotely AND have valid weight
        let queuedCount = 0;
        let skippedCount = 0;
        let invalidCount = 0;
        
        localEntries.forEach(entry => {
            // Skip if already exists remotely
            if (remoteDates.has(entry.date)) {
                _SyncDebug.debug(`Skipping ${entry.date} (already exists remotely)`);
                skippedCount++;
                return;
            }
            
            // Validate entry has required weight field
            if (entry.weight === null || entry.weight === undefined || entry.weight === '') {
                _SyncDebug.warn(`Skipping ${entry.date} (missing weight value - calories-only entries cannot be synced)`);
                invalidCount++;
                return;
            }
            
            // Entry is valid - queue for sync
            queueOperation('create', 'weight_entries', {
                user_id: user.id,
                date: entry.date,
                weight: entry.weight,
                calories: entry.calories || null,
                notes: entry.notes || null
            }, entry.date);
            queuedCount++;
        });

        _SyncDebug.info(`Queued ${queuedCount} entries for upload`);
        if (invalidCount > 0) {
            _SyncDebug.warn(`Skipped ${invalidCount} entries with missing weight values`);
            showToast(`Skipped ${invalidCount} incomplete entries (weight required for sync)`, 'info');
        }
        if (skippedCount > 0) {
            _SyncDebug.debug(`Skipped ${skippedCount} entries already synced`);
        }
        
        // Trigger immediate sync if online
        if (navigator.onLine) {
            _SyncDebug.info('Triggering immediate sync...');
            await syncAll();
        }

        return { success: true, queued: queuedCount };
    }

    /**
     * Refresh all UI components after data merge
     */
    function refreshUI() {
        _SyncDebug.info('Refreshing UI components');

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
        _SyncDebug.info(`Toast (${type}):`, message);

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

        _SyncDebug.log(`Queued ${type} operation for ${table} [ID: ${operation.id}]`, 'info', { operation });

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
        const removed = []; // Track operations removed due to retry limit or duplicate errors

        for (const operation of syncQueue) {
            try {
                const success = await executeOperation(operation);
                if (!success) {
                    // Check if operation should be removed (retry limit OR duplicate key)
                    const errorMessage = operation.lastError?.message || '';
                    const isDuplicateKey = errorMessage.includes('duplicate key') || 
                                          errorMessage.includes('23505');
                    
                    if (operation.retries > 3 || isDuplicateKey) {
                        removed.push(operation);
                        // Don't add to failed - remove from queue permanently
                    } else {
                        failed.push(operation);
                    }
                }
            } catch (error) {
                _SyncDebug.log(`Operation failed: ${error.message}`, 'error', { operation, error });
                recordError(operation.type, error, { operation });
                failed.push(operation);
            }
        }

        // Keep failed operations for retry (only those under retry limit)
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

        // Dispatch sync complete event
        window.dispatchEvent(new CustomEvent('sync:complete', {
            detail: { 
                success: failed.length === 0 && removed.length === 0, 
                failed: failed.length,
                succeeded: operationCount - failed.length - removed.length,
                removed: removed.length,
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
            _SyncDebug.log(`Operation exceeded retry limit [ID: ${id}]`, 'error', { operation });
            recordError(`${type} (retry limit)`, new Error('Max retries exceeded'), { operation });
            return false;
        }

        _SyncDebug.log(`Executing ${type} on ${table} [ID: ${id}, Retry: ${retries}]`, 'debug');

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
        } else {
            const errorMessage = result.error?.message || result.error || 'Unknown error';
            const errorCode = result.error?.code || result.error?.status;
            
            // Check if this is a duplicate key violation (409 Conflict)
            const isDuplicateKey = errorMessage.includes('duplicate key') || 
                                   errorCode === '409' || 
                                   errorCode === '23505'; // PostgreSQL unique violation code
            
            if (isDuplicateKey) {
                // Don't retry duplicate key errors - they won't succeed on retry
                _SyncDebug.log(`Duplicate key detected [ID: ${id}] - removing from queue (will be handled by existence check)`, 'warn');
                recordError(`${type} ${table} (duplicate)`, result.error || new Error('Duplicate key'), { operation });
                return false; // Operation will be removed from queue
            }
            
            _SyncDebug.log(`Operation failed [ID: ${id}]: ${errorMessage}`, 'error', { error: result.error });
            recordError(`${type} ${table}`, result.error || new Error('Operation failed'), { operation });
            operation.retries = retries + 1;
            return false;
        }
    }

    /**
     * Create record in Supabase with duplicate detection
     * For weight_entries, checks if entry exists (user_id + date) and converts to UPDATE if needed
     */
    async function createRecord(table, data) {
        const supabase = await getSupabase();

        if (!supabase) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            // Special handling for weight_entries to prevent duplicate key violations
            if (table === 'weight_entries' && data.user_id && data.date) {
                // Check if entry already exists
                const { data: existing, error: fetchError } = await supabase
                    .from(table)
                    .select('id')
                    .eq('user_id', data.user_id)
                    .eq('date', data.date)
                    .single();

                if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
                    return { success: false, error: fetchError };
                }

                // Entry exists - convert to UPDATE instead of INSERT
                if (existing && existing.id) {
                    _SyncDebug.log(`Entry already exists [user_id: ${data.user_id}, date: ${data.date}] - converting to UPDATE`, 'info');
                    return await updateRecord(table, { id: existing.id, ...data });
                }
            }

            // No existing entry - proceed with INSERT
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
            _SyncDebug.log('getSupabase: Auth module not available', 'error');
            return null;
        }

        try {
            const { session } = await Auth.getSession();
            if (!session) {
                _SyncDebug.log('getSupabase: No active session', 'warn');
                return null;
            }

            // Get Supabase instance from Auth
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

    /**
     * Save weight entry (LocalStorage + Sync Queue)
     * @param {object} entry - Weight entry data (must include date, weight, calories, notes)
     * @returns {Promise<{success: boolean, id?: string, error?: string}>}
     */
    async function saveWeightEntry(entry) {
        const Storage = window.Storage;

        // Validate entry has required date field
        if (!entry || !entry.date) {
            console.error('[Sync.saveWeightEntry] Missing date field');
            return { success: false, error: 'Entry must include date field' };
        }

        // Save to LocalStorage immediately (optimistic UI)
        const localResult = Storage.saveEntry(entry.date, {
            weight: entry.weight,
            calories: entry.calories,
            notes: entry.notes || ''
        });
        
        if (localResult !== true) {
            console.error('[Sync.saveWeightEntry] LocalStorage save failed');
            return localResult;
        }

        // Check authentication status
        const Auth = window.Auth;
        if (!Auth) {
            _SyncDebug.log('Auth module not available - entry saved locally only', 'warn');
            return localResult;
        }

        const isAuthenticated = Auth.isAuthenticated();
        const user = Auth.getCurrentUser();

        // Queue sync to Supabase if authenticated (regardless of online status)
        if (isAuthenticated && user) {
            // Validate entry has required weight field before queuing
            if (entry.weight === null || entry.weight === undefined || entry.weight === '') {
                _SyncDebug.log('Entry saved locally but not queued - missing weight value', 'warn');
                return localResult;
            }
            
            // Check if entry already exists in LocalStorage to determine operation type
            const existingEntries = Storage.getEntries();
            const existingEntry = existingEntries[entry.date];
            const isNewEntry = !existingEntry || !existingEntry.id;
            
            // Queue appropriate operation type (CREATE for new, UPDATE for existing)
            const operationType = isNewEntry ? 'create' : 'update';
            const operationData = isNewEntry ? {
                user_id: user.id,
                date: entry.date,
                weight: entry.weight,
                calories: entry.calories || null,
                notes: entry.notes || null
            } : {
                id: existingEntry.id,
                user_id: user.id,
                date: entry.date,
                weight: entry.weight,
                calories: entry.calories || null,
                notes: entry.notes || null
            };
            
            _SyncDebug.log(`Queueing ${operationType} operation: userId=${user.id}, date=${entry.date}`, 'info');
            queueOperation(operationType, 'weight_entries', operationData, localResult.id);
        } else {
            _SyncDebug.log('User not authenticated - entry saved locally only (not queued)', 'warn');
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
            _SyncDebug.log('Auth module not available - entry updated locally only', 'warn');
            return localResult;
        }

        const isAuthenticated = Auth.isAuthenticated();
        const user = Auth.getCurrentUser();

        // Queue sync to Supabase if authenticated (regardless of online status)
        if (isAuthenticated && user) {
            // Validate entry has required weight field before queueing
            if (entry.weight === null || entry.weight === undefined || entry.weight === '') {
                console.warn('[Sync.updateWeightEntry] Skipping queue - entry missing weight value');
                _SyncDebug.log('Entry updated locally but not queued - missing weight value', 'warn');
                return localResult;
            }
            
            _SyncDebug.log(`Queueing update operation: userId=${user.id}, entryId=${entry.id}`, 'info');
            queueOperation('update', 'weight_entries', entry, entry.id);
        } else {
            _SyncDebug.log('User not authenticated - entry updated locally only (not queued)', 'warn');
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
            _SyncDebug.log('Auth module not available - entry deleted locally only', 'warn');
            return localResult;
        }

        const isAuthenticated = Auth.isAuthenticated();

        // Queue sync to Supabase if authenticated (regardless of online status)
        if (isAuthenticated) {
            _SyncDebug.log(`Queueing delete operation: entryId=${id}`, 'info');
            queueOperation('delete', 'weight_entries', { id }, id);
        } else {
            _SyncDebug.log('User not authenticated - entry deleted locally only (not queued)', 'warn');
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
            debugMode: _SyncDebug.DEBUG_MODE
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
        _SyncDebug.log('Error history cleared', 'info');
    }

    /**
     * Clear sync queue (use with caution)
     */
    function clearQueue() {
        const count = syncQueue.length;
        syncQueue = [];
        saveSyncQueue();
        _SyncDebug.log(`Queue cleared (${count} operations removed)`, 'warn');
    }
    
    /**
     * Remove stuck operations that exceeded retry limit
     * This cleans up the queue without losing all pending operations
     */
    function removeStuckOperations() {
        const initialCount = syncQueue.length;
        const stuckOps = syncQueue.filter(op => op.retries > 3);
        const keptOps = syncQueue.filter(op => op.retries <= 3);
        
        if (stuckOps.length > 0) {
            syncQueue = keptOps;
            saveSyncQueue();
            _SyncDebug.log(`Removed ${stuckOps.length} stuck operations (retry limit exceeded). ${keptOps.length} operations remaining.`, 'warn');
            showToast(`Removed ${stuckOps.length} stuck operations from queue`, 'info');
            return { removed: stuckOps.length, remaining: keptOps.length };
        }
        
        _SyncDebug.log('No stuck operations found in queue', 'info');
        return { removed: 0, remaining: initialCount };
    }
    
    /**
     * Filter out invalid operations from the queue (entries missing required fields)
     * This prevents sync failures due to data validation errors
     */
    function filterInvalidOperations() {
        const initialCount = syncQueue.length;
        let removedCount = 0;
        
        syncQueue = syncQueue.filter(op => {
            // Check create AND update operations for weight_entries
            if (op.table === 'weight_entries' && (op.type === 'create' || op.type === 'update')) {
                // Validate required fields
                if (op.data.weight === null || op.data.weight === undefined || op.data.weight === '') {
                    console.log(`[Sync.filterInvalidOperations] Removing invalid operation [ID: ${op.id}] - missing weight value`);
                    removedCount++;
                    return false; // Remove from queue
                }
            }
            return true; // Keep valid operations
        });
        
        if (removedCount > 0) {
            saveSyncQueue();
            _SyncDebug.log(`Filtered ${removedCount} invalid operations from queue (${initialCount} → ${syncQueue.length})`, 'warn');
            showToast(`Removed ${removedCount} invalid entries from sync queue (weight required)`, 'info');
            return { filtered: removedCount, remaining: syncQueue.length };
        }
        
        return { filtered: 0, remaining: syncQueue.length };
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
        queueLocalEntriesForSync,  // Added for backfilling local data
        getStatus,
        getQueue,
        getLastSyncTime,
        getErrorHistory,
        clearErrorHistory,
        clearQueue,
        filterInvalidOperations,  // Added to clean invalid entries from queue
        queueOperation
    };
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.Sync = Sync;
    
    // Expose debug utilities in development mode
    
    if (_SyncDebug.DEBUG_MODE) {
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
             * Filter out invalid operations from the queue
             * @returns {object} Filter results
             */
            filterQueue: () => Sync.filterInvalidOperations(),
            
            /**
             * Remove stuck operations that exceeded retry limit
             * @returns {object} Results with removed and remaining counts
             */
            removeStuck: () => Sync.removeStuckOperations(),
            
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
             * Queue all local entries for upload to Supabase
             * @returns {Promise<{success: boolean, queued: number}>}
             */
            backfillLocal: async () => {
                console.log('[SyncDebug] Starting local data backfill...');
                const result = await Sync.queueLocalEntriesForSync();
                console.log('[SyncDebug] Backfill complete:', result);
                return result;
            },
            
            /**
             * Help - list available commands
             */
            help: () => {
                console.log(`
[SyncDebug] Available commands:
  _SyncDebug.status()         - Get detailed sync status
  _SyncDebug.queue()          - Get pending operations
  _SyncDebug.errors()         - Get error history
  _SyncDebug.forceSync()      - Trigger immediate sync
  _SyncDebug.clearQueue()     - Clear pending operations
  _SyncDebug.filterQueue()    - Remove invalid operations (missing weight)
  _SyncDebug.removeStuck()    - Remove operations exceeding retry limit
  _SyncDebug.clearErrors()    - Clear error history
  _SyncDebug.lastSync()       - Get last sync time
  _SyncDebug.testEntry()      - Create test entry
  _SyncDebug.info()           - Full status report
  _SyncDebug.backfillLocal()  - Queue all local entries for upload
  _SyncDebug.help()           - Show this help
                `);
            }
        };
        
        console.log('[Sync] Debug utilities exposed (window.SyncDebug). Type _SyncDebug.help() for commands.');
    }
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sync;
}
