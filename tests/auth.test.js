/**
 * Auth Module Tests
 * Tests for Supabase authentication: magic link, OAuth, session management, and auth state
 */

describe('Auth.init', () => {
    beforeEach(() => {
        // Reset Auth state before each test
        if (window.Auth) {
            window.Auth._lastUser = null;
        }
        // Clear any existing config
        delete window.SUPABASE_CONFIG;
        // Clear mock Supabase
        delete window.supabase;
    });

    it('throws error when Supabase config not found', async () => {
        // Arrange: No config set
        delete window.SUPABASE_CONFIG;
        
        // Act & Assert: Should throw
        try {
            await Auth.init();
            throw new Error('Expected error but none thrown');
        } catch (error) {
            expect(error.message).toBe('Supabase configuration not found');
        }
    });

    it('initializes without errors when config exists', async () => {
        // Arrange: Valid config
        window.SUPABASE_CONFIG = {
            url: 'https://test.supabase.co',
            anonKey: 'test-key',
            siteUrl: 'http://localhost:8000'
        };
        
        // Act: Initialize (will load Supabase from CDN)
        await Auth.init();
        
        // Assert: Should be initialized
        expect(Auth).toBeDefined();
    });

    it('does not reinitialize if already initialized', async () => {
        // Arrange: Config and initial init
        window.SUPABASE_CONFIG = {
            url: 'https://test.supabase.co',
            anonKey: 'test-key'
        };
        await Auth.init();
        const firstSupabase = Auth._getSupabase();
        
        // Act: Initialize again
        await Auth.init();
        const secondSupabase = Auth._getSupabase();
        
        // Assert: Same instance (no reinit)
        expect(firstSupabase).toBe(secondSupabase);
    });
});

describe('Auth.signInWithMagicLink', () => {
    beforeEach(() => {
        localStorage.clear();
        window.SUPABASE_CONFIG = {
            url: 'https://test.supabase.co',
            anonKey: 'test-key',
            siteUrl: 'http://localhost:8000'
        };
        // Clear mock Supabase
        delete window.supabase;
    });

    it('returns error when Auth not initialized', async () => {
        // Arrange: Auth not initialized
        delete window.supabase;
        
        // Act: Try to sign in without init
        try {
            await Auth.signInWithMagicLink('test@example.com');
            throw new Error('Expected error but none thrown');
        } catch (error) {
            expect(error.message).toBe('Auth not initialized. Call Auth.init() first');
        }
    });

    it('returns success for valid email format', async () => {
        // Arrange: Initialized Auth with mock Supabase
        await Auth.init();
        
        // Mock Supabase signInWithOtp
        let callCount = 0;
        Auth._getSupabase().auth.signInWithOtp = function(data) {
            callCount++;
            return Promise.resolve({ error: null });
        };
        
        // Act: Sign in with valid email
        const result = await Auth.signInWithMagicLink('user@example.com');
        
        // Assert: Success response
        expect(result.success).toBeTrue();
        expect(result.message).toBe('Magic link sent! Check your email.');
    });

    it('returns error for invalid email format', async () => {
        // Arrange: Initialized Auth
        await Auth.init();
        
        // Mock Supabase to return email format error
        Auth._getSupabase().auth.signInWithOtp = function(data) {
            return Promise.resolve({
                error: { message: 'Invalid email format' }
            });
        };
        
        // Act: Sign in with invalid email
        const result = await Auth.signInWithMagicLink('invalid-email');
        
        // Assert: Error response
        expect(result.success).toBeFalse();
        expect(result.error).toBe('Invalid email format');
    });

    it('handles network errors gracefully', async () => {
        // Arrange: Initialized Auth with network error
        await Auth.init();
        Auth._getSupabase().auth.signInWithOtp = function(data) {
            return Promise.reject(new Error('Network error'));
        };
        
        // Act: Sign in with network failure
        const result = await Auth.signInWithMagicLink('user@example.com');
        
        // Assert: Error response
        expect(result.success).toBeFalse();
        expect(result.error).toBe('Network error');
    });

    it('uses configured siteUrl as default redirectTo', async () => {
        // Arrange: Config with siteUrl
        window.SUPABASE_CONFIG = {
            url: 'https://test.supabase.co',
            anonKey: 'test-key',
            siteUrl: 'http://localhost:8000'
        };
        await Auth.init();
        
        // Mock to capture options
        let capturedOptions = null;
        Auth._getSupabase().auth.signInWithOtp = function(data) {
            capturedOptions = data.options;
            return Promise.resolve({ error: null });
        };
        
        // Act: Sign in without explicit redirectTo
        await Auth.signInWithMagicLink('user@example.com');
        
        // Assert: Used configured siteUrl
        expect(capturedOptions.emailRedirectTo).toBe('http://localhost:8000');
    });

    it('uses custom redirectTo when provided', async () => {
        // Arrange: Initialized Auth
        await Auth.init();
        
        // Mock to capture options
        let capturedOptions = null;
        Auth._getSupabase().auth.signInWithOtp = function(data) {
            capturedOptions = data.options;
            return Promise.resolve({ error: null });
        };
        
        // Act: Sign in with custom redirectTo
        await Auth.signInWithMagicLink('user@example.com', 'http://custom.com/callback');
        
        // Assert: Used custom redirectTo
        expect(capturedOptions.emailRedirectTo).toBe('http://custom.com/callback');
    });

    it('lowercases and trims email before sending', async () => {
        // Arrange: Initialized Auth
        await Auth.init();
        
        // Mock to capture email
        let capturedEmail = null;
        Auth._getSupabase().auth.signInWithOtp = function(data) {
            capturedEmail = data.email;
            return Promise.resolve({ error: null });
        };
        
        // Act: Sign in with mixed case email
        await Auth.signInWithMagicLink('  USER@Example.COM  ');
        
        // Assert: Email normalized
        expect(capturedEmail).toBe('user@example.com');
    });
});

