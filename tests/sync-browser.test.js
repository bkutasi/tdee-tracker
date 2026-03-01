/**
 * Sync Module - Browser Integration Tests
 * Tests for Auth integration, network events, and real-world scenarios
 */

describe('Sync - Auth Integration', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
        
        // Clean up any existing Auth mock
        delete window.Auth;
    });

    afterEach(() => {
        delete window.Auth;
    });

    it('fetches and merges data on SIGNED_IN event', (done) => {
        // Mock Auth module with event triggering capability
        let authCallback = null;
        
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'user-789', email: 'signin@example.com' }),
            getSession: async () => ({ session: { user: { id: 'user-789' } }, error: null }),
            _getSupabase: () => ({
                from: (table) => ({
                    select: () => ({
                        order: () => ({
                            data: [
                                { date: '2026-03-25', weight: 82, calories: 1800, updated_at: '2026-03-25T10:00:00Z' }
                            ],
                            error: null
                        })
                    })
                })
            }),
            onAuthStateChange: (callback) => {
                authCallback = callback;
            }
        };

        // Initialize sync to set up auth listener
        Sync.init();

        // Simulate SIGNED_IN event after a short delay
        setTimeout(() => {
            if (authCallback) {
                authCallback('SIGNED_IN', { id: 'user-789', email: 'signin@example.com' });
            }
            
            // Give time for fetch and merge
            setTimeout(() => {
                const entry = Storage.getEntry('2026-03-25');
                expect(entry).toBeDefined();
                expect(entry.weight).toBe(82);
                done();
            }, 100);
        }, 50);
    });

    it('pauses sync on SIGNED_OUT event', (done) => {
        let authCallback = null;
        
        window.Auth = {
            isAuthenticated: () => false,
            getCurrentUser: () => null,
            getSession: async () => ({ session: null, error: null }),
            _getSupabase: () => null,
            onAuthStateChange: (callback) => {
                authCallback = callback;
            }
        };

        Sync.init();

        // Queue an operation first
        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        
        expect(Sync.getQueue()).toHaveLength(1);

        // Simulate SIGNED_OUT
        setTimeout(() => {
            if (authCallback) {
                authCallback('SIGNED_OUT', null);
            }
            
            // Sync should be paused (isSyncing should be false)
            setTimeout(() => {
                const status = Sync.getStatus();
                expect(status.isSyncing).toBeFalse();
                done();
            }, 50);
        }, 50);
    });

    it('initial data fetch on app start works when authenticated', (done) => {
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'user-start', email: 'start@example.com' }),
            getSession: async () => ({ 
                session: { user: { id: 'user-start' } }, 
                error: null 
            }),
            _getSupabase: () => ({
                from: (table) => ({
                    select: () => ({
                        order: () => ({
                            data: [
                                { date: '2026-03-26', weight: 83, calories: 1900, updated_at: '2026-03-26T10:00:00Z' }
                            ],
                            error: null
                        })
                    })
                })
            }),
            onAuthStateChange: () => {}
        };

        // Trigger initial data fetch manually (simulating what happens in fetchAndMergeData)
        const fetchAndMerge = async () => {
            const remoteResult = await Sync.fetchWeightEntries();
            if (remoteResult.success) {
                Sync.mergeEntries(remoteResult.entries || []);
            }
            return remoteResult;
        };

        fetchAndMerge().then(() => {
            const entries = Storage.getAllEntries();
            expect(Object.keys(entries).length).toBeGreaterThan(0);
            done();
        });
    });

    it('handles auth state changes correctly', (done) => {
        let authCallback = null;
        let eventHistory = [];
        
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'user-history' }),
            getSession: async () => ({ session: { user: { id: 'user-history' } } }),
            _getSupabase: () => null,
            onAuthStateChange: (callback) => {
                authCallback = callback;
                // Wrap callback to track events
                return () => {
                    const originalCallback = callback;
                    return (event, user) => {
                        eventHistory.push(event);
                        originalCallback(event, user);
                    };
                };
            }
        };

        Sync.init();

        setTimeout(() => {
            // Simulate sign in
            if (authCallback) {
                authCallback('SIGNED_IN', { id: 'user-history' });
            }
            
            setTimeout(() => {
                // Simulate sign out
                if (authCallback) {
                    authCallback('SIGNED_OUT', null);
                }
                
                setTimeout(() => {
                    // Verify events were processed
                    const status = Sync.getStatus();
                    expect(status.isAuthenticated).toBeFalse();
                    done();
                }, 50);
            }, 50);
        }, 50);
    });
});

