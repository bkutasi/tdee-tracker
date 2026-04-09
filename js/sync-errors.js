/**
 * Sync Errors Module - Error Handling & Queue Validation
 *
 * Manages sync error history persistence, queue validation, and stuck operation cleanup.
 * Queue operations accept dependency callbacks from sync.js to avoid circular coupling.
 *
 * Usage:
 *   SyncErrors.recordError('saveWeightEntry', error, { entryId: '123' });
 *   const history = SyncErrors.getErrorHistory();
 *   SyncErrors.clearErrorHistory();
 *
 * Queue operations require callbacks to sync.js internals:
 *   SyncErrors.filterInvalidOperations({ getQueue, setQueue, saveQueue, showToast });
 *   SyncErrors.removeStuckOperations({ getQueue, setQueue, saveQueue, showToast, MAX_RETRIES });
 */

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

const SyncErrors = (function() {
    'use strict';

    var AppConstants;

    if (typeof window !== 'undefined' && window.AppConstants) {
        AppConstants = window.AppConstants;
    } else if (typeof global !== 'undefined' && global.AppConstants) {
        AppConstants = global.AppConstants;
    } else {
        AppConstants = {
            MAX_SYNC_ERROR_HISTORY: 50
        };
    }

    const MAX_ERROR_HISTORY = AppConstants?.MAX_SYNC_ERROR_HISTORY || 50;
    const SYNC_HISTORY_KEY = 'tdee_sync_history';

    let syncErrorHistory = [];

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
     * @param {Error|string} error - Error object or message
     * @param {object} details - Additional error details
     */
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
        _SyncDebug.error(`Error recorded: ${operation} - ${errorMessage}`);
    }

    /**
     * Get error history with formatted timestamps
     * @returns {array} Array of error entries
     */
    function getErrorHistory() {
        return syncErrorHistory.map(err => ({
            ...err,
            timestampFormatted: new Date(err.timestamp).toLocaleString()
        }));
    }

    function clearErrorHistory() {
        syncErrorHistory = [];
        saveErrorHistory();
        _SyncDebug.log('Error history cleared', 'info');
    }

    /**
     * Remove stuck operations that exceeded retry limit
     * @param {object} deps - { getQueue, setQueue, saveQueue, showToast, MAX_RETRIES }
     * @returns {object} { removed, remaining }
     */
    function removeStuckOperations(deps) {
        const queue = deps.getQueue();
        const initialCount = queue.length;
        const maxRetries = deps.MAX_RETRIES !== undefined ? deps.MAX_RETRIES : 3;
        const stuckOps = queue.filter(op => op.retries > maxRetries);
        const keptOps = queue.filter(op => op.retries <= maxRetries);

        if (stuckOps.length > 0) {
            deps.setQueue(keptOps);
            deps.saveQueue();
            _SyncDebug.log(`Removed ${stuckOps.length} stuck operations (retry limit exceeded). ${keptOps.length} operations remaining.`, 'warn');
            if (deps.showToast) {
                deps.showToast(`Removed ${stuckOps.length} stuck operations from queue`, 'info');
            }
            return { removed: stuckOps.length, remaining: keptOps.length };
        }

        _SyncDebug.log('No stuck operations found in queue', 'info');
        return { removed: 0, remaining: initialCount };
    }

    /**
     * Filter out invalid operations from the queue
     * @param {object} deps - { getQueue, setQueue, saveQueue, showToast }
     * @returns {object} { filtered, remaining }
     */
    function filterInvalidOperations(deps) {
        const queue = deps.getQueue();
        const initialCount = queue.length;
        let removedCount = 0;

        const filteredQueue = queue.filter(op => {
            if (op.table === 'weight_entries' && (op.type === 'create' || op.type === 'update')) {
                const hasWeight = op.data.weight !== null && op.data.weight !== undefined && op.data.weight !== '';
                const hasCalories = op.data.calories !== null && op.data.calories !== undefined && op.data.calories !== '';

                if (!hasWeight && !hasCalories) {
                    _SyncDebug.log(`Removing invalid operation [ID: ${op.id}] - missing both weight and calories`, 'warn');
                    removedCount++;
                    return false;
                }
            }
            return true;
        });

        if (removedCount > 0) {
            deps.setQueue(filteredQueue);
            deps.saveQueue();
            _SyncDebug.log(`Filtered ${removedCount} invalid operations from queue (${initialCount} → ${filteredQueue.length})`, 'warn');
            if (deps.showToast) {
                deps.showToast(`Removed ${removedCount} invalid entries from sync queue (must have weight or calories)`, 'info');
            }
            return { filtered: removedCount, remaining: filteredQueue.length };
        }

        return { filtered: 0, remaining: filteredQueue.length };
    }

    return {
        loadErrorHistory,
        saveErrorHistory,
        recordError,
        getErrorHistory,
        clearErrorHistory,
        removeStuckOperations,
        filterInvalidOperations
    };
})();

if (typeof window !== 'undefined') {
    window.SyncErrors = SyncErrors;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncErrors;
}
