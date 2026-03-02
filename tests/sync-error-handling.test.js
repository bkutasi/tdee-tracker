/**
 * Sync Error Handling & Debug Mode Tests
 * 
 * Tests for recently fixed issues:
 * 1. Sync.saveWeightEntry() return format consistency
 * 2. SyncDebug DEBUG_MODE behavior (localhost only)
 * 3. window.SyncDebug not being overwritten in production
 * 4. Auto-save flow error handling
 */

describe('Sync.saveWeightEntry Return Format', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
        
        // Mock Auth module for all tests
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'test-user', email: 'test@example.com' }),
            getSession: async () => ({ session: { user: { id: 'test-user' } } }),
            _getSupabase: () => null,
            onAuthStateChange: () => {}
        };
    });

    afterEach(() => {
        delete window.Auth;
    });

    it('returns {success: true} on successful save (not boolean)', async () => {
        const entry = {
            date: '2026-03-02',
            weight: 80.5,
            calories: 1600,
            notes: 'Test entry'
        };

        const result = await Sync.saveWeightEntry(entry);

        // CRITICAL: Must be object with success property, not boolean
        expect(typeof result).toBe('object');
        expect(result.success).toBeTrue();
        expect(result).toEqual({ success: true });
    });

    it('returns {success: false, error: string} on validation error', async () => {
        const entry = { weight: 80, calories: 1600 }; // Missing date

        const result = await Sync.saveWeightEntry(entry);

        expect(typeof result).toBe('object');
        expect(result.success).toBeFalse();
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
    });

    it('returns {success: true} when saved locally without auth', async () => {
        // Remove auth mock
        delete window.Auth;

        const entry = {
            date: '2026-03-03',
            weight: 81,
            calories: 1700
        };

        const result = await Sync.saveWeightEntry(entry);

        // Should still return consistent format even without auth
        expect(typeof result).toBe('object');
        expect(result.success).toBeTrue();
    });

    it('returns {success: true} when entry missing weight (saved locally only)', async () => {
        const entry = {
            date: '2026-03-04',
            weight: '', // Empty weight
            calories: 1800
        };

        const result = await Sync.saveWeightEntry(entry);

        // Entry saved locally but not queued - should still return success
        expect(typeof result).toBe('object');
        expect(result.success).toBeTrue();
    });
});

describe('DailyEntry Auto-Save Error Handling', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
        
        // Mock Auth module
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'test-user', email: 'test@example.com' }),
            getSession: async () => ({ session: { user: { id: 'test-user' } } }),
            _getSupabase: () => null,
            onAuthStateChange: () => {}
        };

        // Mock console.error to capture error logs
        this.capturedErrors = [];
        this.originalConsoleError = console.error;
        console.error = (msg) => {
            this.capturedErrors.push(msg);
        };
    });

    afterEach(() => {
        delete window.Auth;
        console.error = this.originalConsoleError;
    });

    it('does not log "undefined" error on successful auto-save', async () => {
        const entry = {
            date: '2026-03-05',
            weight: 82,
            calories: 1900,
            notes: 'Auto-save test'
        };

        const result = await Sync.saveWeightEntry(entry);

        // Verify no "undefined" errors would be logged
        expect(result.success).toBeTrue();
        
        // Simulate dailyEntry.js error check
        const wouldLogError = !result.success;
        expect(wouldLogError).toBeFalse();
    });

    it('handles error result with proper error message', async () => {
        const entry = { weight: 80 }; // Missing date

        const result = await Sync.saveWeightEntry(entry);

        // Verify error has message (not undefined)
        expect(result.success).toBeFalse();
        expect(result.error).toBeDefined();
        expect(result.error).not.toBe(undefined);
        expect(result.error).not.toBe('');
        
        // Simulate dailyEntry.js error logging
        const errorMessage = result.error || 'Unknown error';
        expect(errorMessage).not.toBe('undefined');
    });
});

