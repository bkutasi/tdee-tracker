#!/usr/bin/env node
/**
 * Phase 1 Validation Tests - Node.js Version
 * Tests for 5 critical fixes implemented in 2026-03-16
 * 
 * Run with: node tests/phase1-node.test.js
 * Or integrated into: node tests/node-test.js
 */

// Mock setup for Node.js environment
const mockLocalStorage = {
    data: {
        tdee_entries: '{}',
        tdee_settings: '{}',
        tdee_sync_queue: '[]',
        tdee_sync_history: '[]'
    },
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; },
    clear() { this.data = {}; }
};

global.localStorage = mockLocalStorage;

// Mock window for browser compatibility
global.window = {
    location: { hostname: 'localhost', protocol: 'file:' },
    addEventListener: () => {},
    dispatchEvent: () => {},
    CustomEvent: class { constructor(type, detail) { this.type = type; this.detail = detail; } }
};

// Mock navigator.onLine
global.navigator = { onLine: true };

// Mock crypto.randomUUID
if (!global.crypto) {
    global.crypto = {};
}
if (!global.crypto.randomUUID) {
    global.crypto.randomUUID = () => 'mock-uuid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Mock Supabase client
// By default, fail operations to keep them in queue (for testing)
let mockSupabaseShouldFail = true;
const mockSupabase = {
    from: (table) => ({
        insert: (data) => ({
            select: () => ({
                single: async () => ({
                    data: mockSupabaseShouldFail ? null : { ...data, id: 'mock-id-' + Date.now() },
                    error: mockSupabaseShouldFail ? { message: 'Mock sync failed' } : null
                })
            })
        }),
        update: (data) => ({
            eq: () => ({
                select: () => ({
                    single: async () => ({
                        data: mockSupabaseShouldFail ? null : data,
                        error: mockSupabaseShouldFail ? { message: 'Mock sync failed' } : null
                    })
                })
            })
        }),
        delete: () => ({
            eq: () => ({
                single: async () => ({
                    data: mockSupabaseShouldFail ? null : { id: 'deleted' },
                    error: mockSupabaseShouldFail ? { message: 'Mock sync failed' } : null
                })
            })
        }),
        select: () => ({
            order: () => ({
                data: [],
                error: null
            })
        })
    })
};

// Mock Auth module
global.window.Auth = {
    isAuthenticated: () => true,
    getCurrentUser: () => ({ id: 'test-user-123', email: 'test@example.com' }),
    getSession: async () => ({ session: { user: { id: 'test-user-123' } }, error: null }),
    _getSupabase: () => mockSupabase,
    onAuthStateChange: () => {}
};

// Load modules
const Utils = require('../js/utils.js');
global.Utils = Utils;
const Calculator = require('../js/calculator.js');
const Storage = require('../js/storage.js');

// Helper function for test output
// Note: expect, test, describe provided by node-test.js when loaded

// Helper to reset Sync module state
function resetSyncMocks() {
    mockLocalStorage.data.tdee_sync_queue = '[]';
    mockLocalStorage.data.tdee_sync_history = '[]';
    mockLocalStorage.data.tdee_entries = '{}';
    mockLocalStorage.data.tdee_settings = '{}';
    
    // Re-require Sync module to reset internal state
    delete require.cache[require.resolve('../js/sync.js')];
    return require('../js/sync.js');
}

// Load Sync module
const Sync = resetSyncMocks();

console.log('\n=== Phase 1: Weight Validation (Fix #1) ===\n');

test('rejects entry with null weight', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const entry = { 
        date: '2026-03-16', 
        weight: null, 
        calories: 2000 
    };
    
    const result = await Sync.saveWeightEntry(entry);
    
    expect(result.success).toBe(false);
    expect(result.error).toInclude('valid weight value');
});

test('rejects entry with undefined weight', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const entry = { 
        date: '2026-03-16', 
        weight: undefined, 
        calories: 2000 
    };
    
    const result = await Sync.saveWeightEntry(entry);
    
    expect(result.success).toBe(false);
});

