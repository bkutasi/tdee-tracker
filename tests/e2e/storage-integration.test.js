/**
 * E2E Integration Tests: Storage Module
 * 
 * Tests Storage module integration with Sync.
 * Catches bugs like:
 * - Sync calling Storage.clearEntries() (doesn't exist)
 * - Sync calling Storage.addEntry() (should be saveEntry)
 * - Data format mismatch between modules
 * 
 * Run: node tests/e2e/storage-integration.test.js
 */

'use strict';

// ============================================
// MOCK SETUP
// ============================================

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
    clear() { 
        this.data = {
            tdee_entries: '{}',
            tdee_settings: '{}',
            tdee_sync_queue: '[]',
            tdee_sync_history: '[]'
        };
    }
};

global.localStorage = mockLocalStorage;

global.window = {
    location: { hostname: 'localhost', protocol: 'http:', origin: 'http://localhost:8000' },
    addEventListener: () => {},
    dispatchEvent: () => {},
    CustomEvent: class CustomEvent {
        constructor(name, options = {}) { this.type = name; this.detail = options.detail; }
    },
    Event: class Event { constructor(name) { this.type = name; } }
};

// Mock navigator (use defineProperty for Node.js v24+ compatibility)
Object.defineProperty(global, 'navigator', {
    value: { onLine: true },
    writable: true,
    configurable: true
});
Object.defineProperty(global, 'crypto', {
    value: { randomUUID: () => 'mock-uuid-' + Date.now() },
    writable: true,
    configurable: true
});

// ============================================
// LOAD MODULES
// ============================================

const Utils = require('../../js/utils.js');
global.Utils = Utils;

const Calculator = require('../../js/calculator.js');
global.Calculator = Calculator;

const Storage = require('../../js/storage.js');
global.Storage = Storage;

const Sync = require('../../js/sync.js');
global.Sync = Sync;

// ============================================
// TEST FRAMEWORK
// ============================================

let passed = 0;
let failed = 0;
const failures = [];

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        },
        toBeTrue() {
            if (actual !== true) throw new Error(`Expected true, got ${actual}`);
        },
        toBeFalse() {
            if (actual !== false) throw new Error(`Expected false, got ${actual}`);
        },
        toBeNull() {
            if (actual !== null) throw new Error(`Expected null, got ${actual}`);
        },
        toBeDefined() {
            if (actual === undefined) throw new Error(`Expected defined, got ${actual}`);
        },
        toHaveProperty(prop) {
            if (actual === null || actual === undefined || !(prop in actual)) {
                throw new Error(`Expected to have property '${prop}'`);
            }
        },
        toHaveLength(length) {
            if (!Array.isArray(actual)) throw new Error(`Expected array, got ${typeof actual}`);
            if (actual.length !== length) throw new Error(`Expected length ${length}, got ${actual.length}`);
        },
        toEqual(expected) {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        },
        toContain(item) {
            if (!Array.isArray(actual)) throw new Error(`Expected array, got ${typeof actual}`);
            if (!actual.includes(item)) throw new Error(`Expected to contain ${JSON.stringify(item)}`);
        }
    };
}

async function test(name, fn) {
    try {
        await fn();
        passed++;
        console.log(`✓ ${name}`);
    } catch (e) {
        failed++;
        failures.push({ name, error: e.message });
        console.log(`✗ ${name}`);
        console.log(`  ${e.message}`);
    }
}

function describe(group, fn) {
    console.log(`\n${group}`);
    console.log('='.repeat(group.length));
    fn();
}

function beforeEach(fn) {
    global._beforeEach = fn;
}

// ============================================
// TEST SUITE: Storage Integration E2E
// ============================================

