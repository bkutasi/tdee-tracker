/**
 * Sync Debug Module - Logging and Debug Utilities
 * 
 * Provides centralized logging and debug utilities for the Sync module.
 * Separated from sync.js to reduce complexity and improve maintainability.
 * 
 * Usage:
 *   SyncDebug.log('Message', 'info', { data });
 *   SyncDebug.status(); // Get sync status
 *   SyncDebug.info();   // Full debug report
 */

'use strict';

const SyncDebug = (function() {
    // Debug mode flag (enabled in development)
    const DEBUG_MODE = (typeof window !== 'undefined' && window.location) ? 
                       (window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        window.location.protocol === 'file:') : false;
    
    // Sync module reference (set after Sync is initialized)
    let syncModule = null;
    
    /**
     * Set the sync module reference
     * @param {object} sync - The Sync module
     */
    function setSyncModule(sync) {
        syncModule = sync;
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
     * Wrapper for info logging
     * @param {string} message - Log message
     * @param {object} data - Additional data
     */
    function info(message, data = null) {
        log(message, 'info', data);
    }
    
    /**
     * Wrapper for warning logging
     * @param {string} message - Log message
     * @param {object} data - Additional data
     */
    function warn(message, data = null) {
        log(message, 'warn', data);
    }
    
    /**
     * Wrapper for error logging
     * @param {string} message - Log message
     * @param {object} data - Additional data
     */
    function error(message, data = null) {
        log(message, 'error', data);
    }
    
    /**
     * Wrapper for debug logging
     * @param {string} message - Log message
     * @param {object} data - Additional data
     */
    function debug(message, data = null) {
        log(message, 'debug', data);
    }
    
    /**
     * Get current sync status
     * @returns {object} Detailed sync status
     */
    function status() {
        if (!syncModule) {
            warn('Sync module not initialized');
            return null;
        }
        return syncModule.getStatus();
    }
    
    /**
     * Get pending queue operations
     * @returns {array} Array of pending operations
     */
    function queue() {
        if (!syncModule) {
            warn('Sync module not initialized');
            return [];
        }
        return syncModule.getQueue();
    }
    
    /**
     * Get error history
     * @returns {array} Array of error entries
     */
    function errors() {
        if (!syncModule) {
            warn('Sync module not initialized');
            return [];
        }
        return syncModule.getErrorHistory();
    }
    
    /**
     * Force a sync operation
     * @returns {Promise<void>}
     */
    async function forceSync() {
        if (!syncModule) {
            warn('Sync module not initialized');
            return;
        }
        await syncModule.syncAll();
    }
    
    /**
     * Clear the sync queue
     */
    function clearQueue() {
        if (!syncModule) {
            warn('Sync module not initialized');
            return;
        }
        syncModule.clearQueue();
    }
    
    /**
     * Filter out invalid operations from the queue
     * @returns {object} Filter results
     */
    function filterQueue() {
        if (!syncModule) {
            warn('Sync module not initialized');
            return { filtered: 0, remaining: 0 };
        }
        return syncModule.filterInvalidOperations();
    }
    
    /**
     * Remove stuck operations that exceeded retry limit
     * @returns {object} Results with removed and remaining counts
     */
    function removeStuck() {
        if (!syncModule) {
            warn('Sync module not initialized');
            return { removed: 0, remaining: 0 };
        }
        return syncModule.removeStuckOperations();
    }
    
    /**
     * Clear error history
     */
    function clearErrors() {
        if (!syncModule) {
            warn('Sync module not initialized');
            return;
        }
        syncModule.clearErrorHistory();
    }
    
    /**
     * Get last sync time (formatted)
     * @returns {string} Formatted date string
     */
    function lastSync() {
        if (!syncModule) {
            warn('Sync module not initialized');
            return 'N/A';
        }
        return syncModule.getLastSyncTime();
    }
    
    /**
     * Create a test entry for debugging
     * @returns {Promise<{success: boolean, id?: string}>}
     */
    async function testEntry() {
        if (!syncModule) {
            warn('Sync module not initialized');
            return { success: false, error: 'Sync module not initialized' };
        }
        const testEntry = {
            date: new Date().toISOString().split('T')[0],
            weight: Math.round((50 + Math.random() * 50) * 100) / 100,
            calories: Math.round(1500 + Math.random() * 1000)
        };
        console.log('[SyncDebug] Creating test entry:', testEntry);
        return await syncModule.saveWeightEntry(testEntry);
    }
    
    /**
     * Print debug info to console
     */
    function info() {
        if (!syncModule) {
            warn('Sync module not initialized');
            return;
        }
        const status = syncModule.getStatus();
        const queue = syncModule.getQueue();
        const errors = syncModule.getErrorHistory();
        
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
    }
    
    /**
     * Queue all local entries for upload to Supabase
     * @returns {Promise<{success: boolean, queued: number}>}
     */
    async function backfillLocal() {
        if (!syncModule) {
            warn('Sync module not initialized');
            return { success: false, queued: 0 };
        }
        console.log('[SyncDebug] Starting local data backfill...');
        const result = await syncModule.queueLocalEntriesForSync();
        console.log('[SyncDebug] Backfill complete:', result);
        return result;
    }
    
    /**
     * Help - list available commands
     */
    function help() {
        console.log(`
[SyncDebug] Available commands:
  SyncDebug.log(message, level, data) - Log a message
  SyncDebug.info(message, data)       - Info level logging
  SyncDebug.warn(message, data)       - Warning level logging
  SyncDebug.error(message, data)      - Error level logging
  SyncDebug.debug(message, data)      - Debug level logging
  SyncDebug.status()                  - Get detailed sync status
  SyncDebug.queue()                   - Get pending operations
  SyncDebug.errors()                  - Get error history
  SyncDebug.forceSync()               - Trigger immediate sync
  SyncDebug.clearQueue()              - Clear pending operations
  SyncDebug.filterQueue()             - Remove invalid operations (missing weight)
  SyncDebug.removeStuck()             - Remove operations exceeding retry limit
  SyncDebug.clearErrors()             - Clear error history
  SyncDebug.lastSync()                - Get last sync time
  SyncDebug.testEntry()               - Create test entry
  SyncDebug.info()                    - Full status report
  SyncDebug.backfillLocal()           - Queue all local entries for upload
  SyncDebug.help()                    - Show this help
                `);
    }
    
    // Public API
    return {
        // Logging functions
        log,
        info,
        warn,
        error,
        debug,
        
        // Debug utilities
        status,
        queue,
        errors,
        forceSync,
        clearQueue,
        filterQueue,
        removeStuck,
        clearErrors,
        lastSync,
        testEntry,
        info,
        backfillLocal,
        help,
        
        // Internal
        setSyncModule,
        
        // Expose DEBUG_MODE for external checks
        DEBUG_MODE
    };
})();

// Expose to global scope
if (typeof window !== 'undefined') {
    window.SyncDebug = SyncDebug;
    
    // Auto-initialize with Sync module if available
    if (typeof Sync !== 'undefined') {
        SyncDebug.setSyncModule(Sync);
    }
    
    // Log debug mode status
    if (SyncDebug.DEBUG_MODE) {
        console.log('[SyncDebug] Debug utilities loaded (DEBUG_MODE enabled). Type SyncDebug.help() for commands.');
    }
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncDebug;
}