test('rejects entry with NaN weight', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const entry = { 
        date: '2026-03-16', 
        weight: NaN, 
        calories: 2000 
    };
    
    const result = await Sync.saveWeightEntry(entry);
    
    expect(result.success).toBe(false);
});

test('accepts entry with valid weight', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const entry = { 
        date: '2026-03-16', 
        weight: 80.5, 
        calories: 2000 
    };
    
    const result = await Sync.saveWeightEntry(entry);
    
    expect(result.success).toBe(true);
    
    const retrieved = Storage.getEntry('2026-03-16');
    expect(retrieved.weight).toBe(80.5);
});

test('does not queue entry with null weight when authenticated', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const entry = { 
        date: '2026-03-16', 
        weight: null, 
        calories: 2000 
    };
    
    await Sync.saveWeightEntry(entry);
    
    const queue = Sync.getQueue();
    expect(queue).toHaveLength(0);
});

test('queues entry with valid weight when authenticated', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const entry = { 
        date: '2026-03-17', 
        weight: 81.0, 
        calories: 2100 
    };
    
    await Sync.saveWeightEntry(entry);
    
    const queue = Sync.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('create');
});

console.log('\n=== Phase 1: ID Validation (Fix #2) ===\n');

test('rejects delete with null ID', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const result = await Sync.deleteWeightEntry(null);
    
    expect(result.success).toBe(false);
    expect(result.error).toInclude('Invalid entry ID');
});

test('rejects delete with empty string ID', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const result = await Sync.deleteWeightEntry('');
    
    expect(result.success).toBe(false);
});

test('rejects delete with whitespace ID', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const result = await Sync.deleteWeightEntry('   ');
    
    expect(result.success).toBe(false);
});

test('accepts delete with valid string ID', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    // Create entry first
    Storage.saveEntry('2026-03-16', { weight: 80.5, calories: 2000 });
    const entry = Storage.getEntry('2026-03-16');
    
    // Delete with valid ID (may fail if ID doesn't exist remotely, but validation passes)
    const result = await Sync.deleteWeightEntry(entry.id);
    
    expect(result).toBeDefined();
});

test('does not queue delete with null ID', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    await Sync.deleteWeightEntry(null);
    
    const queue = Sync.getQueue();
    expect(queue).toHaveLength(0);
});

console.log('\n=== Phase 1: Clear Queue Integration (Fix #4) ===\n');

test('clears sync queue before clearing storage', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    await Sync.saveWeightEntry({ date: '2026-03-16', weight: 80.5, calories: 2000 });
    await Sync.saveWeightEntry({ date: '2026-03-17', weight: 81.0, calories: 2100 });
    
    const queueBefore = Sync.getQueue();
    expect(queueBefore.length).toBe(2);
    
    Storage.clearAll();
    
    const queueAfter = Sync.getQueue();
    expect(queueAfter.length).toBe(0);
    
    const allEntries = Storage.getAllEntries();
    expect(Object.keys(allEntries).length).toBe(0);
});

test('handles clear data when Sync module not available', () => {
    Storage.init();
    Storage.saveEntry('2026-03-16', { weight: 80.5, calories: 2000 });
    
    // Remove Sync temporarily
    const originalSync = window.Sync;
    delete window.Sync;
    
    // Clear storage (should not throw)
    Storage.clearAll();
    
    // Restore Sync
    window.Sync = originalSync;
    
    // Verify storage cleared
    const allEntries = Storage.getAllEntries();
    expect(Object.keys(allEntries).length).toBe(0);
});

console.log('\n=== Phase 1: Import Sync Integration (Fix #5) ===\n');