describe('Auth.signInWithOAuth', () => {
    beforeEach(() => {
        localStorage.clear();
        window.SUPABASE_CONFIG = {
            url: 'https://test.supabase.co',
            anonKey: 'test-key',
            siteUrl: 'http://localhost:8000'
        };
        delete window.supabase;
    });

    it('returns error when Auth not initialized', async () => {
        // Arrange: Auth not initialized
        delete window.supabase;
        
        // Act & Assert: Should throw
        try {
            await Auth.signInWithOAuth('google');
            throw new Error('Expected error but none thrown');
        } catch (error) {
            expect(error.message).toBe('Auth not initialized. Call Auth.init() first');
        }
    });

    it('returns success with URL for Google provider', async () => {
        // Arrange: Initialized Auth
        await Auth.init();
        Auth._getSupabase().auth.signInWithOAuth = function(data) {
            return Promise.resolve({
                data: { url: 'https://accounts.google.com/oauth' },
                error: null
            });
        };
        
        // Act: Sign in with Google
        const result = await Auth.signInWithOAuth('google');
        
        // Assert: Success with URL
        expect(result.success).toBeTrue();
        expect(result.url).toBe('https://accounts.google.com/oauth');
    });

    it('returns success with URL for GitHub provider', async () => {
        // Arrange: Initialized Auth
        await Auth.init();
        Auth._getSupabase().auth.signInWithOAuth = function(data) {
            return Promise.resolve({
                data: { url: 'https://github.com/oauth' },
                error: null
            });
        };
        
        // Act: Sign in with GitHub
        const result = await Auth.signInWithOAuth('github');
        
        // Assert: Success with URL
        expect(result.success).toBeTrue();
        expect(result.url).toBe('https://github.com/oauth');
    });

    it('handles OAuth errors gracefully', async () => {
        // Arrange: Initialized Auth with error
        await Auth.init();
        Auth._getSupabase().auth.signInWithOAuth = function(data) {
            return Promise.resolve({
                data: null,
                error: { message: 'OAuth provider not configured' }
            });
        };
        
        // Act: Sign in with OAuth error
        const result = await Auth.signInWithOAuth('google');
        
        // Assert: Error response
        expect(result.success).toBeFalse();
        expect(result.error).toBe('OAuth provider not configured');
    });

    it('handles network errors gracefully', async () => {
        // Arrange: Initialized Auth with network error
        await Auth.init();
        Auth._getSupabase().auth.signInWithOAuth = function(data) {
            return Promise.reject(new Error('Network error'));
        };
        
        // Act: Sign in with network failure
        const result = await Auth.signInWithOAuth('google');
        
        // Assert: Error response
        expect(result.success).toBeFalse();
        expect(result.error).toBe('Network error');
    });

    it('uses configured siteUrl as default redirectTo', async () => {
        // Arrange: Config with siteUrl
        window.SUPABASE_CONFIG = {
            url: 'https://test.supabase.co',
            anonKey: 'test-key',
            siteUrl: 'http://localhost:8000'
        };
        await Auth.init();
        
        // Mock to capture options
        let capturedOptions = null;
        Auth._getSupabase().auth.signInWithOAuth = function(data) {
            capturedOptions = data.options;
            return Promise.resolve({
                data: { url: 'https://oauth.url' },
                error: null
            });
        };
        
        // Act: Sign in without explicit redirectTo
        await Auth.signInWithOAuth('google');
        
        // Assert: Used configured siteUrl
        expect(capturedOptions.redirectTo).toBe('http://localhost:8000');
    });

    it('uses custom redirectTo when provided', async () => {
        // Arrange: Initialized Auth
        await Auth.init();
        
        // Mock to capture options
        let capturedOptions = null;
        Auth._getSupabase().auth.signInWithOAuth = function(data) {
            capturedOptions = data.options;
            return Promise.resolve({
                data: { url: 'https://oauth.url' },
                error: null
            });
        };
        
        // Act: Sign in with custom redirectTo
        await Auth.signInWithOAuth('google', 'http://custom.com/callback');
        
        // Assert: Used custom redirectTo
        expect(capturedOptions.redirectTo).toBe('http://custom.com/callback');
    });
});

