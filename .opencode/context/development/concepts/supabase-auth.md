<!-- Context: development/concepts/supabase-auth | Priority: critical | Version: 1.0 | Updated: 2026-03-02 -->

# Concept: Supabase Auth Architecture

**Purpose**: Passwordless authentication and cross-device sync for TDEE Tracker using Supabase free tier.

**Last Updated**: 2026-03-02

---

## Core Idea

Supabase Auth provides magic link authentication (no passwords) with automatic session management. Combined with Row Level Security (RLS), it ensures users can only access their own data while enabling seamless cross-device synchronization.

## Key Points

- **Magic Link Auth**: Users sign in via email link—no passwords to manage or steal
- **Row Level Security**: Database policies enforce per-user data access at the database level
- **Offline-First**: LocalStorage stores data immediately, syncs to Supabase when online
- **Free Tier**: 50K users/month, 500MB database, unlimited API requests—$0 for personal use
- **JWT Sessions**: Auto-refresh tokens, persisted in LocalStorage, sync across browser tabs

## Architecture Flow

```
User Browser → Auth Module → Supabase Auth → JWT Session
     ↓
LocalStorage (immediate) → Sync Queue → Supabase Database (background)
     ↓
RLS Policies → User can ONLY see own data
```

## Quick Example

```javascript
// Initialize auth
await Auth.init();

// Sign in with magic link
const result = await Auth.signInWithMagicLink('user@example.com');

// Check auth state
if (Auth.isAuthenticated()) {
    const user = Auth.getCurrentUser();
    console.log('Logged in as:', user.email);
}
```

**References**:
- `js/auth.js` — Supabase auth wrapper (387 lines)
- `js/sync.js` — Offline-first sync (1050 lines)
- `js/ui/auth-modal.js` — Login/logout UI
- `supabase-schema.sql` — Database schema with RLS

**Related**:
- [concepts/offline-first-sync.md](offline-first-sync.md)
- [concepts/jwt-session.md](jwt-session.md)
- [examples/supabase-schema.md](../examples/supabase-schema.md)
- [guides/supabase-quickstart.md](../guides/supabase-quickstart.md)
- [errors/auth-errors.md](../errors/auth-errors.md)

(End of file - total 48 lines)