describe('E2E: Storage Module Public API', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
    });

    test('E2E: Storage has methods Sync expects', () => {
        // BUG #3 CATCH: Verify correct method names exist
        expect(typeof Storage.saveEntry).toBe('function');      // Sync calls this
        expect(typeof Storage.getAllEntries).toBe('function');   // Sync calls this
        expect(typeof Storage.getEntry).toBe('function');        // Sync calls this
        expect(typeof Storage.deleteEntry).toBe('function');     // Sync calls this
        expect(typeof Storage.updateEntry).toBe('function');     // Sync calls this
    });

    test('E2E: Storage does NOT have methods that dont exist', () => {
        // BUG #3 CATCH: These methods don't exist - Sync should not call them
        expect(Storage.clearEntries).toBeUndefined();  // Doesn't exist!
        expect(Storage.addEntry).toBeUndefined();       // Should be saveEntry
        expect(Storage.removeEntry).toBeUndefined();    // Should be deleteEntry
    });

    test('E2E: All required Storage methods are functions', () => {
        const requiredMethods = [
            'init',
            'saveEntry',
            'getEntry',
            'getAllEntries',
            'getEntriesInRange',
            'deleteEntry',
            'getSettings',
            'saveSettings',
            'exportData',
            'importData',
            'clearAll'
        ];

        requiredMethods.forEach(method => {
            expect(typeof Storage[method]).toBe('function');
        });
    });
});

describe('E2E: Storage.saveEntry Integration', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        Storage.init();
    });

    test('E2E: saveEntry returns boolean success (not object)', () => {
        const result = Storage.saveEntry('2026-03-01', { weight: 80, calories: 1600 });
        
        // Sync expects boolean true for success
        expect(result).toBeTrue();
    });

    test('E2E: saveEntry returns error object on failure', () => {
        const result = Storage.saveEntry('invalid-date', { weight: 80 });
        
        // Sync expects error object with success: false
        expect(result.success).toBeFalse();
        expect(result.error).toBeDefined();
    });

    test('E2E: saveEntry stores data in correct format for Sync', () => {
        Storage.saveEntry('2026-03-01', {
            weight: 80.5,
            calories: 1600,
            notes: 'Test entry'
        });

        const entry = Storage.getEntry('2026-03-01');
        
        // Verify format Sync expects
        expect(entry).toBeDefined();
        expect(entry.weight).toBe(80.5);
        expect(entry.calories).toBe(1600);
        expect(entry.notes).toBe('Test entry');
        expect(entry.updatedAt).toBeDefined();
    });

    test('E2E: saveEntry sanitizes notes to prevent XSS', () => {
        Storage.saveEntry('2026-03-01', {
            weight: 80,
            notes: '<script>alert("xss")</script>Malicious'
        });

        const entry = Storage.getEntry('2026-03-01');
        
        // Script tags should be removed
        expect(entry.notes).not.toContain('<script>');
        expect(entry.notes).not.toContain('</script>');
    });
});

describe('E2E: Storage.getAllEntries Integration', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        Storage.init();
    });

    test('E2E: getAllEntries returns object keyed by date', () => {
        Storage.saveEntry('2026-03-01', { weight: 80 });
        Storage.saveEntry('2026-03-02', { weight: 81 });

        const entries = Storage.getAllEntries();
        
        // Sync expects object format, not array
        expect(typeof entries).toBe('object');
        expect(Array.isArray(entries)).toBeFalse();
        expect(entries['2026-03-01']).toBeDefined();
        expect(entries['2026-03-02']).toBeDefined();
    });

    test('E2E: getAllEntries format works with Sync.mergeEntries', () => {
        Storage.saveEntry('2026-03-01', { weight: 80, calories: 1600, updatedAt: '2026-03-01T10:00:00Z' });
        Storage.saveEntry('2026-03-02', { weight: 81, calories: 1700, updatedAt: '2026-03-02T10:00:00Z' });

        const remoteEntries = [
            { date: '2026-03-03', weight: 82, updated_at: '2026-03-03T10:00:00Z' }
        ];

        // This should not throw - format must be compatible
        const merged = Sync.mergeEntries(remoteEntries);
        
        expect(merged).toHaveLength(3);
    });

    test('E2E: getAllEntries returns empty object when no data', () => {
        const entries = Storage.getAllEntries();
        
        expect(entries).toEqual({});
        expect(typeof entries).toBe('object');
    });
});

