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

    /**
     * Initialize sync module
     */
    async function init() {
        if (isInitialized) {
            console.log('[Sync] Already initialized');
            return;
        }

        // Load pending sync queue from LocalStorage
        loadSyncQueue();

        // Set up online/offline listeners
        setupNetworkListeners();

        // Start background sync
        startBackgroundSync();

        isInitialized = true;
        console.log('[Sync] Initialized');
    }

    /**
     * Load pending sync operations from LocalStorage
     */
    function loadSyncQueue() {
        try {
            const stored = localStorage.getItem(QUEUE_KEY);
            if (stored) {
                syncQueue = JSON.parse(stored);
                console.log(`[Sync] Loaded ${syncQueue.length} pending operations`);
            }
        } catch (error) {
            console.error('[Sync] Failed to load queue:', error);
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
            console.error('[Sync] Failed to save queue:', error);
        }
    }

    /**
     * Set up network status listeners
     */
    function setupNetworkListeners() {
        window.addEventListener('online', async () => {
            console.log('[Sync] Network online - starting sync');
            await syncAll();
        });

        window.addEventListener('offline', () => {
            console.log('[Sync] Network offline - queuing operations');
        });
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
     * Check if user is authenticated and online
     */
    function canSync() {
        const Auth = window.Auth;
        if (!Auth) {
            console.error('[Sync] Auth module not available');
            return false;
        }

        const isAuthenticated = Auth.isAuthenticated();
        const isOnline = navigator.onLine;

        if (!isAuthenticated) {
            console.log('[Sync] Not authenticated - skipping sync');
            return false;
        }

        if (!isOnline) {
            console.log('[Sync] Offline - queuing operations');
            return false;
        }

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

        console.log(`[Sync] Queued ${type} operation for ${table}`);

        // Attempt immediate sync if online
        if (navigator.onLine) {
            syncAll();
        }
    }

    /**
     * Sync all pending operations
     */
    async function syncAll() {
        if (isSyncing) {
            console.log('[Sync] Sync already in progress');
            return;
        }

        if (!canSync()) {
            return;
        }

        if (syncQueue.length === 0) {
            console.log('[Sync] No pending operations');
            return;
        }

        isSyncing = true;
        console.log(`[Sync] Starting sync of ${syncQueue.length} operations`);

        const failed = [];

        for (const operation of syncQueue) {
            try {
                const success = await executeOperation(operation);
                if (!success) {
                    failed.push(operation);
                }
            } catch (error) {
                console.error('[Sync] Operation failed:', error);
                failed.push(operation);
            }
        }

        // Keep failed operations for retry
        syncQueue = failed;
        saveSyncQueue();

        isSyncing = false;
        lastSyncTime = Date.now();

        console.log(`[Sync] Sync complete. ${failed.length} operations failed.`);

        // Dispatch sync complete event
        window.dispatchEvent(new CustomEvent('sync:complete', {
            detail: { success: failed.length === 0, failed: failed.length }
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

        const { type, table, data, retries } = operation;

        // Retry limit
        if (retries > 3) {
            console.error('[Sync] Operation exceeded retry limit:', operation);
            return false;
        }

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
                console.error('[Sync] Unknown operation type:', type);
                return false;
        }

        if (result.success) {
            console.log(`[Sync] ${type} ${table} synced successfully`);
            return true;
        } else {
            console.error('[Sync] Operation failed:', result.error);
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
        if (!Auth) return null;

        const { session } = await Auth.getSession();
        if (!session) return null;

        // Get Supabase instance from Auth
        return Auth._getSupabase ? Auth._getSupabase() : null;
    }

    /**
     * Save weight entry (LocalStorage + Sync Queue)
     * @param {object} entry - Weight entry data
     * @returns {Promise<{success: boolean, id?: string, error?: string}>}
     */
    async function saveWeightEntry(entry) {
        const Storage = window.Storage;

        // Save to LocalStorage immediately (optimistic UI)
        const localResult = Storage.saveEntry(entry);
        
        if (!localResult.success) {
            return localResult;
        }

        // Queue sync to Supabase if authenticated
        if (canSync()) {
            const Auth = window.Auth;
            const user = Auth.getCurrentUser();

            queueOperation('create', 'weight_entries', {
                user_id: user.id,
                date: entry.date,
                weight: entry.weight,
                calories: entry.calories || null,
                notes: entry.notes || null
            }, localResult.id);
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

        // Queue sync to Supabase
        if (canSync()) {
            queueOperation('update', 'weight_entries', entry, entry.id);
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

        // Queue sync to Supabase
        if (canSync()) {
            queueOperation('delete', 'weight_entries', { id }, id);
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
     * @returns {object} Merged entries
     */
    function mergeEntries(remoteEntries) {
        const Storage = window.Storage;
        const localEntries = Storage.getAllEntries();

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
        return {
            isOnline: navigator.onLine,
            isAuthenticated: window.Auth?.isAuthenticated() || false,
            pendingOperations: syncQueue.length,
            lastSyncTime,
            isSyncing
        };
    }

    /**
     * Clear sync queue (use with caution)
     */
    function clearQueue() {
        syncQueue = [];
        saveSyncQueue();
        console.log('[Sync] Queue cleared');
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
        getStatus,
        clearQueue,
        queueOperation
    };
})();

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sync;
}
