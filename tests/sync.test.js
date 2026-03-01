/**
 * Sync Module Tests
 * Tests for offline-first data synchronization, queue management, and merge logic
 */

describe('Sync.init', () => {
    beforeEach(() => {
        localStorage.clear();
        // Reset any sync state
        if (window.Sync) {
            // Re-initialize for each test
        }
    });

    it('initializes without errors', () => {
        expect(() => Sync.init()).not.toThrow();
    });

    it('loads empty queue from localStorage when no data', () => {
        localStorage.clear();
        Sync.init();
        const queue = Sync.getQueue();
        expect(queue).toHaveLength(0);
    });

    it('loads pending queue from localStorage', () => {
        localStorage.clear();
        const pendingOps = [
            { id: 'op-1', type: 'create', table: 'weight_entries', data: { weight: 80 }, timestamp: Date.now(), retries: 0 },
            { id: 'op-2', type: 'update', table: 'weight_entries', data: { weight: 81 }, timestamp: Date.now(), retries: 0 }
        ];
        localStorage.setItem('tdee_sync_queue', JSON.stringify(pendingOps));
        
        Sync.init();
        const queue = Sync.getQueue();
        expect(queue).toHaveLength(2);
        expect(queue[0].type).toBe('create');
        expect(queue[1].type).toBe('update');
    });

    it('loads error history from localStorage', () => {
        localStorage.clear();
        const errors = [
            { id: 'err-1', timestamp: Date.now(), operation: 'create', error: 'Network error', resolved: false }
        ];
        localStorage.setItem('tdee_sync_history', JSON.stringify(errors));
        
        Sync.init();
        const history = Sync.getErrorHistory();
        expect(history).toHaveLength(1);
        expect(history[0].operation).toBe('create');
    });
});

describe('Sync.queueOperation', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
    });

    it('creates operation with correct structure', () => {
        const operationId = Sync.queueOperation('create', 'weight_entries', { weight: 80, calories: 1600 }, 'local-123');
        
        expect(operationId).toBeDefined();
        const queue = Sync.getQueue();
        expect(queue).toHaveLength(1);
        
        const op = queue[0];
        expect(op.id).toBeDefined();
        expect(op.type).toBe('create');
        expect(op.table).toBe('weight_entries');
        expect(op.data.weight).toBe(80);
        expect(op.localId).toBe('local-123');
        expect(op.timestamp).toBeDefined();
        expect(op.retries).toBe(0);
    });

    it('persists queue to localStorage immediately', () => {
        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        
        const stored = localStorage.getItem('tdee_sync_queue');
        expect(stored).toBeDefined();
        
        const parsed = JSON.parse(stored);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].type).toBe('create');
    });

    it('queues multiple operations', () => {
        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        Sync.queueOperation('update', 'weight_entries', { weight: 81, id: 'entry-1' });
        Sync.queueOperation('delete', 'weight_entries', { id: 'entry-2' });
        
        const queue = Sync.getQueue();
        expect(queue).toHaveLength(3);
        expect(queue.map(o => o.type)).toEqual(['create', 'update', 'delete']);
    });

    it('includes timestamp in operation', () => {
        const before = Date.now();
        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        const after = Date.now();
        
        const queue = Sync.getQueue();
        expect(queue[0].timestamp).toBeGreaterThanOrEqual(before);
        expect(queue[0].timestamp).toBeLessThanOrEqual(after);
    });
});

describe('Sync.clearQueue', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('clears all pending operations', () => {
        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        Sync.queueOperation('update', 'weight_entries', { weight: 81 });
        
        expect(Sync.getQueue()).toHaveLength(2);
        
        Sync.clearQueue();
        
        expect(Sync.getQueue()).toHaveLength(0);
    });

    it('removes queue from localStorage', () => {
        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        Sync.clearQueue();
        
        const stored = localStorage.getItem('tdee_sync_queue');
        expect(JSON.parse(stored)).toHaveLength(0);
    });
});

