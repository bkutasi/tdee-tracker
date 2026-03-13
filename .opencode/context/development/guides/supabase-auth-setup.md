<!-- Context: development/guides/supabase-auth-setup | Priority: critical | Version: 1.0 | Updated: 2026-03-11 -->

# Guide: Supabase Auth Setup

**Purpose**: Step-by-step instructions for configuring Supabase Authentication with magic link and OAuth providers.

**Last Updated**: 2026-03-11

---

## Prerequisites

- Supabase project created (see `guides/supabase-quickstart.md`)
- Database schema applied (`supabase-schema.sql`)
- Local development environment ready

---

## Step 1: Configure Auth Settings

1. Supabase Dashboard → **Authentication** → **Providers**
2. **Email** provider should be enabled by default
3. Click **Email** → Configure:
   - **Enable Email Signup**: ✓
   - **Enable Email Confirmations**: ✓ (recommended)
   - **Secure email change**: ✓

---

## Step 2: Configure Magic Link

1. Authentication → **Providers** → **Email**
2. Set **Email Template**:
   - Template type: **Magic Link**
   - Subject: `Sign in to TDEE Tracker`
   - Redirect to: `https://tdee.kutasi.dev/auth/callback.html`

3. Customize email template (optional):
```html
<h2>Sign in to TDEE Tracker</h2>
<p>Click the link below to sign in:</p>
<a href="{{ .ConfirmationURL }}">Sign In</a>
<p>Link expires in 60 minutes.</p>
```

---

## Step 3: Enable OAuth Providers (Optional)

### Google OAuth

1. Authentication → **Providers** → **Google**
2. Enable: ✓
3. Get credentials from Google Cloud Console:
   - Go to https://console.cloud.google.com
   - Create project → Credentials → OAuth 2.0 Client ID
   - Authorized redirect URIs: `https://xyzcompany.supabase.co/auth/v1/callback`
4. Copy **Client ID** and **Client Secret** to Supabase

### GitHub OAuth

1. Authentication → **Providers** → **GitHub**
2. Enable: ✓
3. Get credentials from GitHub:
   - Go to https://github.com/settings/developers
   - New OAuth App
   - Authorization callback URL: `https://xyzcompany.supabase.co/auth/v1/callback`
4. Copy **Client ID** and **Client Secret** to Supabase

---

## Step 4: Configure Site URL

1. Authentication → **URL Configuration**
2. Set **Site URL**: `https://tdee.kutasi.dev`
3. Add **Redirect URLs**:
   - `https://tdee.kutasi.dev/auth/callback.html`
   - `http://localhost:3000/auth/callback.html` (development)
   - `http://localhost/auth/callback.html` (local file)

---

## Step 5: Update Local Config

```bash
# Ensure .env has correct values
cat .env

# Should show:
# SUPABASE_URL=https://xyzcompany.supabase.co
# SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Regenerate config if needed:
```bash
node scripts/generate-config.js
```

---

## Step 6: Test Authentication

### Test Magic Link

1. Open `index.html` in browser
2. Click **Account** button (👤)
3. Enter your email
4. Click **Send Magic Link**
5. Check email inbox (and spam folder)
6. Click the magic link
7. Should redirect back to app, logged in

### Test OAuth (if enabled)

1. Click **Account** button
2. Click **Sign in with Google** (or GitHub)
3. Complete OAuth flow
4. Should redirect back to app, logged in

---

## Step 7: Verify in Dashboard

1. Supabase Dashboard → **Authentication** → **Users**
2. Should see your user account
3. Click user → View details:
   - Email confirmed: ✓
   - Last sign in: Recent timestamp

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not received | Check spam, verify email in Supabase dashboard |
| Redirect fails | Verify redirect URL in Auth → URL Configuration |
| OAuth fails | Check callback URL in provider settings |
| Session not persisted | Verify `js/config.js` has correct credentials |

**References**:
- `js/auth.js` — Auth implementation (387 lines)
- `auth/callback.html` — Callback handler
- `SETUP_AUTH.md` — Detailed setup documentation

**Related**:
- [concepts/supabase-auth.md](../concepts/supabase-auth.md)
- [examples/magic-link-flow.md](../examples/magic-link-flow.md)
- [guides/supabase-quickstart.md](supabase-quickstart.md)
- [errors/auth-errors.md](../errors/auth-errors.md)

(End of file - total 147 lines)