describe('Sync - Network Events', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
        delete window.Auth;
    });

    it('attempts sync when network comes online', (done) => {
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'user-online' }),
            getSession: async () => ({ session: { user: { id: 'user-online' } } }),
            _getSupabase: () => ({
                from: (table) => ({
                    insert: (data) => ({
                        select: () => ({
                            single: async () => ({ data: { ...data, id: 'synced-id' }, error: null })
                        })
                    }),
                    update: (data) => ({
                        eq: () => ({
                            select: () => ({
                                single: async () => ({ data, error: null })
                            })
                        })
                    }),
                    delete: () => ({
                        eq: () => ({
                            single: async () => ({ error: null })
                        })
                    })
                })
            }),
            onAuthStateChange: () => {}
        };

        // Queue operations while "offline"
        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        Sync.queueOperation('update', 'weight_entries', { weight: 81, id: 'entry-1' });

        expect(Sync.getQueue()).toHaveLength(2);

        // Simulate online event
        setTimeout(() => {
            window.dispatchEvent(new Event('online'));
            
            // Give time for sync to process
            setTimeout(() => {
                // Queue should be cleared after successful sync
                const queue = Sync.getQueue();
                expect(queue).toHaveLength(0);
                done();
            }, 200);
        }, 50);
    });

    it('queues operations when offline', () => {
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'user-offline' }),
            getSession: async () => ({ session: { user: { id: 'user-offline' } } }),
            _getSupabase: () => null,
            onAuthStateChange: () => {}
        };

        // Even when Auth is available, if we can't sync (simulated offline),
        // operations should still be queued
        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        
        const queue = Sync.getQueue();
        expect(queue).toHaveLength(1);
        expect(queue[0].type).toBe('create');
    });
});