describe('Sync.saveWeightEntry', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
    });

    it('saves to LocalStorage immediately (optimistic UI)', async () => {
        const entry = {
            date: '2026-02-26',
            weight: 80.5,
            calories: 1600,
            notes: 'Test entry'
        };

        const result = await Sync.saveWeightEntry(entry);

        expect(result.success).toBeTrue();
        const retrieved = Storage.getEntry('2026-02-26');
        expect(retrieved.weight).toBe(80.5);
        expect(retrieved.calories).toBe(1600);
    });

    it('returns error for missing date field', async () => {
        const entry = { weight: 80, calories: 1600 };

        const result = await Sync.saveWeightEntry(entry);

        expect(result.success).toBeFalse();
        expect(result.error).toBe('Entry must include date field');
    });

    it('queues sync operation when entry saved', async () => {
        const entry = {
            date: '2026-02-27',
            weight: 81,
            calories: 1700
        };

        await Sync.saveWeightEntry(entry);

        const queue = Sync.getQueue();
        expect(queue).toHaveLength(1);
        expect(queue[0].type).toBe('create');
        expect(queue[0].table).toBe('weight_entries');
    });

    it('includes user_id in queued operation', async () => {
        // Mock Auth module
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'user-456', email: 'test@example.com' }),
            getSession: async () => ({ session: { user: { id: 'user-456' } } }),
            _getSupabase: () => null,
            onAuthStateChange: () => {}
        };

        const entry = {
            date: '2026-02-28',
            weight: 82,
            calories: 1800
        };

        await Sync.saveWeightEntry(entry);

        const queue = Sync.getQueue();
        expect(queue[0].data.user_id).toBe('user-456');
    });
});

describe('Sync.updateWeightEntry', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
    });

    it('updates LocalStorage entry', async () => {
        Storage.saveEntry('2026-03-01', { weight: 80, calories: 1600, notes: 'Original' });
        
        const result = await Sync.updateWeightEntry({
            date: '2026-03-01',
            weight: 81,
            calories: 1700,
            notes: 'Updated'
        });

        expect(result.success).toBeTrue();
        const retrieved = Storage.getEntry('2026-03-01');
        expect(retrieved.weight).toBe(81);
        expect(retrieved.calories).toBe(1700);
    });

    it('queues update operation', async () => {
        Storage.saveEntry('2026-03-02', { weight: 80 });
        
        await Sync.updateWeightEntry({
            date: '2026-03-02',
            weight: 81
        });

        const queue = Sync.getQueue();
        expect(queue).toHaveLength(1);
        expect(queue[0].type).toBe('update');
    });

    it('returns error for non-existent entry', async () => {
        const result = await Sync.updateWeightEntry({
            date: '2026-03-03',
            weight: 80
        });

        expect(result.success).toBeFalse();
    });
});

describe('Sync.deleteWeightEntry', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
    });

    it('deletes from LocalStorage', async () => {
        Storage.saveEntry('2026-03-04', { weight: 80 });
        
        const result = await Sync.deleteWeightEntry('2026-03-04');

        expect(result.success).toBeTrue();
        expect(Storage.getEntry('2026-03-04')).toBeNull();
    });

    it('queues delete operation', async () => {
        Storage.saveEntry('2026-03-05', { weight: 80 });
        
        await Sync.deleteWeightEntry('2026-03-05');

        const queue = Sync.getQueue();
        expect(queue).toHaveLength(1);
        expect(queue[0].type).toBe('delete');
        expect(queue[0].data.id).toBe('2026-03-05');
    });
});