describe('E2E: Storage.deleteEntry Integration', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        Storage.init();
    });

    test('E2E: deleteEntry returns boolean success', () => {
        Storage.saveEntry('2026-03-01', { weight: 80 });
        const result = Storage.deleteEntry('2026-03-01');
        
        // Sync expects boolean true
        expect(result).toBeTrue();
    });

    test('E2E: deleteEntry removes entry completely', () => {
        Storage.saveEntry('2026-03-01', { weight: 80 });
        Storage.deleteEntry('2026-03-01');

        const entry = Storage.getEntry('2026-03-01');
        expect(entry).toBeNull();
    });

    test('E2E: deleteEntry handles non-existent entry', () => {
        const result = Storage.deleteEntry('2026-03-01');
        
        // Should still return true (idempotent)
        expect(result).toBeTrue();
    });

    test('E2E: BUG #3 - clearEntries does not exist', () => {
        // This test explicitly verifies the bug we had
        // Sync should NOT call Storage.clearEntries() - it doesn't exist!
        expect(typeof Storage.clearEntries).toBe('undefined');
        
        // Correct method is deleteEntry
        expect(typeof Storage.deleteEntry).toBe('function');
    });
});

describe('E2E: Storage.updateEntry Integration', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        Storage.init();
    });

    test('E2E: updateEntry modifies existing entry', () => {
        Storage.saveEntry('2026-03-01', { weight: 80, calories: 1600, notes: 'Original' });
        
        const result = Storage.updateEntry({
            date: '2026-03-01',
            weight: 81,
            calories: 1700,
            notes: 'Updated'
        });

        expect(result.success).toBeTrue();
        
        const entry = Storage.getEntry('2026-03-01');
        expect(entry.weight).toBe(81);
        expect(entry.calories).toBe(1700);
        expect(entry.notes).toBe('Updated');
    });

    test('E2E: updateEntry returns error for non-existent entry', () => {
        const result = Storage.updateEntry({
            date: '2026-03-01',
            weight: 80
        });

        expect(result.success).toBeFalse();
        expect(result.error).toBeDefined();
    });

    test('E2E: updateEntry preserves unchanged fields', () => {
        Storage.saveEntry('2026-03-01', { 
            weight: 80, 
            calories: 1600, 
            notes: 'Keep these notes' 
        });
        
        Storage.updateEntry({
            date: '2026-03-01',
            weight: 81
            // calories and notes not specified
        });

        const entry = Storage.getEntry('2026-03-01');
        expect(entry.weight).toBe(81);
        expect(entry.calories).toBe(1600);  // Preserved
        expect(entry.notes).toBe('Keep these notes');  // Preserved
    });
});

describe('E2E: Storage Data Format Compatibility', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        Storage.init();
    });

    test('E2E: Entry format matches Sync.saveWeightEntry expectations', async () => {
        const mockSupabase = createMockSupabase();
        global.window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'user-123' }),
            getSession: async () => ({ session: { user: { id: 'user-123' } } }),
            _getSupabase: () => mockSupabase,
            onAuthStateChange: () => {}
        };

        const entry = {
            date: '2026-03-01',
            weight: 80.5,
            calories: 1600,
            notes: 'Test'
        };

        await Sync.saveWeightEntry(entry);

        // Verify Storage format
        const stored = Storage.getEntry('2026-03-01');
        expect(stored.weight).toBe(80.5);
        expect(stored.calories).toBe(1600);
        expect(stored.notes).toBe('Test');
        expect(stored.updatedAt).toBeDefined();
    });

    test('E2E: Entry format works with Sync.mergeEntries timestamp comparison', () => {
        Storage.saveEntry('2026-03-01', {
            weight: 80,
            calories: 1600,
            updatedAt: '2026-03-01T10:00:00Z'
        });

        const remoteEntries = [
            {
                date: '2026-03-01',
                weight: 82,
                calories: 1800,
                updated_at: '2026-03-01T15:00:00Z'
            }
        ];

        const merged = Sync.mergeEntries(remoteEntries);
        const mergedEntry = merged.find(e => e.date === '2026-03-01');

        // Remote should win (newer timestamp)
        expect(mergedEntry.weight).toBe(82);
    });

    test('E2E: Storage handles null values correctly', () => {
        Storage.saveEntry('2026-03-01', {
            weight: 80,
            calories: null,
            notes: null
        });

        const entry = Storage.getEntry('2026-03-01');
        expect(entry.weight).toBe(80);
        expect(entry.calories).toBeNull();
        expect(entry.notes).toBe('');  // null converted to empty string
    });
});