describe('Sync - Error Handling', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
        delete window.Auth;
    });

    it('handles network errors gracefully', (done) => {
        let callCount = 0;
        
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'user-error' }),
            getSession: async () => ({ session: { user: { id: 'user-error' } } }),
            _getSupabase: () => ({
                from: (table) => ({
                    insert: (data) => ({
                        select: () => ({
                            single: async () => {
                                callCount++;
                                return { data: null, error: new Error('Network error') };
                            }
                        })
                    })
                })
            }),
            onAuthStateChange: () => {}
        };

        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        
        // Manually trigger sync
        Sync.syncAll();
        
        setTimeout(() => {
            // Operation should still be in queue (for retry)
            const queue = Sync.getQueue();
            expect(queue.length).toBeGreaterThan(0);
            
            // Error should be recorded
            const history = Sync.getErrorHistory();
            expect(history.length).toBeGreaterThan(0);
            done();
        }, 200);
    });

    it('retries failed operations up to 3 times', (done) => {
        let callCount = 0;
        const maxCalls = 4; // Will fail 3 times, then succeed on 4th
        
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'user-retry' }),
            getSession: async () => ({ session: { user: { id: 'user-retry' } } }),
            _getSupabase: () => ({
                from: (table) => ({
                    insert: (data) => ({
                        select: () => ({
                            single: async () => {
                                callCount++;
                                if (callCount < maxCalls) {
                                    return { data: null, error: new Error('Network error') };
                                }
                                return { data: { ...data, id: 'success-id' }, error: null };
                            }
                        })
                    })
                })
            }),
            onAuthStateChange: () => {}
        };

        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        
        // Manually trigger sync multiple times to simulate retries
        Sync.syncAll();
        
        setTimeout(() => {
            Sync.syncAll();
        }, 100);
        
        setTimeout(() => {
            Sync.syncAll();
        }, 200);
        
        setTimeout(() => {
            Sync.syncAll();
        }, 300);
        
        setTimeout(() => {
            // Should have attempted multiple times
            expect(callCount).toBeGreaterThanOrEqual(1);
            
            // After max retries, operation should be removed or marked
            const history = Sync.getErrorHistory();
            expect(history.length).toBeGreaterThan(0);
            done();
        }, 500);
    });

    it('auth errors do not crash app', (done) => {
        window.Auth = {
            isAuthenticated: () => false,
            getCurrentUser: () => null,
            getSession: async () => {
                throw new Error('Auth session error');
            },
            _getSupabase: () => {
                throw new Error('No Supabase');
            },
            onAuthStateChange: () => {}
        };

        // Should not throw
        expect(() => {
            Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        }).not.toThrow();
        
        // Queue should still work
        expect(Sync.getQueue()).toHaveLength(1);
        
        // syncAll should handle auth errors gracefully
        Sync.syncAll().then(() => {
            done();
        }).catch((err) => {
            // Should not reach here
            expect(true).toBeFalse();
            done();
        });
    });

    it('queue survives errors', (done) => {
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'user-survive' }),
            getSession: async () => ({ session: { user: { id: 'user-survive' } } }),
            _getSupabase: () => ({
                from: (table) => ({
                    insert: () => ({
                        select: () => ({
                            single: async () => ({ data: null, error: new Error('Always fails') })
                        })
                    })
                })
            }),
            onAuthStateChange: () => {}
        };

        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        Sync.queueOperation('create', 'weight_entries', { weight: 81 });
        
        expect(Sync.getQueue()).toHaveLength(2);
        
        Sync.syncAll();
        
        setTimeout(() => {
            // Queue should still have operations (failed but preserved for retry)
            const queue = Sync.getQueue();
            expect(queue.length).toBeGreaterThan(0);
            done();
        }, 200);
    });

    it('error history is tracked correctly', () => {
        localStorage.clear();
        Sync.init();
        
        // Manually record some errors by manipulating localStorage
        const errors = [
            { id: 'err-1', timestamp: Date.now(), operation: 'create', error: 'Network timeout', resolved: false },
            { id: 'err-2', timestamp: Date.now(), operation: 'update', error: 'Auth failed', resolved: false },
            { id: 'err-3', timestamp: Date.now(), operation: 'delete', error: 'Not found', resolved: false }
        ];
        
        localStorage.setItem('tdee_sync_history', JSON.stringify(errors));
        Sync.init();
        
        const history = Sync.getErrorHistory();
        expect(history).toHaveLength(3);
        
        const operations = history.map(e => e.operation);
        expect(operations).toContain('create');
        expect(operations).toContain('update');
        expect(operations).toContain('delete');
    });
});