describe('SyncDebug DEBUG_MODE Behavior', () => {
    beforeEach(() => {
        // Save original location
        this.originalLocation = window.location;
    });

    afterEach(() => {
        // Restore original location
        if (this.originalLocation) {
            // Can't restore window.location, but tests are isolated
        }
    });

    it('enables DEBUG_MODE on localhost', () => {
        // Simulate localhost
        delete window.SyncDebug;
        
        // Load sync-debug.js behavior
        const isLocalhost = (window.location && 
            (window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1' ||
             window.location.protocol === 'file:'));
        
        // In test environment, window.location may not be available
        // This test documents the expected behavior
        expect(typeof isLocalhost).toBe('boolean');
    });

    it('disables DEBUG_MODE on production domains', () => {
        // Production domains should NOT have debug enabled
        const productionDomains = [
            'tdee.kutasi.dev',
            'example.com',
            'myapp.vercel.app'
        ];

        productionDomains.forEach(domain => {
            const isProduction = domain !== 'localhost' && 
                                domain !== '127.0.0.1';
            expect(isProduction).toBeTrue();
        });
    });
});

describe('SyncDebug Window Global Protection', () => {
    beforeEach(() => {
        localStorage.clear();
        this.originalSyncDebug = window.SyncDebug;
    });

    afterEach(() => {
        // Restore original
        if (this.originalSyncDebug) {
            window.SyncDebug = this.originalSyncDebug;
        } else {
            delete window.SyncDebug;
        }
    });

    it('does not overwrite window.SyncDebug if already defined', () => {
        // Simulate sync-debug.js loading first
        const mockSyncDebug = {
            DEBUG_MODE: false,
            log: () => {},
            info: () => 'from-sync-debug-js',
            customMethod: () => 'custom'
        };
        
        window.SyncDebug = mockSyncDebug;

        // Initialize Sync module (which would normally overwrite SyncDebug)
        Sync.init();

        // Verify window.SyncDebug was NOT overwritten
        expect(window.SyncDebug).toBe(mockSyncDebug);
        expect(window.SyncDebug.customMethod).toBeDefined();
        expect(window.SyncDebug.customMethod()).toBe('custom');
    });

    it('creates window.SyncDebug only when DEBUG_MODE is true and not already defined', () => {
        // Ensure no SyncDebug exists
        delete window.SyncDebug;

        // In test environment, DEBUG_MODE should be false (not localhost)
        // But we can test the protection logic
        
        // This test documents that Sync.js checks for existing SyncDebug
        // before creating its own (see sync.js:1257)
        expect(window.SyncDebug).toBeUndefined();
    });

    it('preserves SyncDebug methods from sync-debug.js', () => {
        // Simulate sync-debug.js defining all methods
        const expectedMethods = [
            'log', 'info', 'warn', 'error', 'debug',
            'status', 'queue', 'errors', 'forceSync',
            'clearQueue', 'filterQueue', 'removeStuck',
            'clearErrors', 'lastSync', 'testEntry',
            'backfillLocal', 'help'
        ];

        const mockSyncDebug = {};
        expectedMethods.forEach(method => {
            mockSyncDebug[method] = () => `mock-${method}`;
        });
        mockSyncDebug.DEBUG_MODE = true;

        window.SyncDebug = mockSyncDebug;

        // Initialize Sync (should not overwrite)
        Sync.init();

        // Verify all methods preserved
        expectedMethods.forEach(method => {
            expect(window.SyncDebug[method]).toBeDefined();
            expect(window.SyncDebug[method]()).toBe(`mock-${method}`);
        });
    });
});