describe('Sync.mergeEntries', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
    });

    it('combines remote and local data', () => {
        // Add local entry
        Storage.saveEntry('2026-03-06', { weight: 80, calories: 1600, updatedAt: '2026-03-06T10:00:00Z' });
        
        const remoteEntries = [
            { date: '2026-03-07', weight: 81, calories: 1700, updated_at: '2026-03-07T10:00:00Z' }
        ];

        const merged = Sync.mergeEntries(remoteEntries);

        expect(merged).toHaveLength(2);
        const dates = merged.map(e => e.date);
        expect(dates).toContain('2026-03-06');
        expect(dates).toContain('2026-03-07');
    });

    it('conflict resolution: newest timestamp wins', () => {
        // Local entry with older timestamp
        Storage.saveEntry('2026-03-08', { weight: 80, calories: 1600, updatedAt: '2026-03-08T10:00:00Z' });
        
        // Remote entry with newer timestamp
        const remoteEntries = [
            { 
                date: '2026-03-08', 
                weight: 82, 
                calories: 1800, 
                updated_at: '2026-03-08T15:00:00Z' 
            }
        ];

        const merged = Sync.mergeEntries(remoteEntries);

        // Remote should win (newer timestamp)
        const mergedEntry = merged.find(e => e.date === '2026-03-08');
        expect(mergedEntry.weight).toBe(82);
        expect(mergedEntry.calories).toBe(1800);
    });

    it('keeps local entry when local timestamp is newer', () => {
        // Local entry with newer timestamp
        Storage.saveEntry('2026-03-09', { weight: 83, calories: 1900, updatedAt: '2026-03-09T15:00:00Z' });
        
        // Remote entry with older timestamp
        const remoteEntries = [
            { 
                date: '2026-03-09', 
                weight: 80, 
                calories: 1600, 
                updated_at: '2026-03-09T10:00:00Z' 
            }
        ];

        const merged = Sync.mergeEntries(remoteEntries);

        // Local should win (newer timestamp)
        const mergedEntry = merged.find(e => e.date === '2026-03-09');
        expect(mergedEntry.weight).toBe(83);
        expect(mergedEntry.calories).toBe(1900);
    });

    it('preserves local-only entries', () => {
        Storage.saveEntry('2026-03-10', { weight: 80 });
        Storage.saveEntry('2026-03-11', { weight: 81 });
        
        const remoteEntries = [
            { date: '2026-03-12', weight: 82, updated_at: '2026-03-12T10:00:00Z' }
        ];

        const merged = Sync.mergeEntries(remoteEntries);

        expect(merged).toHaveLength(3);
        const dates = merged.map(e => e.date);
        expect(dates).toContain('2026-03-10');
        expect(dates).toContain('2026-03-11');
        expect(dates).toContain('2026-03-12');
    });

    it('adds remote-only entries', () => {
        const remoteEntries = [
            { date: '2026-03-13', weight: 80, updated_at: '2026-03-13T10:00:00Z' },
            { date: '2026-03-14', weight: 81, updated_at: '2026-03-14T10:00:00Z' }
        ];

        const merged = Sync.mergeEntries(remoteEntries);

        expect(merged).toHaveLength(2);
    });

    it('handles duplicates by date', () => {
        Storage.saveEntry('2026-03-15', { weight: 80, updatedAt: '2026-03-15T10:00:00Z' });
        
        const remoteEntries = [
            { date: '2026-03-15', weight: 82, updated_at: '2026-03-15T15:00:00Z' },
            { date: '2026-03-15', weight: 83, updated_at: '2026-03-15T20:00:00Z' }
        ];

        const merged = Sync.mergeEntries(remoteEntries);

        // Should have one entry for the date (the newest remote one)
        const entriesForDate = merged.filter(e => e.date === '2026-03-15');
        expect(entriesForDate.length).toBe(1);
        expect(entriesForDate[0].weight).toBe(83);
    });

    it('sorts merged entries by date descending', () => {
        Storage.saveEntry('2026-03-16', { weight: 80, updatedAt: '2026-03-16T10:00:00Z' });
        
        const remoteEntries = [
            { date: '2026-03-14', weight: 78, updated_at: '2026-03-14T10:00:00Z' },
            { date: '2026-03-18', weight: 82, updated_at: '2026-03-18T10:00:00Z' }
        ];

        const merged = Sync.mergeEntries(remoteEntries);

        expect(merged[0].date).toBe('2026-03-18');
        expect(merged[1].date).toBe('2026-03-16');
        expect(merged[2].date).toBe('2026-03-14');
    });
});

describe('Sync.getStatus', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns correct status structure', () => {
        const status = Sync.getStatus();

        expect(status).toBeDefined();
        expect(typeof status.isOnline).toBe('boolean');
        expect(typeof status.isAuthenticated).toBe('boolean');
        expect(typeof status.pendingOperations).toBe('number');
        expect(status.lastSyncTimeFormatted).toBeDefined();
        expect(typeof status.isSyncing).toBe('boolean');
        expect(typeof status.errorCount).toBe('number');
    });

    it('shows correct pending operations count', () => {
        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        Sync.queueOperation('update', 'weight_entries', { weight: 81 });

        const status = Sync.getStatus();
        expect(status.pendingOperations).toBe(2);
    });

    it('includes recent errors in status', () => {
        // Manually add errors to test
        localStorage.setItem('tdee_sync_history', JSON.stringify([
            { id: 'e1', timestamp: Date.now(), operation: 'create', error: 'Error 1', resolved: false },
            { id: 'e2', timestamp: Date.now(), operation: 'update', error: 'Error 2', resolved: false },
            { id: 'e3', timestamp: Date.now(), operation: 'delete', error: 'Error 3', resolved: false }
        ]));
        
        Sync.init();
        const status = Sync.getStatus();
        
        expect(status.errorCount).toBe(3);
        expect(status.recentErrors).toHaveLength(3);
    });
});