describe('E2E: Storage Import/Export Integration', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        Storage.init();
    });

    test('E2E: exportData returns complete data structure', () => {
        Storage.saveEntry('2026-03-01', { weight: 80, calories: 1600 });
        Storage.saveSettings({ weightUnit: 'kg', theme: 'dark' });

        const exported = Storage.exportData();

        expect(exported).toHaveProperty('version');
        expect(exported).toHaveProperty('exportedAt');
        expect(exported).toHaveProperty('settings');
        expect(exported).toHaveProperty('entries');
        expect(exported.entries['2026-03-01']).toBeDefined();
    });

    test('E2E: importData merges with existing data', () => {
        // Existing data
        Storage.saveEntry('2026-03-01', { weight: 80 });

        // Import new data
        const importData = {
            entries: {
                '2026-03-02': { weight: 81, calories: 1700 }
            }
        };

        const result = Storage.importData(importData);
        expect(result.success).toBeTrue();

        // Both entries should exist
        expect(Storage.getEntry('2026-03-01')).toBeDefined();
        expect(Storage.getEntry('2026-03-02')).toBeDefined();
    });

    test('E2E: importData sanitizes imported entries', () => {
        const importData = {
            entries: {
                '2026-03-01': {
                    weight: 80,
                    notes: '<script>alert("xss")</script>'
                }
            }
        };

        Storage.importData(importData);
        const entry = Storage.getEntry('2026-03-01');

        expect(entry.notes).not.toContain('<script>');
    });

    test('E2E: importData validates date format', () => {
        const importData = {
            entries: {
                '2026-03-01': { weight: 80 },      // Valid
                '03-01-2026': { weight: 81 },      // Invalid (US format)
                '2026/03/02': { weight: 82 }       // Invalid (slashes)
            }
        };

        const result = Storage.importData(importData);
        
        // Only valid date should be imported
        expect(Storage.getEntry('2026-03-01')).toBeDefined();
        expect(Storage.getEntry('03-01-2026')).toBeNull();
        expect(Storage.getEntry('2026/03/02')).toBeNull();
    });
});

describe('E2E: Storage Settings Integration', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        Storage.init();
    });

    test('E2E: saveSettings merges with existing settings', () => {
        Storage.saveSettings({ weightUnit: 'kg', theme: 'dark' });
        Storage.saveSettings({ age: 30 });

        const settings = Storage.getSettings();
        expect(settings.weightUnit).toBe('kg');
        expect(settings.theme).toBe('dark');
        expect(settings.age).toBe(30);
    });

    test('E2E: getSettings returns defaults when no settings', () => {
        const settings = Storage.getSettings();
        
        expect(settings).toHaveProperty('weightUnit');
        expect(settings).toHaveProperty('calorieUnit');
        expect(settings).toHaveProperty('gender');
        expect(settings).toHaveProperty('createdAt');
    });

    test('E2E: Settings format is compatible with export/import', () => {
        Storage.saveSettings({ weightUnit: 'kg', theme: 'dark', age: 30 });
        
        const exported = Storage.exportData();
        mockLocalStorage.clear();
        Storage.init();
        
        Storage.importData({ settings: exported.settings });
        
        const settings = Storage.getSettings();
        expect(settings.weightUnit).toBe('kg');
        expect(settings.theme).toBe('dark');
        expect(settings.age).toBe(30);
    });
});

describe('E2E: Storage Error Handling', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        Storage.init();
    });

    test('E2E: saveEntry handles invalid date format', () => {
        const result = Storage.saveEntry('not-a-date', { weight: 80 });
        
        expect(result.success).toBeFalse();
        expect(result.code).toBeDefined();
    });

    test('E2E: getEntry handles invalid date format', () => {
        const result = Storage.getEntry('invalid');
        
        expect(result).toBeNull();
    });

    test('E2E: getEntry returns null for non-existent date', () => {
        const result = Storage.getEntry('2026-03-01');
        
        expect(result).toBeNull();
    });

    test('E2E: importData handles invalid JSON string', () => {
        const result = Storage.importData('not valid json');
        
        expect(result.success).toBeFalse();
        expect(result.code).toBeDefined();
    });

    test('E2E: importData handles non-object data', () => {
        const result = Storage.importData({ entries: 'not an object' });
        
        // Should handle gracefully
        expect(result.success).toBeTrue();  // Or at least not throw
    });
});

