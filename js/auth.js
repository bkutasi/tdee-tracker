/**
 * Authentication Module - Supabase Integration
 * 
 * Handles user authentication with Supabase Auth (magic link, OAuth, etc.)
 * Manages session state and provides auth state observers
 * 
 * Usage:
 *   await Auth.init();
 *   await Auth.signInWithMagicLink('user@example.com');
 *   await Auth.signOut();
 *   const user = Auth.getCurrentUser();
 */

'use strict';

const Auth = (function() {
    // Private state
    let supabase = null;
    let currentUser = null;
    let authStateListeners = [];
    let isInitialized = false;

    /**
     * Initialize Supabase client
     * Must be called before any other Auth methods
     */
    async function init() {
        if (isInitialized) {
            return;
        }

        // Check for config
        if (!window.SUPABASE_CONFIG) {
            throw new Error(AppErrors.AUTH.SUPABASE_CONFIG_MISSING);
        }

        const { url, anonKey } = window.SUPABASE_CONFIG;

        // Load Supabase client from CDN
        if (!window.supabase) {
            await loadSupabaseClient();
        }

        // Create client instance
        supabase = window.supabase.createClient(url, anonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                storage: window.localStorage,
                storageKey: 'supabase-auth-token',
                flowType: 'pkce'
            }
        });

        // Set up auth state observer
        setupAuthStateObserver();

        // Check for existing session
        await refreshSession();

        isInitialized = true;
    }

    /**
     * Load Supabase client from CDN (pinned version)
     */
    function loadSupabaseClient() {
        return new Promise((resolve, reject) => {
            if (window.supabase) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            // Pinned version for security - update manually when needed
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.0/dist/umd/supabase.min.js';
            script.integrity = 'sha384-fm42zLXjam4N3lT5umWgNtBBPMP3Ddrdmr9lnPKtDWzs5Dqy457Yn6+eTvCgRU3n';
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load Supabase client'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Set up auth state change observer
     */
    function setupAuthStateObserver() {
        supabase.auth.onAuthStateChange((event, session) => {
            currentUser = session?.user || null;
            
            // Also expose last user for modules that check before initialization completes
            if (authAPI && authAPI._lastUser !== undefined) {
                authAPI._lastUser = currentUser;
            }
            
            // Notify all listeners
            authStateListeners.forEach(listener => {
                try {
                    listener(event, currentUser);
                } catch (error) {
                    // Listener error - silently continue to not break other listeners
                }
            });

            // Persist auth state to UI
            if (event === 'SIGNED_OUT') {
                currentUser = null;
                if (authAPI && authAPI._lastUser !== undefined) {
                    authAPI._lastUser = null;
                }
            }
        });
    }

    /**
     * Refresh current session
     */
    async function refreshSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                currentUser = null;
                return { success: false, error };
            }

            currentUser = session?.user || null;
            return { success: true, user: currentUser, session };
        } catch (error) {
            currentUser = null;
            return { success: false, error };
        }
    }

    /**
     * Sign in with magic link (passwordless)
     * @param {string} email - User's email address
     * @param {string} redirectTo - URL to redirect after verification
     * @returns {Promise<{success: boolean, error?: object}>}
     */
    async function signInWithMagicLink(email, redirectTo) {
        if (!supabase) {
            throw new Error(AppErrors.AUTH.NOT_INITIALIZED);
        }

        // Use configured siteUrl if redirectTo not provided
        const finalRedirectTo = redirectTo || window.SUPABASE_CONFIG?.siteUrl || window.location.origin;

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: email.toLowerCase().trim(),
                options: {
                    emailRedirectTo: finalRedirectTo
                }
            });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, message: 'Magic link sent! Check your email.' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign in with OAuth provider
     * @param {string} provider - OAuth provider ('google', 'github', etc.)
     * @param {string} redirectTo - URL to redirect after authentication
     * @returns {Promise<{success: boolean, url?: string, error?: object}>}
     */
    async function signInWithOAuth(provider, redirectTo) {
        if (!supabase) {
            throw new Error(AppErrors.AUTH.NOT_INITIALIZED);
        }

        // Use configured siteUrl if redirectTo not provided
        const finalRedirectTo = redirectTo || window.SUPABASE_CONFIG?.siteUrl || window.location.origin;

        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: finalRedirectTo
                }
            });

            if (error) {
                return { success: false, error: error.message };
            }

            // Redirect user to OAuth provider
            if (data?.url) {
                window.location.href = data.url;
            }

            return { success: true, url: data.url };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign out current user
     * @returns {Promise<{success: boolean, error?: object}>}
     */
    async function signOut() {
        if (!supabase) {
            throw new Error(AppErrors.AUTH.NOT_INITIALIZED);
        }

        try {
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                return { success: false, error: error.message };
            }

            currentUser = null;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current user
     * @returns {object|null} Current user object or null
     */
    function getCurrentUser() {
        return currentUser;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    function isAuthenticated() {
        return currentUser !== null;
    }

    /**
     * Get current session
     * @returns {Promise<{session: object|null, error?: object}>}
     */
    async function getSession() {
        if (!supabase) {
            throw new Error(AppErrors.AUTH.NOT_INITIALIZED);
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            return { session: null, error };
        }

        return { session, error: null };
    }

    /**
     * Add auth state change listener
     * @param {function} listener - Callback function(event, user)
     * @returns {function} Unsubscribe function
     */
    function onAuthStateChange(listener) {
        authStateListeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            authStateListeners = authStateListeners.filter(l => l !== listener);
        };
    }

    /**
     * Get user profile from database
     * @returns {Promise<{success: boolean, profile?: object, error?: object}>}
     */
    async function getUserProfile() {
        if (!supabase || !currentUser) {
            return { success: false, error: new Error('Not authenticated') };
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, profile: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Update user profile
     * @param {object} updates - Profile fields to update
     * @returns {Promise<{success: boolean, profile?: object, error?: object}>}
     */
    async function updateUserProfile(updates) {
        if (!supabase || !currentUser) {
            return { success: false, error: new Error('Not authenticated') };
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentUser.id)
                .select()
                .single();

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, profile: data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Public API - attach _lastUser to the returned object
    const authAPI = {
        init,
        signInWithMagicLink,
        signInWithOAuth,
        signOut,
        getCurrentUser,
        isAuthenticated,
        getSession,
        onAuthStateChange,
        getUserProfile,
        updateUserProfile,
        _getSupabase: () => supabase,  // Expose Supabase client for Sync module
        _lastUser: null  // Track last known user for cross-module access
    };
    
    return authAPI;
})();

// Expose to global scope for cross-module access (browser only)
if (typeof window !== 'undefined') {
    window.Auth = Auth;
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
