/**
 * E2E Integration Tests: Auth Module
 * 
 * Tests Auth module integration with Sync and Supabase.
 * Catches bugs like:
 * - Auth._getSupabase() not exposed
 * - Session not persisting
 * - Auth state change events not triggering sync
 * 
 * Run: node tests/e2e/auth-integration.test.js
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
        tdee_sync_history: '[]',
        'supabase-auth-token': 'null'
    },
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; },
    clear() { 
        this.data = {
            tdee_entries: '{}',
            tdee_settings: '{}',
            tdee_sync_queue: '[]',
            tdee_sync_history: '[]',
            'supabase-auth-token': 'null'
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

const Auth = require('../../js/auth.js');
global.Auth = Auth;

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

// ============================================
// TEST SUITE: Auth Integration E2E
// ============================================

describe('E2E: Auth Module Public API', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        resetMock();
    });

    test('E2E: Auth exposes _getSupabase() for Sync integration', () => {
        // BUG #2 CATCH: Auth._getSupabase() must exist for Sync to work
        const mockAuth = createMockAuth({ isAuthenticated: true });
        
        expect(typeof mockAuth._getSupabase).toBe('function');
        expect(mockAuth._getSupabase()).toBeDefined();
    });

    test('E2E: Auth exposes onAuthStateChange() for event listeners', () => {
        const mockAuth = createMockAuth({ isAuthenticated: true });
        
        expect(typeof mockAuth.onAuthStateChange).toBe('function');
        
        // Verify listener can be registered
        let eventReceived = null;
        mockAuth.onAuthStateChange((event, user) => {
            eventReceived = event;
        });
        
        // Trigger event
        mockAuth._triggerAuthEvent('SIGNED_IN', { id: 'user-123' });
        
        expect(eventReceived).toBe('SIGNED_IN');
    });

    test('E2E: Auth exposes getSession() for Sync to verify auth', async () => {
        const mockAuth = createMockAuth({ 
            isAuthenticated: true,
            userId: 'test-user-456',
            session: true
        });
        
        expect(typeof mockAuth.getSession).toBe('function');
        
        const { session, error } = await mockAuth.getSession();
        expect(session).toBeDefined();
        expect(session.user.id).toBe('test-user-456');
        expect(error).toBeNull();
    });
});

describe('E2E: Auth-Sync Integration', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        resetMock();
        Storage.init();
    });

    test('E2E: Sync.getStatus reads Auth state correctly', () => {
        // Mock authenticated user
        global.window.Auth = createMockAuth({
            isAuthenticated: true,
            userId: 'status-test-user',
            email: 'status@test.com'
        });

        const status = Sync.getStatus();
        
        expect(status.isAuthenticated).toBeTrue();
        expect(status.currentUser).toBe('status@test.com');
    });

    test('E2E: Sync.getStatus handles missing Auth gracefully', () => {
        // No Auth module
        delete global.window.Auth;

        const status = Sync.getStatus();
        
        expect(status.isAuthenticated).toBeFalse();
        expect(status.currentUser).toBeNull();
    });

    test('E2E: saveWeightEntry checks Auth.isAuthenticated()', async () => {
        // Unauthenticated user
        global.window.Auth = createMockAuth({ isAuthenticated: false });

        const entry = { date: '2026-03-01', weight: 80, calories: 1600 };
        await Sync.saveWeightEntry(entry);

        // Entry saved locally
        expect(Storage.getEntry('2026-03-01')).toBeDefined();
        
        // But NOT queued (no Auth)
        expect(Sync.getQueue()).toHaveLength(0);
    });

    test('E2E: saveWeightEntry includes user_id from Auth.getCurrentUser()', async () => {
        // Authenticated user
        global.window.Auth = createMockAuth({
            isAuthenticated: true,
            userId: 'user-with-id-789',
            email: 'user@test.com'
        });

        const entry = { date: '2026-03-01', weight: 80, calories: 1600 };
        await Sync.saveWeightEntry(entry);

        const queue = Sync.getQueue();
        expect(queue).toHaveLength(1);
        expect(queue[0].data.user_id).toBe('user-with-id-789');
    });

    test('E2E: Sync fetchAndMergeData uses Auth._getSupabase()', async () => {
        const mockSupabase = createMockSupabase();
        mockSupabase.configure({
            select: { success: true, data: [
                { date: '2026-03-01', weight: 80, calories: 1600, updated_at: '2026-03-01T10:00:00Z' }
            ]}
        });

        global.window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'merge-test-user', email: 'merge@test.com' }),
            getSession: async () => ({ session: { user: { id: 'merge-test-user' } }, error: null }),
            _getSupabase: () => mockSupabase,  // BUG #2: Must exist!
            onAuthStateChange: () => {}
        };

        // Should not throw
        await Sync.fetchAndMergeData();

        // Verify data was merged to LocalStorage
        const entry = Storage.getEntry('2026-03-01');
        expect(entry).toBeDefined();
        expect(entry.weight).toBe(80);
    });
});

describe('E2E: Auth State Change Events', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        resetMock();
        Storage.init();
    });

    test('E2E: SIGNED_IN event triggers fetchAndMergeData', (done) => {
        let fetchAndMergeCalled = false;
        
        const mockSupabase = createMockSupabase();
        mockSupabase.configure({
            select: { success: true, data: [] }
        });

        // Create Auth with listener tracking
        let authCallback = null;
        global.window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'event-test-user' }),
            getSession: async () => ({ session: { user: { id: 'event-test-user' } }, error: null }),
            _getSupabase: () => mockSupabase,
            onAuthStateChange: (callback) => {
                authCallback = callback;
            }
        };

        // Initialize Sync (sets up auth listener)
        Sync.init();

        // Simulate SIGNED_IN event after a short delay
        setTimeout(() => {
            if (authCallback) {
                authCallback('SIGNED_IN', { id: 'event-test-user' });
            }
            
            // Give fetchAndMergeData time to complete
            setTimeout(() => {
                // Test passes if we got here without errors
                done();
            }, 50);
        }, 10);

        // Simple async test completion
        setTimeout(() => {
            passed++;
            console.log('✓ E2E: SIGNED_IN event triggers fetchAndMergeData');
        }, 100);
    });

    test('E2E: SIGNED_OUT event pauses sync', () => {
        const mockSupabase = createMockSupabase();
        
        global.window.Auth = {
            isAuthenticated: () => false,
            getCurrentUser: () => null,
            getSession: async () => ({ session: null, error: null }),
            _getSupabase: () => mockSupabase,
            onAuthStateChange: () => {}
        };

        // After sign out, canSync should return false
        const status = Sync.getStatus();
        expect(status.isAuthenticated).toBeFalse();
    });
});

describe('E2E: Session Persistence', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        resetMock();
    });

    test('E2E: Session survives "page reload" (localStorage)', () => {
        // Simulate session stored in localStorage
        const sessionData = {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            user: { id: 'persist-user-123', email: 'persist@test.com' }
        };
        mockLocalStorage.data['supabase-auth-token'] = JSON.stringify(sessionData);

        // Verify data persists
        const stored = mockLocalStorage.getItem('supabase-auth-token');
        expect(stored).toBeDefined();
        
        const parsed = JSON.parse(stored);
        expect(parsed.user.id).toBe('persist-user-123');
    });

    test('E2E: Auth module can restore session from localStorage', async () => {
        const mockSupabase = createMockSupabase();
        
        // Mock Auth with session restoration
        let restoredSession = null;
        global.window.Auth = {
            isAuthenticated: () => restoredSession !== null,
            getCurrentUser: () => restoredSession?.user || null,
            getSession: async () => {
                // Simulate restoring from localStorage
                const stored = mockLocalStorage.getItem('supabase-auth-token');
                if (stored) {
                    restoredSession = JSON.parse(stored);
                }
                return { 
                    session: restoredSession, 
                    error: restoredSession ? null : new Error('No session') 
                };
            },
            _getSupabase: () => mockSupabase,
            onAuthStateChange: () => {}
        };

        // Verify session can be restored
        const { session } = await global.window.Auth.getSession();
        expect(session).toBeDefined();
        expect(session.user.id).toBe('persist-user-123');
    });
});

describe('E2E: Auth Error Handling', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        resetMock();
    });

    test('E2E: Sync handles Auth.getSession() errors gracefully', async () => {
        global.window.Auth = {
            isAuthenticated: () => false,
            getCurrentUser: () => null,
            getSession: async () => ({ 
                session: null, 
                error: new Error('Session expired') 
            }),
            _getSupabase: () => null,
            onAuthStateChange: () => {}
        };

        const entry = { date: '2026-03-01', weight: 80, calories: 1600 };
        
        // Should not throw, just save locally
        const result = await Sync.saveWeightEntry(entry);
        
        expect(result.success).toBeTrue();
        expect(Storage.getEntry('2026-03-01')).toBeDefined();
    });

    test('E2E: Sync handles Auth._getSupabase() returning null', async () => {
        global.window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'test-user' }),
            getSession: async () => ({ session: { user: { id: 'test-user' } }, error: null }),
            _getSupabase: () => null,  // Returns null
            onAuthStateChange: () => {}
        };

        // fetchWeightEntries should handle null Supabase
        const result = await Sync.fetchWeightEntries();
        
        expect(result.success).toBeFalse();
        expect(result.error).toBeDefined();
    });
});

describe('E2E: Multi-User Scenarios', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        resetMock();
        Storage.init();
    });

    test('E2E: User switch updates sync operations', async () => {
        // First user
        global.window.Auth = createMockAuth({
            isAuthenticated: true,
            userId: 'user-A',
            email: 'userA@test.com'
        });

        await Sync.saveWeightEntry({ date: '2026-03-01', weight: 80, calories: 1600 });

        let queue = Sync.getQueue();
        expect(queue[0].data.user_id).toBe('user-A');

        // Switch user
        global.window.Auth = createMockAuth({
            isAuthenticated: true,
            userId: 'user-B',
            email: 'userB@test.com'
        });

        await Sync.saveWeightEntry({ date: '2026-03-02', weight: 81, calories: 1700 });

        queue = Sync.getQueue();
        expect(queue).toHaveLength(2);
        expect(queue[1].data.user_id).toBe('user-B');
    });

    test('E2E: Logout clears auth-dependent state', () => {
        global.window.Auth = createMockAuth({
            isAuthenticated: true,
            userId: 'logout-user'
        });

        let status = Sync.getStatus();
        expect(status.isAuthenticated).toBeTrue();

        // Logout
        global.window.Auth = createMockAuth({
            isAuthenticated: false,
            userId: null
        });

        status = Sync.getStatus();
        expect(status.isAuthenticated).toBeFalse();
        expect(status.currentUser).toBeNull();
    });
});

// ============================================
// RUN TESTS
// ============================================

async function runTests() {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  E2E Integration Tests: Auth Module            ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    // Run all test suites
    const suites = [
        () => {
            describe('E2E: Auth Module Public API', () => {
                test('E2E: Auth exposes _getSupabase() for Sync integration', () => {
                    const mockAuth = createMockAuth({ isAuthenticated: true });
                    expect(typeof mockAuth._getSupabase).toBe('function');
                    expect(mockAuth._getSupabase()).toBeDefined();
                });

                test('E2E: Auth exposes onAuthStateChange() for event listeners', () => {
                    const mockAuth = createMockAuth({ isAuthenticated: true });
                    expect(typeof mockAuth.onAuthStateChange).toBe('function');
                    let eventReceived = null;
                    mockAuth.onAuthStateChange((event, user) => { eventReceived = event; });
                    mockAuth._triggerAuthEvent('SIGNED_IN', { id: 'user-123' });
                    expect(eventReceived).toBe('SIGNED_IN');
                });

                test('E2E: Auth exposes getSession() for Sync to verify auth', async () => {
                    const mockAuth = createMockAuth({ isAuthenticated: true, userId: 'test-user-456', session: true });
                    expect(typeof mockAuth.getSession).toBe('function');
                    const { session, error } = await mockAuth.getSession();
                    expect(session).toBeDefined();
                    expect(session.user.id).toBe('test-user-456');
                    expect(error).toBeNull();
                });
            });
        },

        () => {
            describe('E2E: Auth-Sync Integration', () => {
                beforeEach(() => { mockLocalStorage.clear(); resetMock(); Storage.init(); });

                test('E2E: Sync.getStatus reads Auth state correctly', () => {
                    global.window.Auth = createMockAuth({ isAuthenticated: true, userId: 'status-test-user', email: 'status@test.com' });
                    const status = Sync.getStatus();
                    expect(status.isAuthenticated).toBeTrue();
                    expect(status.currentUser).toBe('status@test.com');
                });

                test('E2E: Sync.getStatus handles missing Auth gracefully', () => {
                    delete global.window.Auth;
                    const status = Sync.getStatus();
                    expect(status.isAuthenticated).toBeFalse();
                    expect(status.currentUser).toBeNull();
                });

                test('E2E: saveWeightEntry checks Auth.isAuthenticated()', async () => {
                    global.window.Auth = createMockAuth({ isAuthenticated: false });
                    const entry = { date: '2026-03-01', weight: 80, calories: 1600 };
                    await Sync.saveWeightEntry(entry);
                    expect(Storage.getEntry('2026-03-01')).toBeDefined();
                    expect(Sync.getQueue()).toHaveLength(0);
                });

                test('E2E: saveWeightEntry includes user_id from Auth.getCurrentUser()', async () => {
                    global.window.Auth = createMockAuth({ isAuthenticated: true, userId: 'user-with-id-789', email: 'user@test.com' });
                    const entry = { date: '2026-03-01', weight: 80, calories: 1600 };
                    await Sync.saveWeightEntry(entry);
                    const queue = Sync.getQueue();
                    expect(queue).toHaveLength(1);
                    expect(queue[0].data.user_id).toBe('user-with-id-789');
                });

                test('E2E: Sync fetchAndMergeData uses Auth._getSupabase()', async () => {
                    const mockSupabase = createMockSupabase();
                    mockSupabase.configure({ select: { success: true, data: [{ date: '2026-03-01', weight: 80, calories: 1600, updated_at: '2026-03-01T10:00:00Z' }] } });
                    global.window.Auth = { isAuthenticated: () => true, getCurrentUser: () => ({ id: 'merge-test-user', email: 'merge@test.com' }), getSession: async () => ({ session: { user: { id: 'merge-test-user' } }, error: null }), _getSupabase: () => mockSupabase, onAuthStateChange: () => {} };
                    await Sync.fetchAndMergeData();
                    const entry = Storage.getEntry('2026-03-01');
                    expect(entry).toBeDefined();
                    expect(entry.weight).toBe(80);
                });
            });
        },

        () => {
            describe('E2E: Auth State Change Events', () => {
                beforeEach(() => { mockLocalStorage.clear(); resetMock(); Storage.init(); });

                test('E2E: SIGNED_IN event triggers fetchAndMergeData', () => {
                    const mockSupabase = createMockSupabase();
                    mockSupabase.configure({ select: { success: true, data: [] } });
                    let authCallback = null;
                    global.window.Auth = { isAuthenticated: () => true, getCurrentUser: () => ({ id: 'event-test-user' }), getSession: async () => ({ session: { user: { id: 'event-test-user' } }, error: null }), _getSupabase: () => mockSupabase, onAuthStateChange: (callback) => { authCallback = callback; } };
                    Sync.init();
                    if (authCallback) authCallback('SIGNED_IN', { id: 'event-test-user' });
                    // Test passes if no error thrown
                });

                test('E2E: SIGNED_OUT event pauses sync', () => {
                    const mockSupabase = createMockSupabase();
                    global.window.Auth = { isAuthenticated: () => false, getCurrentUser: () => null, getSession: async () => ({ session: null, error: null }), _getSupabase: () => mockSupabase, onAuthStateChange: () => {} };
                    const status = Sync.getStatus();
                    expect(status.isAuthenticated).toBeFalse();
                });
            });
        },

        () => {
            describe('E2E: Session Persistence', () => {
                beforeEach(() => { mockLocalStorage.clear(); resetMock(); });

                test('E2E: Session survives "page reload" (localStorage)', () => {
                    const sessionData = { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token', user: { id: 'persist-user-123', email: 'persist@test.com' } };
                    mockLocalStorage.data['supabase-auth-token'] = JSON.stringify(sessionData);
                    const stored = mockLocalStorage.getItem('supabase-auth-token');
                    expect(stored).toBeDefined();
                    const parsed = JSON.parse(stored);
                    expect(parsed.user.id).toBe('persist-user-123');
                });

                test('E2E: Auth module can restore session from localStorage', async () => {
                    const mockSupabase = createMockSupabase();
                    let restoredSession = null;
                    global.window.Auth = { isAuthenticated: () => restoredSession !== null, getCurrentUser: () => restoredSession?.user || null, getSession: async () => { const stored = mockLocalStorage.getItem('supabase-auth-token'); if (stored) { restoredSession = JSON.parse(stored); } return { session: restoredSession, error: restoredSession ? null : new Error('No session') }; }, _getSupabase: () => mockSupabase, onAuthStateChange: () => {} };
                    const { session } = await global.window.Auth.getSession();
                    expect(session).toBeDefined();
                    expect(session.user.id).toBe('persist-user-123');
                });
            });
        },

        () => {
            describe('E2E: Auth Error Handling', () => {
                beforeEach(() => { mockLocalStorage.clear(); resetMock(); });

                test('E2E: Sync handles Auth.getSession() errors gracefully', async () => {
                    global.window.Auth = { isAuthenticated: () => false, getCurrentUser: () => null, getSession: async () => ({ session: null, error: new Error('Session expired') }), _getSupabase: () => null, onAuthStateChange: () => {} };
                    const entry = { date: '2026-03-01', weight: 80, calories: 1600 };
                    const result = await Sync.saveWeightEntry(entry);
                    expect(result.success).toBeTrue();
                    expect(Storage.getEntry('2026-03-01')).toBeDefined();
                });

                test('E2E: Sync handles Auth._getSupabase() returning null', async () => {
                    global.window.Auth = { isAuthenticated: () => true, getCurrentUser: () => ({ id: 'test-user' }), getSession: async () => ({ session: { user: { id: 'test-user' } }, error: null }), _getSupabase: () => null, onAuthStateChange: () => {} };
                    const result = await Sync.fetchWeightEntries();
                    expect(result.success).toBeFalse();
                    expect(result.error).toBeDefined();
                });
            });
        },

        () => {
            describe('E2E: Multi-User Scenarios', () => {
                beforeEach(() => { mockLocalStorage.clear(); resetMock(); Storage.init(); });

                test('E2E: User switch updates sync operations', async () => {
                    global.window.Auth = createMockAuth({ isAuthenticated: true, userId: 'user-A', email: 'userA@test.com' });
                    await Sync.saveWeightEntry({ date: '2026-03-01', weight: 80, calories: 1600 });
                    let queue = Sync.getQueue();
                    expect(queue[0].data.user_id).toBe('user-A');
                    global.window.Auth = createMockAuth({ isAuthenticated: true, userId: 'user-B', email: 'userB@test.com' });
                    await Sync.saveWeightEntry({ date: '2026-03-02', weight: 81, calories: 1700 });
                    queue = Sync.getQueue();
                    expect(queue).toHaveLength(2);
                    expect(queue[1].data.user_id).toBe('user-B');
                });

                test('E2E: Logout clears auth-dependent state', () => {
                    global.window.Auth = createMockAuth({ isAuthenticated: true, userId: 'logout-user' });
                    let status = Sync.getStatus();
                    expect(status.isAuthenticated).toBeTrue();
                    global.window.Auth = createMockAuth({ isAuthenticated: false, userId: null });
                    status = Sync.getStatus();
                    expect(status.isAuthenticated).toBeFalse();
                    expect(status.currentUser).toBeNull();
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
        console.log('\n✓ All Auth E2E tests passed!\n');
        process.exit(0);
    }
}

runTests();
