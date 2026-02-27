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
            console.log('[Auth] Already initialized');
            return;
        }

        // Check for config
        if (!window.SUPABASE_CONFIG) {
            console.error('[Auth] Missing Supabase config. Run: node scripts/generate-config.js');
            throw new Error('Supabase configuration not found');
        }

        const { url, anonKey } = window.SUPABASE_CONFIG;

        // Load Supabase client from CDN
        if (!window.supabase) {
            console.log('[Auth] Loading Supabase client...');
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
        console.log('[Auth] Initialized successfully');
    }

    /**
     * Load Supabase client from CDN
     */
    function loadSupabaseClient() {
        return new Promise((resolve, reject) => {
            if (window.supabase) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
            script.onload = () => {
                console.log('[Auth] Supabase client loaded');
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
            console.log('[Auth] State change:', event);
            
            currentUser = session?.user || null;
            
            // Notify all listeners
            authStateListeners.forEach(listener => {
                try {
                    listener(event, currentUser);
                } catch (error) {
                    console.error('[Auth] Listener error:', error);
                }
            });

            // Persist auth state to UI
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                console.log('[Auth] User signed in:', currentUser?.email);
            } else if (event === 'SIGNED_OUT') {
                console.log('[Auth] User signed out');
                currentUser = null;
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
                console.error('[Auth] Session refresh error:', error);
                currentUser = null;
                return { success: false, error };
            }

            currentUser = session?.user || null;
            return { success: true, user: currentUser, session };
        } catch (error) {
            console.error('[Auth] Session refresh failed:', error);
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
    async function signInWithMagicLink(email, redirectTo = window.location.origin) {
        if (!supabase) {
            throw new Error('Auth not initialized. Call Auth.init() first');
        }

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: email.toLowerCase().trim(),
                options: {
                    emailRedirectTo: redirectTo
                }
            });

            if (error) {
                console.error('[Auth] Magic link error:', error);
                return { success: false, error: error.message };
            }

            console.log('[Auth] Magic link sent to:', email);
            return { success: true, message: 'Magic link sent! Check your email.' };
        } catch (error) {
            console.error('[Auth] Magic link failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign in with OAuth provider
     * @param {string} provider - OAuth provider ('google', 'github', etc.)
     * @param {string} redirectTo - URL to redirect after authentication
     * @returns {Promise<{success: boolean, url?: string, error?: object}>}
     */
    async function signInWithOAuth(provider, redirectTo = window.location.origin) {
        if (!supabase) {
            throw new Error('Auth not initialized. Call Auth.init() first');
        }

        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: redirectTo
                }
            });

            if (error) {
                console.error('[Auth] OAuth error:', error);
                return { success: false, error: error.message };
            }

            // Redirect user to OAuth provider
            if (data?.url) {
                window.location.href = data.url;
            }

            return { success: true, url: data.url };
        } catch (error) {
            console.error('[Auth] OAuth failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign out current user
     * @returns {Promise<{success: boolean, error?: object}>}
     */
    async function signOut() {
        if (!supabase) {
            throw new Error('Auth not initialized');
        }

        try {
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('[Auth] Sign out error:', error);
                return { success: false, error: error.message };
            }

            currentUser = null;
            console.log('[Auth] User signed out');
            return { success: true };
        } catch (error) {
            console.error('[Auth] Sign out failed:', error);
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
            throw new Error('Auth not initialized');
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
                console.error('[Auth] Profile fetch error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, profile: data };
        } catch (error) {
            console.error('[Auth] Profile fetch failed:', error);
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
                console.error('[Auth] Profile update error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, profile: data };
        } catch (error) {
            console.error('[Auth] Profile update failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Public API
    return {
        init,
        signInWithMagicLink,
        signInWithOAuth,
        signOut,
        getCurrentUser,
        isAuthenticated,
        getSession,
        onAuthStateChange,
        getUserProfile,
        updateUserProfile
    };
})();

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
