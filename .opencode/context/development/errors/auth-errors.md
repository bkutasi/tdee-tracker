<!-- Context: development/errors/auth-errors | Priority: high | Version: 1.0 | Updated: 2026-03-02 -->

# Error: Common Auth Issues & Solutions

**Purpose**: Quick reference for troubleshooting authentication and sync problems.

**Last Updated**: 2026-03-02

---

## Config Not Found

**Error**: `Supabase configuration not found`

**Cause**: `js/config.js` missing or not generated

**Solution**:
```bash
node scripts/generate-config.js
```

**Verify**:
```bash
cat js/config.js
# Should show: window.SUPABASE_CONFIG = { url: '...', anonKey: '...' }
```

---

## Magic Link Email Not Arriving

**Error**: No email received after clicking "Send Magic Link"

**Causes**:
1. Email in spam folder
2. Email not verified in Supabase
3. Typo in email address

**Solutions**:
1. Check spam/junk folder
2. Supabase dashboard → Authentication → Users → Verify email
3. Re-enter email carefully

**Debug**:
```javascript
// Check if email sent (browser console)
console.log('Auth state:', Auth.isAuthenticated());
```

---

## Not Authenticated Errors

**Error**: `Not authenticated` or `Invalid session`

**Causes**:
1. Session expired
2. RLS policies not enabled
3. Config credentials incorrect

**Solutions**:
1. Sign out → Sign back in
2. Supabase SQL Editor → Verify RLS policies enabled (see schema)
3. Regenerate config: `node scripts/generate-config.js`

**Debug**:
```javascript
// Check auth state
console.log('User:', Auth.getCurrentUser());
console.log('Authenticated:', Auth.isAuthenticated());
```

---

## Data Not Syncing

**Error**: Entries saved locally but not in Supabase

**Causes**:
1. Not logged in
2. Network error
3. RLS policy blocking write

**Solutions**:
1. Verify logged in: Check Account button shows email
2. Check browser console for `[Sync]` logs
3. Verify RLS policies allow INSERT (see schema example)

**Debug**:
```javascript
// Check sync status
console.log('Sync status:', Sync.getStatus());

// Force sync
await Sync.syncAll();

// Check queue
console.log('Pending operations:', Sync.getQueue());
```

---

## GitHub Deploy Fails

**Error**: GitHub Actions deploy step fails

**Causes**:
1. Secrets not set
2. Secrets have wrong names
3. `js/config.js` committed to git

**Solutions**:
1. GitHub → Settings → Secrets → Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. Ensure exact names (case-sensitive)
3. Verify `.gitignore` includes `js/config.js`

**Debug**:
1. GitHub Actions → Click failed job → View logs
2. Look for: "Generating config from secrets"
3. Verify secrets injected correctly

---

## Sync Queue Stuck

**Error**: Operations queued but never sync

**Causes**:
1. Offline mode
2. Retry limit exceeded
3. Auth token expired

**Solutions**:
1. Check internet connection
2. Refresh page (retriggers sync)
3. Sign out → Sign back in (refreshes token)

**Debug**:
```javascript
// Check queue length
const status = Sync.getStatus();
console.log('Queue:', status.queueLength, 'Retries:', status.totalRetries);

// Clear queue (last resort)
localStorage.removeItem('sync-queue');
```

---

## Production vs Local Mismatch

**Error**: Works locally but not in production

**Causes**:
1. Different credentials
2. Production secrets not set
3. CORS issues

**Solutions**:
1. Verify production uses same Supabase project
2. GitHub secrets must match local `.env`
3. Supabase dashboard → API → Ensure anon key is correct

**Debug**:
1. Production URL → Open console
2. Check for CORS errors
3. Verify config matches local: `window.SUPABASE_CONFIG`

---

**References**:
- `SETUP_AUTH.md` — Complete troubleshooting section (lines 151-185)
- `js/auth.js` — Auth error handling
- `js/sync.js` — Sync error handling with retry logic

**Related**:
- [concepts/supabase-auth.md](../concepts/supabase-auth.md)
- [guides/supabase-quickstart.md](../guides/supabase-quickstart.md)
- [examples/supabase-schema.md](../examples/supabase-schema.md)

(End of file - total 142 lines)
