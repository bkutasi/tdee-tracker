<!-- Context: development/examples/magic-link-flow | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Example: Magic Link Authentication Flow

**Purpose**: Complete code example showing magic link authentication from request to session establishment.

**Last Updated**: 2026-03-11

---

## Flow Overview

```
1. User enters email
2. Client calls Supabase auth API
3. Supabase sends email with magic link
4. User clicks link (redirects back to app)
5. Supabase sets JWT session
6. Client retrieves session, updates UI
```

## Implementation Example

### Step 1: Sign In Request

```javascript
// js/auth.js
async function signInWithMagicLink(email) {
    const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
            emailRedirectTo: `${window.location.origin}/auth/callback.html`
        }
    });
    
    if (error) {
        console.error('[Auth] Magic link error:', error);
        throw error;
    }
    
    console.log('[Auth] Magic link sent to:', email);
    return { success: true, email };
}
```

### Step 2: Handle Callback

```javascript
// auth/callback.html
<script>
(async function handleCallback() {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    
    // Supabase sets access_token in hash
    const accessToken = params.get('access_token');
    
    if (accessToken) {
        // Session automatically restored by Supabase client
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
            // Store user info
            localStorage.setItem('user-email', session.user.email);
            
            // Redirect to app
            window.location.href = '/index.html';
        }
    }
})();
</script>
```

### Step 3: Session Management

```javascript
// js/auth.js
class Auth {
    constructor() {
        this.session = null;
        this.user = null;
        
        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
            this.session = session;
            this.user = session?.user ?? null;
            
            // Broadcast to other tabs
            this.broadcastAuthState(session);
        });
    }
    
    isAuthenticated() {
        return this.session !== null;
    }
    
    getCurrentUser() {
        return this.user;
    }
    
    getToken() {
        return this.session?.access_token ?? null;
    }
    
    async signOut() {
        await supabase.auth.signOut();
        this.session = null;
        this.user = null;
        localStorage.removeItem('user-email');
    }
}
```

### Step 4: UI Integration

```javascript
// js/ui/auth-modal.js
async function handleLoginSubmit(email) {
    try {
        showLoading('Sending magic link...');
        
        const result = await Auth.signInWithMagicLink(email);
        
        showMessage(`Magic link sent to ${result.email}! Check your inbox.`);
        hideModal();
        
    } catch (error) {
        showError('Failed to send magic link. Please try again.');
        console.error('[Auth Modal] Error:', error);
    }
}

// Update UI based on auth state
function updateAuthUI() {
    const user = Auth.getCurrentUser();
    
    if (user) {
        document.getElementById('auth-button').textContent = user.email;
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('user-info').style.display = 'block';
    } else {
        document.getElementById('auth-button').textContent = 'Account';
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('user-info').style.display = 'none';
    }
}
```

## Complete Flow Diagram

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────┐
│  User   │     │   App    │     │ Supabase │     │  Email   │     │ App  │
└────┬────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └──┬───┘
     │               │                │                │              │
     │ Enter email   │                │                │              │
     │──────────────>│                │                │              │
     │               │                │                │              │
     │               │ signInWithOtp  │                │              │
     │               │───────────────>│                │              │
     │               │                │                │              │
     │               │                │ Send email     │              │
     │               │                │───────────────>│              │
     │               │ OK             │                │              │
     │               │<───────────────│                │              │
     │               │                │                │              │
     │ Check email   │                │                │              │
     │<────────────────────────────────────────────────│              │
     │               │                │                │              │
     │ Click link    │                │                │              │
     │──────────────────────────────────────────────────────────────>│
     │               │                │                │              │
     │               │ Redirect with  │                │              │
     │               │ access_token   │                │              │
     │               │<──────────────────────────────────────────────│
     │               │                │                │              │
     │               │ getSession()   │                │              │
     │               │───────────────>│                │              │
     │               │                │                │              │
     │               │ Session data   │                │              │
     │               │<───────────────│                │              │
     │               │                │                │              │
     │               │ Update UI      │                │              │
     │ Logged in!    │                │                │              │
     │<──────────────│                │                │              │
```

**References**:
- `js/auth.js` — Complete auth implementation (387 lines)
- `js/ui/auth-modal.js` — Login UI component
- `auth/callback.html` — Magic link callback handler

**Related**:
- [concepts/supabase-auth.md](../concepts/supabase-auth.md)
- [guides/supabase-auth-setup.md](../guides/supabase-auth-setup.md)
- [errors/auth-errors.md](../errors/auth-errors.md)

(End of file - total 147 lines)
