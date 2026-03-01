/**
 * Mock Supabase Client for Testing
 * 
 * Provides a mock Supabase client for isolated Sync module testing.
 * Supports configurable success/failure scenarios and call tracking.
 * 
 * Usage:
 *   const mock = createMockSupabase();
 *   mock.configure({ insert: { success: true } });
 *   global.Auth._getSupabase = () => mock;
 */

'use strict';

// Call tracking for verification
const callHistory = {
    insert: [],
    update: [],
    delete: [],
    select: [],
    total: 0
};

// Configuration for mock behavior
const config = {
    insert: { success: true, data: null, error: null },
    update: { success: true, data: null, error: null },
    delete: { success: true, error: null },
    select: { success: true, data: [], error: null },
    delay: 0, // Simulate network delay in ms
    failAfter: null // Fail after N successful calls
};

let callCount = 0;

/**
 * Create a mock Supabase client
 * @returns {object} Mock Supabase client
 */
function createMockSupabase() {
    return {
        from: (table) => ({
            insert: (data) => {
                callHistory.insert.push({ table, data });
                callHistory.total++;
                callCount++;
                
                return {
                    select: () => ({
                        single: async () => {
                            if (config.delay) {
                                await sleep(config.delay);
                            }
                            
                            if (config.failAfter && callCount > config.failAfter) {
                                return {
                                    data: null,
                                    error: new Error('Simulated network error')
                                };
                            }
                            
                            if (config.insert.success) {
                                const result = config.insert.data || { ...data, id: generateMockId() };
                                return { data: result, error: null };
                            } else {
                                return {
                                    data: null,
                                    error: config.insert.error || new Error('Insert failed')
                                };
                            }
                        }
                    })
                };
            },
            
            update: (data) => ({
                eq: (column, value) => ({
                    select: () => ({
                        single: async () => {
                            if (config.delay) {
                                await sleep(config.delay);
                            }
                            
                            if (config.failAfter && callCount > config.failAfter) {
                                return {
                                    data: null,
                                    error: new Error('Simulated network error')
                                };
                            }
                            
                            if (config.update.success) {
                                const result = config.update.data || data;
                                return { data: result, error: null };
                            } else {
                                return {
                                    data: null,
                                    error: config.update.error || new Error('Update failed')
                                };
                            }
                        }
                    })
                })
            }),
            
            delete: () => ({
                eq: (column, value) => ({
                    single: async () => {
                        if (config.delay) {
                            await sleep(config.delay);
                        }
                        
                        if (config.failAfter && callCount > config.failAfter) {
                            return {
                                data: null,
                                error: new Error('Simulated network error')
                            };
                        }
                        
                        if (config.delete.success) {
                            return { data: null, error: null };
                        } else {
                            return {
                                data: null,
                                error: config.delete.error || new Error('Delete failed')
                            };
                        }
                    }
                })
            }),
            
            select: (columns = '*') => ({
                order: (column, options) => ({
                    data: config.select.data,
                    error: config.select.error
                })
            })
        })
    };
}

/**
 * Configure mock behavior
 * @param {object} newConfig - Configuration overrides
 */
function configureMock(newConfig) {
    Object.assign(config, newConfig);
}

/**
 * Reset mock state
 */
function resetMock() {
    callHistory.insert = [];
    callHistory.update = [];
    callHistory.delete = [];
    callHistory.select = [];
    callHistory.total = 0;
    callCount = 0;
    
    Object.assign(config, {
        insert: { success: true, data: null, error: null },
        update: { success: true, data: null, error: null },
        delete: { success: true, error: null },
        select: { success: true, data: [], error: null },
        delay: 0,
        failAfter: null
    });
}

/**
 * Get call history
 * @returns {object} Call history
 */
function getCallHistory() {
    return { ...callHistory, count: callCount };
}

/**
 * Generate a mock ID
 * @returns {string} Mock ID
 */
function generateMockId() {
    return 'mock-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Sleep helper
 * @param {number} ms - Milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create mock Auth module
 * @param {object} options - Auth configuration
 * @returns {object} Mock Auth module
 */
function createMockAuth(options = {}) {
    const {
        isAuthenticated = true,
        userId = 'test-user-123',
        email = 'test@example.com',
        session = true
    } = options;
    
    let authStateListeners = [];
    
    return {
        isAuthenticated: () => isAuthenticated,
        
        getCurrentUser: () => {
            if (isAuthenticated) {
                return { id: userId, email };
            }
            return null;
        },
        
        getSession: async () => {
            if (session) {
                return {
                    session: { user: { id: userId, email } },
                    error: null
                };
            }
            return { session: null, error: new Error('No session') };
        },
        
        _getSupabase: () => createMockSupabase(),
        
        onAuthStateChange: (listener) => {
            authStateListeners.push(listener);
            return () => {
                authStateListeners = authStateListeners.filter(l => l !== listener);
            };
        },
        
        // For triggering auth events in tests
        _triggerAuthEvent: (event, user) => {
            authStateListeners.forEach(listener => {
                try {
                    listener(event, user);
                } catch (error) {
                    console.error('Mock Auth listener error:', error);
                }
            });
        }
    };
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createMockSupabase,
        configureMock,
        resetMock,
        getCallHistory,
        createMockAuth
    };
}

if (typeof window !== 'undefined') {
    window.MockSupabase = {
        createMockSupabase,
        configureMock,
        resetMock,
        getCallHistory,
        createMockAuth
    };
}