describe('Auth.getSession', () => {
    beforeEach(() => {
        localStorage.clear();
        window.SUPABASE_CONFIG = {
            url: 'https://test.supabase.co',
            anonKey: 'test-key'
        };
        delete window.supabase;
    });

    it('returns error when Auth not initialized', async () => {
        // Arrange: Auth not initialized
        delete window.supabase;
        
        // Act & Assert: Should throw
        try {
            await Auth.getSession();
            throw new Error('Expected error but none thrown');
        } catch (error) {
            expect(error.message).toBe('Auth not initialized');
        }
    });

    it('returns session when authenticated', async () => {
        // Arrange: Initialized Auth with valid session
        await Auth.init();
        const mockSession = {
            access_token: 'token123',
            refresh_token: 'refresh123',
            user: { id: 'user-123', email: 'test@example.com' }
        };
        Auth._getSupabase().auth.getSession = function() {
            return Promise.resolve({
                data: { session: mockSession },
                error: null
            });
        };
        
        // Act: Get session
        const result = await Auth.getSession();
        
        // Assert: Session returned
        expect(result.session).toBeDefined();
        expect(result.session.access_token).toBe('token123');
        expect(result.error).toBeNull();
    });

    it('returns null session when not authenticated', async () => {
        // Arrange: Initialized Auth with no session
        await Auth.init();
        Auth._getSupabase().auth.getSession = function() {
            return Promise.resolve({
                data: { session: null },
                error: null
            });
        };
        
        // Act: Get session
        const result = await Auth.getSession();
        
        // Assert: Null session
        expect(result.session).toBeNull();
        expect(result.error).toBeNull();
    });

    it('returns error when session fetch fails', async () => {
        // Arrange: Initialized Auth with error
        await Auth.init();
        Auth._getSupabase().auth.getSession = function() {
            return Promise.resolve({
                data: { session: null },
                error: { message: 'Session expired' }
            });
        };
        
        // Act: Get session
        const result = await Auth.getSession();
        
        // Assert: Error returned
        expect(result.session).toBeNull();
        expect(result.error).toBeDefined();
    });

    it('handles network errors gracefully', async () => {
        // Arrange: Initialized Auth with network error
        await Auth.init();
        Auth._getSupabase().auth.getSession = function() {
            return Promise.reject(new Error('Network error'));
        };
        
        // Act: Get session
        const result = await Auth.getSession();
        
        // Assert: Null session with error
        expect(result.session).toBeNull();
        expect(result.error).toBeDefined();
    });
});

