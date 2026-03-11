<!-- Context: development/concepts/jwt-session | Priority: high | Version: 1.0 | Updated: 2026-03-02 -->

# Concept: JWT Session Management

**Purpose**: Automatic session persistence, refresh, and multi-tab synchronization for seamless auth experience.

**Last Updated**: 2026-03-02

---

## Core Idea

JWT sessions are automatically persisted in LocalStorage, refresh before expiration, and sync across browser tabs using BroadcastChannel—providing seamless auth without manual re-login.

## Key Points

- **Auto-Refresh**: Tokens refresh automatically before expiration (no user action needed)
- **LocalStorage Persistence**: Session survives page refresh and browser restart
- **Multi-Tab Sync**: BroadcastChannel broadcasts auth changes across all open tabs
- **Secure Storage**: JWT stored in LocalStorage (not cookies) to avoid CSRF attacks
- **Logout Everywhere**: Clearing session removes auth from all tabs instantly

## Session Lifecycle

```
1. User signs in → Supabase returns JWT + refresh token
2. Store in LocalStorage → Survives page refresh
3. Auto-refresh → Refresh token exchanged before JWT expires
4. Multi-tab sync → BroadcastChannel notifies other tabs
5. Logout → Clear LocalStorage, notify all tabs
```

## Quick Example

```javascript
// Session auto-managed by Auth module
await Auth.init(); // Sets up auto-refresh + multi-tab sync

// Check current session
if (Auth.isAuthenticated()) {
    const user = Auth.getCurrentUser();
    console.log('Session for:', user.email);
}

// Manual logout (clears all tabs)
await Auth.signOut();
```

## Multi-Tab Sync

```javascript
// BroadcastChannel syncs auth state across tabs
const channel = new BroadcastChannel('supabase-auth');
channel.onmessage = (event) => {
    if (event.data.type === 'SIGNED_OUT') {
        // Clear local session
        localStorage.removeItem('supabase.auth.token');
    }
};
```

**References**:
- `js/auth.js` — Session management, auto-refresh, multi-tab sync (387 lines)
- `js/sync.js` — Sync queue triggered by auth state changes

**Related**:
- [concepts/supabase-auth.md](supabase-auth.md)
- [concepts/offline-first-sync.md](offline-first-sync.md)
- [examples/supabase-schema.md](../examples/supabase-schema.md)

(End of file - total 57 lines)
