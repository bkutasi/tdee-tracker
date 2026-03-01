/**
 * E2E Sync Integration Tests
 * 
 * These tests verify the full integration between Sync, Auth, and Storage modules
 * to catch integration bugs that unit tests miss.
 * 
 * Run: node tests/e2e/sync-integration.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Test results tracking
let passed = 0;
let failed = 0;
const failures = [];

// Test utilities
function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (error) {
        console.error(`✗ ${name}`);
        console.error(`  ${error.message}`);
        failed++;
        failures.push({ name, error: error.message });
    }
}

async function asyncTest(name, fn) {
    try {
        await fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (error) {
        console.error(`✗ ${name}`);
        console.error(`  ${error.message}`);
        failed++;
        failures.push({ name, error: error.message });
    }
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${expected} but got ${actual}`);
            }
        },
        toBeTruthy() {
            if (!actual) {
                throw new Error(`Expected truthy value but got ${actual}`);
            }
        },
        toBeFalsy() {
            if (actual) {
                throw new Error(`Expected falsy value but got ${actual}`);
            }
        },
        toBeTypeOf(expected) {
            if (typeof actual !== expected) {
                throw new Error(`Expected type ${expected} but got ${typeof actual}`);
            }
        },
        toHaveProperty(prop) {
            if (!(prop in actual)) {
                throw new Error(`Expected object to have property '${prop}'`);
            }
        },
        toContain(item) {
            if (!actual.includes(item)) {
                throw new Error(`Expected array to contain ${item}`);
            }
        }
    };
}

// Mock setup
function setupMocks() {
    global.localStorage = {
        data: {},
        getItem(key) { return this.data[key] || null; },
        setItem(key, value) { this.data[key] = value; },
        removeItem(key) { delete this.data[key]; },
        clear() { this.data = {}; }
    };

    if (!global.navigator) {
        global.navigator = {};
    }
    global.navigator.onLine = true;

    if (!global.crypto) {
        global.crypto = {
            randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
        };
    }

    global.localStorage.setItem('tdee_entries', JSON.stringify({}));
    global.localStorage.setItem('tdee_schema_version', '1');
}

console.log('\n=== E2E Sync Integration Tests ===\n');

setupMocks();

// Load modules
const jsDir = path.join(__dirname, '../../js');

const utilsCode = fs.readFileSync(path.join(jsDir, 'utils.js'), 'utf8');
eval(utilsCode.replace('if (typeof module', '// if (typeof module'));

const calculatorCode = fs.readFileSync(path.join(jsDir, 'calculator.js'), 'utf8');
eval(calculatorCode.replace('if (typeof module', '// if (typeof module'));

const storageCode = fs.readFileSync(path.join(jsDir, 'storage.js'), 'utf8');
eval(storageCode.replace('if (typeof module', '// if (typeof module'));

const Storage = global.Storage;

// Mock Auth module
const mockSupabase = {
    from: (table) => ({
        select: () => ({ order: () => ({ data: [], error: null }) }),
        insert: (data) => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'test-id' }, error: null }) }) }),
        update: (data) => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }) }),
        delete: () => ({ eq: () => ({ data: null, error: null }) })
    })
};

const Auth = {
    _supabase: mockSupabase,
    _user: { id: 'test-user-id', email: 'test@example.com' },
    isAuthenticated: () => true,
    getCurrentUser: function() { return this._user; },
    getSession: async () => ({ session: { user: this._user } }),
    _getSupabase: function() { return this._supabase; },
    onAuthStateChange: () => () => {}
};

global.window = { Auth, Storage, localStorage: global.localStorage };

// Load sync module
const syncCode = fs.readFileSync(path.join(jsDir, 'sync.js'), 'utf8');
eval(syncCode.replace('if (typeof module', '// if (typeof module'));
const Sync = global.Sync;

// Tests
test('E2E: Sync module exports all required methods', () => {
    const required = ['init', 'syncAll', 'saveWeightEntry', 'updateWeightEntry', 'deleteWeightEntry', 
                      'fetchWeightEntries', 'mergeEntries', 'fetchAndMergeData', 'getStatus', 'getQueue', 'clearQueue'];
    required.forEach(method => expect(typeof Sync[method]).toBeTypeOf('function'));
});

test('E2E: Auth._getSupabase() returns Supabase client', () => {
    const supabase = Auth._getSupabase();
    expect(supabase).toBeTruthy();
    expect(typeof supabase.from).toBeTypeOf('function');
});

test('E2E: Storage has required methods (no clearEntries/addEntry)', () => {
    expect(typeof Storage.saveEntry).toBeTypeOf('function');
    expect(typeof Storage.getAllEntries).toBeTypeOf('function');
    expect(Storage.clearEntries).toBeTypeOf('undefined');
    expect(Storage.addEntry).toBeTypeOf('undefined');
});

test('E2E: Sync.saveWeightEntry() queues operation when authenticated', async () => {
    global.window.Auth = Auth;
    global.window.Storage = Storage;
    
    const result = await Sync.saveWeightEntry({ date: '2026-03-01', weight: 80.5, calories: 2200, notes: 'Test' });
    
    expect(result.success).toBeTruthy();
    const entries = JSON.parse(global.localStorage.getItem('tdee_entries'));
    expect(entries['2026-03-01']).toBeTruthy();
    
    const queue = Sync.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].type).toBe('create');
});

test('E2E: Sync.mergeEntries() handles Storage data format', () => {
    const localEntries = {
        '2026-03-01': { weight: 80.5, calories: 2200, notes: '', updatedAt: '2026-03-01T10:00:00Z' },
        '2026-03-02': { weight: 80.3, calories: 2100, notes: '', updatedAt: '2026-03-02T10:00:00Z' }
    };
    global.localStorage.setItem('tdee_entries', JSON.stringify(localEntries));
    
    const remoteEntries = [
        { date: '2026-03-01', weight: 80.5, calories: 2200, notes: '', updated_at: '2026-03-01T11:00:00Z' },
        { date: '2026-03-03', weight: 80.1, calories: 2000, notes: '', updated_at: '2026-03-03T10:00:00Z' }
    ];
    
    const merged = Sync.mergeEntries(remoteEntries);
    expect(merged.length).toBe(3);
    const dates = merged.map(e => e.date);
    expect(dates).toContain('2026-03-01');
    expect(dates).toContain('2026-03-02');
    expect(dates).toContain('2026-03-03');
});

test('E2E: fetchAndMergeData() is exported and callable', async () => {
    expect(typeof Sync.fetchAndMergeData).toBeTypeOf('function');
    try {
        await Sync.fetchAndMergeData();
    } catch (error) {
        if (error.message.includes('is not a function')) {
            throw new Error('fetchAndMergeData not properly exported');
        }
    }
});

test('E2E: Sync.getStatus() returns complete status', () => {
    const status = Sync.getStatus();
    expect(status).toHaveProperty('isOnline');
    expect(status).toHaveProperty('isAuthenticated');
    expect(status).toHaveProperty('pendingOperations');
});

test('E2E: Sync queue persists to localStorage', async () => {
    Sync.clearQueue();
    await Sync.saveWeightEntry({ date: '2026-03-04', weight: 79.8, calories: 2300 });
    
    const queueData = global.localStorage.getItem('tdee_sync_queue');
    expect(queueData).toBeTruthy();
    const queue = JSON.parse(queueData);
    expect(queue.length).toBe(1);
});

test('E2E: mergeEntries resolves conflicts by newest timestamp', () => {
    const localEntries = {
        '2026-03-01': { weight: 80.5, calories: 2200, notes: 'Local', updatedAt: '2026-03-01T10:00:00Z' }
    };
    global.localStorage.setItem('tdee_entries', JSON.stringify(localEntries));
    
    const remoteEntries = [
        { date: '2026-03-01', weight: 81.0, calories: 2300, notes: 'Remote', updated_at: '2026-03-01T12:00:00Z' }
    ];
    
    const merged = Sync.mergeEntries(remoteEntries);
    expect(merged.length).toBe(1);
    expect(merged[0].weight).toBe(81.0);
    expect(merged[0].notes).toBe('Remote');
});

// Summary
console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failures.length > 0) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
    process.exit(1);
} else {
    console.log('✓ All E2E integration tests passed!\n');
    process.exit(0);
}