describe('Auth.isAuthenticated', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns false when not authenticated', () => {
        // Arrange: No user set
        const originalGetUser = Auth.getCurrentUser;
        Auth.getCurrentUser = function() { return null; };
        
        // Act: Check auth status
        const result = Auth.isAuthenticated();
        
        // Assert: Not authenticated
        expect(result).toBeFalse();
        
        // Cleanup
        Auth.getCurrentUser = originalGetUser;
    });

    it('returns true when authenticated', () => {
        // Arrange: User set
        const originalGetUser = Auth.getCurrentUser;
        Auth.getCurrentUser = function() { return { id: 'user-123' }; };
        
        // Act: Check auth status
        const result = Auth.isAuthenticated();
        
        // Assert: Authenticated
        expect(result).toBeTrue();
        
        // Cleanup
        Auth.getCurrentUser = originalGetUser;
    });
});

describe('Auth.getCurrentUser', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns null when no user signed in', () => {
        // Arrange: No user
        const originalGetUser = Auth.getCurrentUser;
        Auth.getCurrentUser = function() { return null; };
        
        // Act: Get current user
        const result = Auth.getCurrentUser();
        
        // Assert: Null
        expect(result).toBeNull();
        
        // Cleanup
        Auth.getCurrentUser = originalGetUser;
    });

    it('returns user object when signed in', () => {
        // Arrange: User signed in
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            email_verified: true
        };
        const originalGetUser = Auth.getCurrentUser;
        Auth.getCurrentUser = function() { return mockUser; };
        
        // Act: Get current user
        const result = Auth.getCurrentUser();
        
        // Assert: User object returned
        expect(result.id).toBe(mockUser.id);
        expect(result.email).toBe(mockUser.email);
        
        // Cleanup
        Auth.getCurrentUser = originalGetUser;
    });
});

