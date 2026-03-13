<!-- Context: development/lookup/auth-configuration | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Lookup: Auth Configuration Reference

**Purpose**: Quick reference for Supabase Auth configuration values.

**Last Updated**: 2026-03-11

---

## Environment Variables

| Variable | Example |
|----------|---------|
| `SUPABASE_URL` | `https://xyzcompany.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_KEY` | (Server only!) |

⚠️ **Never expose `SUPABASE_SERVICE_KEY` in client code!**

---

## Auth Provider Settings

**Email**: Auth → Providers → Email
- Enable Email Signup: `true`
- Enable Email Confirmations: `true`
- Secure Email Change: `true`

**OAuth**: Auth → Providers → Google/GitHub
- Callback URL: `https://xyzcompany.supabase.co/auth/v1/callback`

---

## URL Configuration

| Setting | Production | Development |
|---------|------------|-------------|
| Site URL | `https://tdee.kutasi.dev` | `http://localhost:3000` |
| Redirect URL | `/auth/callback.html` | `/auth/callback.html` |

---

## Session Settings

| Setting | Default |
|---------|---------|
| Session Expiry | 604800 (7 days) |
| Auto Refresh | `true` |
| PKCE Flow | `true` |

---

## RLS Policies

**profiles**: `auth.uid() = id` (SELECT, UPDATE)

**weight_entries**: `auth.uid() = user_id` (SELECT, INSERT, UPDATE, DELETE)

---

## JWT Claims

```javascript
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "exp": 1710345600,
  "role": "authenticated"
}
```

---

## Config File

```javascript
// js/config.js (generated)
window.SUPABASE_CONFIG = {
    url: 'https://xyzcompany.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIs...'
};
```

**Generate**: `node scripts/generate-config.js`

---

## Quick Checks

```bash
cat js/config.js
echo $SUPABASE_URL
curl -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/"
```

**References**:
- `js/config.js` — Generated configuration
- `js/auth.js` — Auth implementation

**Related**:
- [concepts/supabase-auth.md](../concepts/supabase-auth.md)
- [guides/supabase-auth-setup.md](../guides/supabase-auth-setup.md)
- [lookup/deployment-config.md](deployment-config.md)

(End of file - total 96 lines)