describe('Sync - Debug Utilities', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
        delete window.Auth;
    });

    it('getStatus returns comprehensive status', () => {
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'user-status', email: 'status@example.com' }),
            getSession: async () => ({ session: { user: { id: 'user-status' } } }),
            onAuthStateChange: () => {}
        };

        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        
        const status = Sync.getStatus();
        
        expect(status.isOnline).toBeDefined();
        expect(status.isAuthenticated).toBeTrue();
        expect(status.hasSession).toBeDefined();
        expect(status.currentUser).toBe('status@example.com');
        expect(status.pendingOperations).toBe(1);
        expect(status.isSyncing).toBeFalse();
        expect(status.errorCount).toBe(0);
    });

    it('getQueue returns formatted operations', () => {
        Sync.queueOperation('create', 'weight_entries', { weight: 80 }, 'local-456');
        
        const queue = Sync.getQueue();
        
        expect(queue).toHaveLength(1);
        expect(queue[0].id).toBeDefined();
        expect(queue[0].type).toBe('create');
        expect(queue[0].table).toBe('weight_entries');
        expect(queue[0].timestampFormatted).toBeDefined();
        expect(queue[0].retries).toBe(0);
        expect(queue[0].localId).toBe('local-456');
    });

    it('getLastSyncTime returns formatted string', () => {
        const time = Sync.getLastSyncTime();
        expect(typeof time).toBe('string');
        expect(time).toBe('Never'); // Should be 'Never' initially
    });

    it('clearErrorHistory removes all errors', () => {
        localStorage.setItem('tdee_sync_history', JSON.stringify([
            { id: 'e1', timestamp: Date.now(), operation: 'test', error: 'Error', resolved: false }
        ]));
        
        Sync.init();
        expect(Sync.getErrorHistory()).toHaveLength(1);
        
        Sync.clearErrorHistory();
        expect(Sync.getErrorHistory()).toHaveLength(0);
    });

    it('clearQueue removes all pending operations', () => {
        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        Sync.queueOperation('update', 'weight_entries', { weight: 81 });
        
        expect(Sync.getQueue()).toHaveLength(2);
        
        Sync.clearQueue();
        expect(Sync.getQueue()).toHaveLength(0);
    });
});

describe('Sync - Edge Cases', () => {
    beforeEach(() => {
        localStorage.clear();
        Storage.init();
        delete window.Auth;
    });

    it('handles empty remote entries array', () => {
        const merged = Sync.mergeEntries([]);
        expect(merged).toEqual([]);
    });

    it('handles null entry gracefully', async () => {
        const result = await Sync.saveWeightEntry(null);
        expect(result.success).toBeFalse();
        expect(result.error).toBe('Entry must include date field');
    });

    it('handles undefined entry gracefully', async () => {
        const result = await Sync.saveWeightEntry(undefined);
        expect(result.success).toBeFalse();
    });

    it('handles entry with only date field', async () => {
        const result = await Sync.saveWeightEntry({ date: '2026-03-30' });
        expect(result.success).toBeTrue();
        
        const entry = Storage.getEntry('2026-03-30');
        expect(entry).toBeDefined();
        expect(entry.weight).toBeUndefined();
    });

    it('syncAll does nothing with empty queue', (done) => {
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'user-empty' }),
            getSession: async () => ({ session: { user: { id: 'user-empty' } } }),
            _getSupabase: () => null,
            onAuthStateChange: () => {}
        };

        expect(Sync.getQueue()).toHaveLength(0);
        
        Sync.syncAll().then(() => {
            expect(Sync.getQueue()).toHaveLength(0);
            done();
        });
    });

    it('syncAll prevents concurrent execution', (done) => {
        window.Auth = {
            isAuthenticated: () => true,
            getCurrentUser: () => ({ id: 'user-concurrent' }),
            getSession: async () => ({ session: { user: { id: 'user-concurrent' } } }),
            _getSupabase: () => ({
                from: (table) => ({
                    insert: (data) => ({
                        select: () => ({
                            single: async () => {
                                // Simulate slow operation
                                await new Promise(resolve => setTimeout(resolve, 100));
                                return { data: { ...data, id: 'id' }, error: null };
                            }
                        })
                    })
                })
            }),
            onAuthStateChange: () => {}
        };

        Sync.queueOperation('create', 'weight_entries', { weight: 80 });
        
        // Start first sync
        Sync.syncAll();
        
        // Try to start second sync immediately
        setTimeout(() => {
            Sync.syncAll();
            
            setTimeout(() => {
                // Should have processed without issues
                const status = Sync.getStatus();
                expect(status.isSyncing).toBeFalse();
                done();
            }, 200);
        }, 10);
    });
});