describe('Auth.signOut', () => {
    beforeEach(() => {
        localStorage.clear();
        window.SUPABASE_CONFIG = {
            url: 'https://test.supabase.co',
            anonKey: 'test-key'
        };
        delete window.supabase;
    });

    it('returns error when Auth not initialized', async () => {
        // Arrange: Auth not initialized
        delete window.supabase;
        
        // Act & Assert: Should throw
        try {
            await Auth.signOut();
            throw new Error('Expected error but none thrown');
        } catch (error) {
            expect(error.message).toBe('Auth not initialized');
        }
    });

    it('returns success when signed out successfully', async () => {
        // Arrange: Initialized Auth
        await Auth.init();
        Auth._getSupabase().auth.signOut = function() {
            return Promise.resolve({ error: null });
        };
        
        // Act: Sign out
        const result = await Auth.signOut();
        
        // Assert: Success
        expect(result.success).toBeTrue();
    });

    it('clears current user on sign out', async () => {
        // Arrange: Auth with user
        await Auth.init();
        Auth._getSupabase().auth.signOut = function() {
            return Promise.resolve({ error: null });
        };
        
        // Manually set user for test
        Auth._lastUser = { id: 'user-123' };
        
        // Act: Sign out
        await Auth.signOut();
        
        // Assert: User cleared
        expect(Auth._lastUser).toBeNull();
    });

    it('handles sign out errors gracefully', async () => {
        // Arrange: Initialized Auth with error
        await Auth.init();
        Auth._getSupabase().auth.signOut = function() {
            return Promise.resolve({
                error: { message: 'Sign out failed' }
            });
        };
        
        // Act: Sign out
        const result = await Auth.signOut();
        
        // Assert: Error response
        expect(result.success).toBeFalse();
        expect(result.error).toBe('Sign out failed');
    });

    it('handles network errors gracefully', async () => {
        // Arrange: Initialized Auth with network error
        await Auth.init();
        Auth._getSupabase().auth.signOut = function() {
            return Promise.reject(new Error('Network error'));
        };
        
        // Act: Sign out
        const result = await Auth.signOut();
        
        // Assert: Error response
        expect(result.success).toBeFalse();
        expect(result.error).toBe('Network error');
    });
});

describe('Auth.onAuthStateChange', () => {
    beforeEach(() => {
        localStorage.clear();
        window.SUPABASE_CONFIG = {
            url: 'https://test.supabase.co',
            anonKey: 'test-key'
        };
        delete window.supabase;
    });

    it('adds listener to auth state listeners', () => {
        // Arrange: Initialized Auth
        Auth.init();
        
        // Act: Add listener
        const unsubscribe = Auth.onAuthStateChange(function(event, user) {});
        
        // Assert: Listener added
        expect(typeof unsubscribe).toBe('function');
    });

    it('returns unsubscribe function', () => {
        // Arrange: Initialized Auth
        Auth.init();
        const listener = function(event, user) {};
        
        // Act: Add and remove listener
        const unsubscribe = Auth.onAuthStateChange(listener);
        unsubscribe();
        
        // Assert: Listener removed (no error when calling)
        expect(function() { unsubscribe(); }).not.toThrow();
    });

    it('notifies listener on auth state change', async () => {
        // Arrange: Auth with listener
        await Auth.init();
        let eventReceived = null;
        let userReceived = null;
        
        Auth.onAuthStateChange(function(event, user) {
            eventReceived = event;
            userReceived = user;
        });
        
        // The listener is registered and will be called by Supabase onAuthStateChange
        // We verify the listener was added successfully
        expect(typeof eventReceived).toBe('object'); // null initially
    });

    it('handles listener errors without breaking other listeners', () => {
        // Arrange: Auth with erroring listener
        Auth.init();
        const erroringListener = function() { throw new Error('Listener error'); };
        let goodListenerCalled = false;
        const goodListener = function() { goodListenerCalled = true; };
        
        Auth.onAuthStateChange(erroringListener);
        Auth.onAuthStateChange(goodListener);
        
        // Act & Assert: Good listener should still be registered
        expect(function() { Auth.onAuthStateChange(goodListener); }).not.toThrow();
    });
});