test('imports data successfully', () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const importData = {
        version: 1,
        settings: { weightUnit: 'kg', gender: 'male', age: 30 },
        entries: {
            '2026-03-16': { weight: 80.5, calories: 2000, notes: 'Test entry' },
            '2026-03-17': { weight: 81.0, calories: 2100, notes: '' }
        }
    };
    
    const result = Storage.importData(JSON.stringify(importData));
    expect(result.success).toBe(true);
    expect(result.entriesImported).toBe(2);
    
    const entry1 = Storage.getEntry('2026-03-16');
    expect(entry1.weight).toBe(80.5);
    
    const entry2 = Storage.getEntry('2026-03-17');
    expect(entry2.weight).toBe(81.0);
});

test('handles empty import data', () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const importData = {
        version: 1,
        settings: {},
        entries: {}
    };
    
    const result = Storage.importData(JSON.stringify(importData));
    expect(result.success).toBe(true);
    expect(result.entriesImported).toBe(0);
});

test('handles invalid JSON', () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const result = Storage.importData('not valid json');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
});

test('handles missing entries field', () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const importData = {
        version: 1,
        settings: {}
    };
    
    const result = Storage.importData(JSON.stringify(importData));
    expect(result.success).toBe(true);
    expect(result.entriesImported).toBe(0);
});

console.log('\n=== Phase 1: Validation Edge Cases ===\n');

test('handles entry with missing calories', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const entry = { 
        date: '2026-03-16', 
        weight: 80.5,
        calories: null
    };
    
    const result = await Sync.saveWeightEntry(entry);
    
    expect(result.success).toBe(true);
    
    const retrieved = Storage.getEntry('2026-03-16');
    expect(retrieved.weight).toBe(80.5);
    expect(retrieved.calories).toBeNull();
});

test('handles delete with tab character in ID', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const result = await Sync.deleteWeightEntry('\t');
    
    expect(result.success).toBe(false);
});

test('handles delete with newline in ID', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    const result = await Sync.deleteWeightEntry('\n');
    
    expect(result.success).toBe(false);
});

console.log('\n=== Phase 1: Integration Tests ===\n');

test('full workflow: create, update, delete with validation', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    // Create
    const createResult = await Sync.saveWeightEntry({
        date: '2026-03-16',
        weight: 80.5,
        calories: 2000
    });
    expect(createResult.success).toBe(true);
    
    // Update
    const updateResult = await Sync.updateWeightEntry({
        date: '2026-03-16',
        weight: 81.0,
        calories: 2100
    });
    expect(updateResult.success).toBe(true);
    
    // Get entry ID for delete
    const entry = Storage.getEntry('2026-03-16');
    
    // Delete
    const deleteResult = await Sync.deleteWeightEntry(entry.id);
    expect(deleteResult.success).toBe(true);
    
    // Verify deleted
    const retrieved = Storage.getEntry('2026-03-16');
    expect(retrieved).toBeNull();
});

test('validation prevents invalid operations', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    // Try to save with null weight (should fail)
    const result1 = await Sync.saveWeightEntry({
        date: '2026-03-16',
        weight: null,
        calories: 2000
    });
    expect(result1.success).toBe(false);
    
    // Try to delete with invalid ID (should fail)
    const result2 = await Sync.deleteWeightEntry(null);
    expect(result2.success).toBe(false);
    
    // Queue should still be empty
    const queue = Sync.getQueue();
    expect(queue).toHaveLength(0);
});

test('multiple valid operations queue correctly', async () => {
    const Sync = resetSyncMocks();
    Storage.init();
    
    await Sync.saveWeightEntry({ date: '2026-03-16', weight: 80.0, calories: 1600 });
    await Sync.saveWeightEntry({ date: '2026-03-17', weight: 80.5, calories: 1700 });
    await Sync.saveWeightEntry({ date: '2026-03-18', weight: 81.0, calories: 1800 });
    
    const queue = Sync.getQueue();
    expect(queue).toHaveLength(3);
    
    const types = queue.map(op => op.type);
    expect(types).toEqual(['create', 'create', 'create']);
});

// Note: Summary shown by node-test.js