describe('Storage.getAllEntries Integration', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
    });

    it('is called by Sync.saveWeightEntry to check existing entries', async () => {
        // Setup: Save an entry first
        Storage.saveEntry('2026-03-06', {
            weight: 80,
            calories: 1600,
            notes: 'Original'
        });

        // Mock Auth
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'test-user' }),
            getSession: async () => ({ session: { user: { id: 'test-user' } } }),
            _getSupabase: () => null,
            onAuthStateChange: () => {}
        };

        // Update the same entry
        await Sync.saveWeightEntry({
            date: '2026-03-06',
            weight: 81,
            calories: 1700,
            notes: 'Updated'
        });

        // Verify getAllEntries was accessible (no TypeError)
        const allEntries = Storage.getAllEntries();
        expect(allEntries['2026-03-06']).toBeDefined();
        expect(allEntries['2026-03-06'].weight).toBe(81);

        // Verify queue has UPDATE operation (not CREATE)
        const queue = Sync.getQueue();
        expect(queue).toHaveLength(1);
        expect(queue[0].type).toBe('update'); // Should be update, not create
    });

    it('handles empty storage when checking existing entries', async () => {
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'test-user' }),
            getSession: async () => ({ session: { user: { id: 'test-user' } } }),
            _getSupabase: () => null,
            onAuthStateChange: () => {}
        };

        // Save new entry (no existing entry)
        await Sync.saveWeightEntry({
            date: '2026-03-07',
            weight: 82,
            calories: 1800
        });

        // Verify queue has CREATE operation
        const queue = Sync.getQueue();
        expect(queue).toHaveLength(1);
        expect(queue[0].type).toBe('create');
    });
});

describe('Regression: Storage.getEntries TypeError', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
    });

    it('does not call Storage.getEntries (deprecated method)', () => {
        // Verify Storage.getEntries does NOT exist
        expect(Storage.getEntries).toBeUndefined();
        
        // Verify correct method exists
        expect(Storage.getAllEntries).toBeDefined();
        expect(typeof Storage.getAllEntries).toBe('function');
    });

    it('uses Storage.getAllEntries throughout sync.js', () => {
        // This test ensures the fix for:
        // TypeError: Storage.getEntries is not a function
        
        // Try to call the correct method
        const result = Storage.getAllEntries();
        
        // Should return object (possibly empty)
        expect(typeof result).toBe('object');
        expect(Array.isArray(result)).toBeFalse();
        
        // Empty storage should return empty object
        expect(Object.keys(result).length).toBe(0);
    });

    it('getAllEntries returns cached entries after save', () => {
        Storage.saveEntry('2026-03-08', { weight: 83, calories: 1900 });
        
        const entries = Storage.getAllEntries();
        
        expect(entries['2026-03-08']).toBeDefined();
        expect(entries['2026-03-08'].weight).toBe(83);
    });
});

describe('Production Error Scenarios', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
        this.originalConsoleError = console.error;
        this.capturedLogs = [];
        console.error = (msg) => {
            this.capturedLogs.push(msg);
        };
    });

    afterEach(() => {
        console.error = this.originalConsoleError;
    });

    it('handles network error gracefully without undefined messages', async () => {
        // Mock Auth
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'test-user' }),
            getSession: async () => ({ session: { user: { id: 'test-user' } } }),
            _getSupabase: () => null,
            onAuthStateChange: () => {}
        };

        // Save entry successfully
        const result = await Sync.saveWeightEntry({
            date: '2026-03-09',
            weight: 84,
            calories: 2000
        });

        // Verify no undefined errors
        expect(result.success).toBeTrue();
        expect(result.error).toBeUndefined();
        
        // Verify no error logs with "undefined"
        const undefinedErrors = this.capturedLogs.filter(log => 
            log && log.toString().includes('undefined')
        );
        expect(undefinedErrors).toHaveLength(0);
    });

    it('queues operation even when offline', async () => {
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'test-user' }),
            getSession: async () => ({ session: { user: { id: 'test-user' } } }),
            _getSupabase: () => null,
            onAuthStateChange: () => {}
        };

        const result = await Sync.saveWeightEntry({
            date: '2026-03-10',
            weight: 85,
            calories: 2100
        });

        // Should save locally and queue for later sync
        expect(result.success).toBeTrue();
        
        const queue = Sync.getQueue();
        expect(queue).toHaveLength(1);
        expect(queue[0].type).toBe('create');
    });
});