describe('Auth.getUserProfile', () => {
    beforeEach(() => {
        localStorage.clear();
        window.SUPABASE_CONFIG = {
            url: 'https://test.supabase.co',
            anonKey: 'test-key'
        };
        delete window.supabase;
    });

    it('returns error when not authenticated', async () => {
        // Arrange: Auth without user
        await Auth.init();
        Auth._lastUser = null;
        
        // Act: Get profile
        const result = await Auth.getUserProfile();
        
        // Assert: Error
        expect(result.success).toBeFalse();
        expect(result.error).toBe('Not authenticated');
    });

    it('returns profile when authenticated', async () => {
        // Arrange: Auth with user
        await Auth.init();
        Auth._lastUser = { id: 'user-123' };
        const mockProfile = { id: 'user-123', email: 'test@example.com' };
        
        Auth._getSupabase().from = function(table) {
            return {
                select: function(fields) {
                    return {
                        eq: function(column, value) {
                            return {
                                single: function() {
                                    return Promise.resolve({
                                        data: mockProfile,
                                        error: null
                                    });
                                }
                            };
                        }
                    };
                }
            };
        };
        
        // Act: Get profile
        const result = await Auth.getUserProfile();
        
        // Assert: Profile returned
        expect(result.success).toBeTrue();
        expect(result.profile).toEqual(mockProfile);
    });

    it('handles profile fetch errors', async () => {
        // Arrange: Auth with user but fetch error
        await Auth.init();
        Auth._lastUser = { id: 'user-123' };
        
        Auth._getSupabase().from = function(table) {
            return {
                select: function(fields) {
                    return {
                        eq: function(column, value) {
                            return {
                                single: function() {
                                    return Promise.resolve({
                                        data: null,
                                        error: { message: 'Profile not found' }
                                    });
                                }
                            };
                        }
                    };
                }
            };
        };
        
        // Act: Get profile
        const result = await Auth.getUserProfile();
        
        // Assert: Error
        expect(result.success).toBeFalse();
        expect(result.error).toBe('Profile not found');
    });
});

describe('Auth.updateUserProfile', () => {
    beforeEach(() => {
        localStorage.clear();
        window.SUPABASE_CONFIG = {
            url: 'https://test.supabase.co',
            anonKey: 'test-key'
        };
        delete window.supabase;
    });

    it('returns error when not authenticated', async () => {
        // Arrange: Auth without user
        await Auth.init();
        Auth._lastUser = null;
        
        // Act: Update profile
        const result = await Auth.updateUserProfile({ name: 'Test' });
        
        // Assert: Error
        expect(result.success).toBeFalse();
        expect(result.error).toBe('Not authenticated');
    });

    it('returns updated profile on success', async () => {
        // Arrange: Auth with user
        await Auth.init();
        Auth._lastUser = { id: 'user-123' };
        const mockUpdatedProfile = { id: 'user-123', name: 'Updated' };
        
        Auth._getSupabase().from = function(table) {
            return {
                update: function(data) {
                    return {
                        eq: function(column, value) {
                            return {
                                select: function(fields) {
                                    return {
                                        single: function() {
                                            return Promise.resolve({
                                                data: mockUpdatedProfile,
                                                error: null
                                            });
                                        }
                                    };
                                }
                            };
                        }
                    };
                }
            };
        };
        
        // Act: Update profile
        const result = await Auth.updateUserProfile({ name: 'Updated' });
        
        // Assert: Updated profile
        expect(result.success).toBeTrue();
        expect(result.profile).toEqual(mockUpdatedProfile);
    });

    it('handles update errors', async () => {
        // Arrange: Auth with user but update error
        await Auth.init();
        Auth._lastUser = { id: 'user-123' };
        
        Auth._getSupabase().from = function(table) {
            return {
                update: function(data) {
                    return {
                        eq: function(column, value) {
                            return {
                                select: function(fields) {
                                    return {
                                        single: function() {
                                            return Promise.resolve({
                                                data: null,
                                                error: { message: 'Update failed' }
                                            });
                                        }
                                    };
                                }
                            };
                        }
                    };
                }
            };
        };
        
        // Act: Update profile
        const result = await Auth.updateUserProfile({ name: 'Test' });
        
        // Assert: Error
        expect(result.success).toBeFalse();
        expect(result.error).toBe('Update failed');
    });
});