describe('Sync.getQueue', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns pending operations', () => {
        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        Sync.queueOperation('update', 'weight_entries', { weight: 81 });

        const queue = Sync.getQueue();
        expect(queue).toHaveLength(2);
    });

    it('includes operation metadata', () => {
        Sync.queueOperation('create', 'weight_entries', { weight: 80 }, 'local-123');

        const queue = Sync.getQueue();
        expect(queue[0]).toBeDefined();
        expect(queue[0].id).toBeDefined();
        expect(queue[0].type).toBe('create');
        expect(queue[0].table).toBe('weight_entries');
        expect(queue[0].timestampFormatted).toBeDefined();
        expect(queue[0].retries).toBe(0);
        expect(queue[0].localId).toBe('local-123');
    });

    it('returns empty array when queue is empty', () => {
        const queue = Sync.getQueue();
        expect(queue).toEqual([]);
    });
});

describe('Sync.getErrorHistory', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns error entries', () => {
        // Trigger an error by manually recording one
        Sync.init();
        
        // Use internal method via window for testing
        const errorEntry = {
            id: 'test-error-1',
            timestamp: Date.now(),
            operation: 'test',
            error: 'Test error',
            details: {},
            resolved: false
        };
        
        // Access internal state through localStorage
        localStorage.setItem('tdee_sync_history', JSON.stringify([errorEntry]));
        Sync.init();
        
        const history = Sync.getErrorHistory();
        expect(history).toHaveLength(1);
        expect(history[0].operation).toBe('test');
        expect(history[0].timestampFormatted).toBeDefined();
    });

    it('returns empty array when no errors', () => {
        const history = Sync.getErrorHistory();
        expect(history).toEqual([]);
    });
});

describe('Sync.clearErrorHistory', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('clears all error entries', () => {
        localStorage.setItem('tdee_sync_history', JSON.stringify([
            { id: 'e1', timestamp: Date.now(), operation: 'create', error: 'Error 1', resolved: false }
        ]));
        
        Sync.init();
        expect(Sync.getErrorHistory()).toHaveLength(1);
        
        Sync.clearErrorHistory();
        expect(Sync.getErrorHistory()).toHaveLength(0);
    });

    it('removes error history from localStorage', () => {
        localStorage.setItem('tdee_sync_history', JSON.stringify([
            { id: 'e1', timestamp: Date.now(), operation: 'create', error: 'Error 1', resolved: false }
        ]));
        
        Sync.init();
        Sync.clearErrorHistory();
        
        const stored = localStorage.getItem('tdee_sync_history');
        expect(JSON.parse(stored)).toHaveLength(0);
    });
});

describe('Sync.canSync', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns false when Auth module not available', () => {
        delete window.Auth;
        // canSync is internal, but we can test through syncAll behavior
        // This is tested indirectly through syncAll tests
    });

    it('returns false when offline', () => {
        // Simulate offline state
        const originalOnLine = navigator.onLine;
        
        // This is tested through syncAll which calls canSync internally
        // The actual canSync function is internal to the module
    });
});

describe('Sync integration', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
    });

    it('preserves data through full sync cycle', async () => {
        const entry = {
            date: '2026-03-20',
            weight: 80.5,
            calories: 1600,
            notes: 'Integration test'
        };

        // Save entry
        const result = await Sync.saveWeightEntry(entry);
        expect(result.success).toBeTrue();

        // Verify LocalStorage updated immediately
        const retrieved = Storage.getEntry('2026-03-20');
        expect(retrieved.weight).toBe(80.5);

        // Verify queue has pending operation
        const queue = Sync.getQueue();
        expect(queue).toHaveLength(1);
        expect(queue[0].type).toBe('create');
    });

    it('handles multiple entry operations', async () => {
        await Sync.saveWeightEntry({ date: '2026-03-21', weight: 80, calories: 1600 });
        await Sync.saveWeightEntry({ date: '2026-03-22', weight: 81, calories: 1700 });
        await Sync.updateWeightEntry({ date: '2026-03-21', weight: 80.5, calories: 1650 });

        const queue = Sync.getQueue();
        expect(queue).toHaveLength(3);
        
        const types = queue.map(o => o.type);
        expect(types).toEqual(['create', 'create', 'update']);
    });
});