// ============================================
// RUN TESTS
// ============================================

async function runTests() {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  E2E Integration Tests: Storage Module         ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    // Run all test suites
    const suites = [
        () => {
            describe('E2E: Storage Module Public API', () => {
                beforeEach(() => { mockLocalStorage.clear(); });
                test('E2E: Storage has methods Sync expects', () => {
                    expect(typeof Storage.saveEntry).toBe('function');
                    expect(typeof Storage.getAllEntries).toBe('function');
                    expect(typeof Storage.getEntry).toBe('function');
                    expect(typeof Storage.deleteEntry).toBe('function');
                    expect(typeof Storage.updateEntry).toBe('function');
                });
                test('E2E: Storage does NOT have methods that dont exist', () => {
                    expect(Storage.clearEntries).toBeUndefined();
                    expect(Storage.addEntry).toBeUndefined();
                    expect(Storage.removeEntry).toBeUndefined();
                });
                test('E2E: All required Storage methods are functions', () => {
                    ['init', 'saveEntry', 'getEntry', 'getAllEntries', 'getEntriesInRange', 'deleteEntry', 'getSettings', 'saveSettings', 'exportData', 'importData', 'clearAll'].forEach(m => {
                        expect(typeof Storage[m]).toBe('function');
                    });
                });
            });
        },

        () => {
            describe('E2E: Storage.saveEntry Integration', () => {
                beforeEach(() => { mockLocalStorage.clear(); Storage.init(); });
                test('E2E: saveEntry returns boolean success (not object)', () => {
                    expect(Storage.saveEntry('2026-03-01', { weight: 80, calories: 1600 })).toBeTrue();
                });
                test('E2E: saveEntry returns error object on failure', () => {
                    const result = Storage.saveEntry('invalid-date', { weight: 80 });
                    expect(result.success).toBeFalse();
                    expect(result.error).toBeDefined();
                });
                test('E2E: saveEntry stores data in correct format for Sync', () => {
                    Storage.saveEntry('2026-03-01', { weight: 80.5, calories: 1600, notes: 'Test' });
                    const entry = Storage.getEntry('2026-03-01');
                    expect(entry.weight).toBe(80.5);
                    expect(entry.calories).toBe(1600);
                    expect(entry.notes).toBe('Test');
                    expect(entry.updatedAt).toBeDefined();
                });
                test('E2E: saveEntry sanitizes notes to prevent XSS', () => {
                    Storage.saveEntry('2026-03-01', { weight: 80, notes: '<script>alert("xss")</script>' });
                    const entry = Storage.getEntry('2026-03-01');
                    expect(entry.notes).not.toContain('<script>');
                });
            });
        },

        () => {
            describe('E2E: Storage.getAllEntries Integration', () => {
                beforeEach(() => { mockLocalStorage.clear(); Storage.init(); });
                test('E2E: getAllEntries returns object keyed by date', () => {
                    Storage.saveEntry('2026-03-01', { weight: 80 });
                    Storage.saveEntry('2026-03-02', { weight: 81 });
                    const entries = Storage.getAllEntries();
                    expect(typeof entries).toBe('object');
                    expect(Array.isArray(entries)).toBeFalse();
                    expect(entries['2026-03-01']).toBeDefined();
                });
                test('E2E: getAllEntries format works with Sync.mergeEntries', () => {
                    Storage.saveEntry('2026-03-01', { weight: 80, calories: 1600, updatedAt: '2026-03-01T10:00:00Z' });
                    Storage.saveEntry('2026-03-02', { weight: 81, calories: 1700, updatedAt: '2026-03-02T10:00:00Z' });
                    const merged = Sync.mergeEntries([{ date: '2026-03-03', weight: 82, updated_at: '2026-03-03T10:00:00Z' }]);
                    expect(merged).toHaveLength(3);
                });
                test('E2E: getAllEntries returns empty object when no data', () => {
                    expect(Storage.getAllEntries()).toEqual({});
                });
            });
        },

        () => {
            describe('E2E: Storage.deleteEntry Integration', () => {
                beforeEach(() => { mockLocalStorage.clear(); Storage.init(); });
                test('E2E: deleteEntry returns boolean success', () => {
                    Storage.saveEntry('2026-03-01', { weight: 80 });
                    expect(Storage.deleteEntry('2026-03-01')).toBeTrue();
                });
                test('E2E: deleteEntry removes entry completely', () => {
                    Storage.saveEntry('2026-03-01', { weight: 80 });
                    Storage.deleteEntry('2026-03-01');
                    expect(Storage.getEntry('2026-03-01')).toBeNull();
                });
                test('E2E: deleteEntry handles non-existent entry', () => {
                    expect(Storage.deleteEntry('2026-03-01')).toBeTrue();
                });
                test('E2E: BUG #3 - clearEntries does not exist', () => {
                    expect(typeof Storage.clearEntries).toBe('undefined');
                    expect(typeof Storage.deleteEntry).toBe('function');
                });
            });
        },

        () => {
            describe('E2E: Storage.updateEntry Integration', () => {
                beforeEach(() => { mockLocalStorage.clear(); Storage.init(); });
                test('E2E: updateEntry modifies existing entry', () => {
                    Storage.saveEntry('2026-03-01', { weight: 80, calories: 1600, notes: 'Original' });
                    Storage.updateEntry({ date: '2026-03-01', weight: 81, calories: 1700, notes: 'Updated' });
                    const entry = Storage.getEntry('2026-03-01');
                    expect(entry.weight).toBe(81);
                    expect(entry.calories).toBe(1700);
                    expect(entry.notes).toBe('Updated');
                });
                test('E2E: updateEntry returns error for non-existent entry', () => {
                    expect(Storage.updateEntry({ date: '2026-03-01', weight: 80 }).success).toBeFalse();
                });
                test('E2E: updateEntry preserves unchanged fields', () => {
                    Storage.saveEntry('2026-03-01', { weight: 80, calories: 1600, notes: 'Keep' });
                    Storage.updateEntry({ date: '2026-03-01', weight: 81 });
                    const entry = Storage.getEntry('2026-03-01');
                    expect(entry.weight).toBe(81);
                    expect(entry.calories).toBe(1600);
                    expect(entry.notes).toBe('Keep');
                });
            });
        },

        () => {
            describe('E2E: Storage Data Format Compatibility', () => {
                beforeEach(() => { mockLocalStorage.clear(); Storage.init(); });
                test('E2E: Entry format matches Sync.saveWeightEntry expectations', async () => {
                    const mockSupabase = createMockSupabase();
                    global.window.Auth = { isAuthenticated: () => true, getCurrentUser: () => ({ id: 'user-123' }), getSession: async () => ({ session: { user: { id: 'user-123' } } }), _getSupabase: () => mockSupabase, onAuthStateChange: () => {} };
                    await Sync.saveWeightEntry({ date: '2026-03-01', weight: 80.5, calories: 1600, notes: 'Test' });
                    const stored = Storage.getEntry('2026-03-01');
                    expect(stored.weight).toBe(80.5);
                    expect(stored.calories).toBe(1600);
                    expect(stored.notes).toBe('Test');
                });
                test('E2E: Entry format works with Sync.mergeEntries timestamp comparison', () => {
                    Storage.saveEntry('2026-03-01', { weight: 80, calories: 1600, updatedAt: '2026-03-01T10:00:00Z' });
                    const merged = Sync.mergeEntries([{ date: '2026-03-01', weight: 82, calories: 1800, updated_at: '2026-03-01T15:00:00Z' }]);
                    expect(merged.find(e => e.date === '2026-03-01').weight).toBe(82);
                });
                test('E2E: Storage handles null values correctly', () => {
                    Storage.saveEntry('2026-03-01', { weight: 80, calories: null, notes: null });
                    const entry = Storage.getEntry('2026-03-01');
                    expect(entry.weight).toBe(80);
                    expect(entry.calories).toBeNull();
                    expect(entry.notes).toBe('');
                });
            });
        },

        () => {
            describe('E2E: Storage Import/Export Integration', () => {
                beforeEach(() => { mockLocalStorage.clear(); Storage.init(); });
                test('E2E: exportData returns complete data structure', () => {
                    Storage.saveEntry('2026-03-01', { weight: 80, calories: 1600 });
                    Storage.saveSettings({ weightUnit: 'kg', theme: 'dark' });
                    const exported = Storage.exportData();
                    expect(exported).toHaveProperty('version');
                    expect(exported).toHaveProperty('exportedAt');
                    expect(exported).toHaveProperty('settings');
                    expect(exported).toHaveProperty('entries');
                });
                test('E2E: importData merges with existing data', () => {
                    Storage.saveEntry('2026-03-01', { weight: 80 });
                    Storage.importData({ entries: { '2026-03-02': { weight: 81, calories: 1700 } } });
                    expect(Storage.getEntry('2026-03-01')).toBeDefined();
                    expect(Storage.getEntry('2026-03-02')).toBeDefined();
                });
                test('E2E: importData sanitizes imported entries', () => {
                    Storage.importData({ entries: { '2026-03-01': { weight: 80, notes: '<script>alert("xss")</script>' } } });
                    expect(Storage.getEntry('2026-03-01').notes).not.toContain('<script>');
                });
                test('E2E: importData validates date format', () => {
                    Storage.importData({ entries: { '2026-03-01': { weight: 80 }, '03-01-2026': { weight: 81 } } });
                    expect(Storage.getEntry('2026-03-01')).toBeDefined();
                    expect(Storage.getEntry('03-01-2026')).toBeNull();
                });
            });
        },

        () => {
            describe('E2E: Storage Settings Integration', () => {
                beforeEach(() => { mockLocalStorage.clear(); Storage.init(); });
                test('E2E: saveSettings merges with existing settings', () => {
                    Storage.saveSettings({ weightUnit: 'kg', theme: 'dark' });
                    Storage.saveSettings({ age: 30 });
                    const settings = Storage.getSettings();
                    expect(settings.weightUnit).toBe('kg');
                    expect(settings.theme).toBe('dark');
                    expect(settings.age).toBe(30);
                });
                test('E2E: getSettings returns defaults when no settings', () => {
                    const settings = Storage.getSettings();
                    expect(settings).toHaveProperty('weightUnit');
                    expect(settings).toHaveProperty('calorieUnit');
                    expect(settings).toHaveProperty('gender');
                });
                test('E2E: Settings format is compatible with export/import', () => {
                    Storage.saveSettings({ weightUnit: 'kg', theme: 'dark', age: 30 });
                    const exported = Storage.exportData();
                    mockLocalStorage.clear();
                    Storage.init();
                    Storage.importData({ settings: exported.settings });
                    const settings = Storage.getSettings();
                    expect(settings.weightUnit).toBe('kg');
                    expect(settings.theme).toBe('dark');
                    expect(settings.age).toBe(30);
                });
            });
        },

        () => {
            describe('E2E: Storage Error Handling', () => {
                beforeEach(() => { mockLocalStorage.clear(); Storage.init(); });
                test('E2E: saveEntry handles invalid date format', () => {
                    const result = Storage.saveEntry('not-a-date', { weight: 80 });
                    expect(result.success).toBeFalse();
                    expect(result.code).toBeDefined();
                });
                test('E2E: getEntry handles invalid date format', () => {
                    expect(Storage.getEntry('invalid')).toBeNull();
                });
                test('E2E: getEntry returns null for non-existent date', () => {
                    expect(Storage.getEntry('2026-03-01')).toBeNull();
                });
                test('E2E: importData handles invalid JSON string', () => {
                    const result = Storage.importData('not valid json');
                    expect(result.success).toBeFalse();
                    expect(result.code).toBeDefined();
                });
                test('E2E: importData handles non-object data', () => {
                    const result = Storage.importData({ entries: 'not an object' });
                    expect(result.success).toBeTrue();
                });
            });
        }
    ];

    for (const suite of suites) {
        suite();
    }

    // Summary
    console.log('\n' + '─'.repeat(50));
    console.log(`Total: ${passed + failed} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log('─'.repeat(50));

    if (failures.length > 0) {
        console.log('\nFailures:');
        failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
        process.exit(1);
    } else {
        console.log('\n✓ All Storage E2E tests passed!\n');
        process.exit(0);
    }
}

runTests();