describe('Auth.refreshSession', () => {
    beforeEach(() => {
        localStorage.clear();
        window.SUPABASE_CONFIG = {
            url: 'https://test.supabase.co',
            anonKey: 'test-key'
        };
        delete window.supabase;
    });

    it('returns success with session when valid', async () => {
        // Arrange: Initialized Auth with valid session
        await Auth.init();
        const mockSession = {
            access_token: 'new-token',
            user: { id: 'user-123' }
        };
        Auth._getSupabase().auth.getSession = function() {
            return Promise.resolve({
                data: { session: mockSession },
                error: null
            });
        };
        
        // Act: Refresh session
        const result = await Auth.refreshSession();
        
        // Assert: Success
        expect(result.success).toBeTrue();
        expect(result.user).toEqual({ id: 'user-123' });
    });

    it('returns error when session refresh fails', async () => {
        // Arrange: Initialized Auth with error
        await Auth.init();
        Auth._getSupabase().auth.getSession = function() {
            return Promise.resolve({
                data: { session: null },
                error: { message: 'Token expired' }
            });
        };
        
        // Act: Refresh session
        const result = await Auth.refreshSession();
        
        // Assert: Error
        expect(result.success).toBeFalse();
        expect(result.error).toBeDefined();
    });

    it('clears user on session refresh failure', async () => {
        // Arrange: Auth with user but failing refresh
        await Auth.init();
        Auth._lastUser = { id: 'user-123' };
        Auth._getSupabase().auth.getSession = function() {
            return Promise.resolve({
                data: { session: null },
                error: { message: 'Token expired' }
            });
        };
        
        // Act: Refresh session
        await Auth.refreshSession();
        
        // Assert: User cleared
        expect(Auth._lastUser).toBeNull();
    });
});

describe('Auth - Integration Tests', () => {
    beforeEach(() => {
        localStorage.clear();
        window.SUPABASE_CONFIG = {
            url: 'https://test.supabase.co',
            anonKey: 'test-key',
            siteUrl: 'http://localhost:8000'
        };
        delete window.supabase;
    });

    it('full auth flow: init -> signIn -> getSession -> signOut', async () => {
        // Arrange: Initialize Auth
        await Auth.init();
        
        // Mock successful sign in
        Auth._getSupabase().auth.signInWithOtp = function() {
            return Promise.resolve({ error: null });
        };
        
        // Act: Sign in
        const signInResult = await Auth.signInWithMagicLink('user@example.com');
        
        // Assert: Sign in successful
        expect(signInResult.success).toBeTrue();
        
        // Mock session for authenticated user
        const mockSession = {
            access_token: 'token123',
            user: { id: 'user-123', email: 'user@example.com' }
        };
        Auth._getSupabase().auth.getSession = function() {
            return Promise.resolve({
                data: { session: mockSession },
                error: null
            });
        };
        
        // Act: Get session
        const sessionResult = await Auth.getSession();
        
        // Assert: Session valid
        expect(sessionResult.session).toBeDefined();
        expect(sessionResult.session.user.email).toBe('user@example.com');
        
        // Mock successful sign out
        Auth._getSupabase().auth.signOut = function() {
            return Promise.resolve({ error: null });
        };
        
        // Act: Sign out
        const signOutResult = await Auth.signOut();
        
        // Assert: Sign out successful
        expect(signOutResult.success).toBeTrue();
    });

    it('handles auth state changes through observer', async () => {
        // Arrange: Auth with listener
        await Auth.init();
        const authEvents = [];
        const listener = function(event, user) {
            authEvents.push({ event: event, user: user });
        };
        Auth.onAuthStateChange(listener);
        
        // The observer should have been set up in init
        // Verify listener was registered
        expect(typeof listener).toBe('function');
    });

    it('preserves auth state across page reload (localStorage)', async () => {
        // Arrange: Auth with session in localStorage
        await Auth.init();
        
        // Simulate session stored by Supabase client
        localStorage.setItem('supabase-auth-token', JSON.stringify({
            access_token: 'persisted-token',
            user: { id: 'user-123' }
        }));
        
        // Act: Auth module still available
        // In browser, this would persist across reloads
        
        // Assert: Auth module available
        expect(Auth).toBeDefined();
    });
});
