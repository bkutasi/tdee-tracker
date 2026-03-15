<!-- Context: development/lookup/deployment-config | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Lookup: Deployment Configuration Reference

**Purpose**: Quick reference for deployment settings (Cloudflare Pages, GitHub Actions).

**Last Updated**: 2026-03-11

---

## Cloudflare Pages

| Setting | Value |
|---------|-------|
| Build command | (empty) |
| Build output directory | `/` |
| Production branch | `main` |

**Environment Variables**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

---

## GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          projectName: tdee-tracker
```

**Required Secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

---

## Wrangler CLI

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy . --project-name=tdee-tracker
```

---

## Cache Version Management

### ⚠️ CRITICAL: Before Each Deployment

**You MUST increment the cache version before deploying, or users will not receive updates.**

**Why:** The service worker uses versioned cache names (`tdee-tracker-v{VERSION}`). Without incrementing, browsers serve stale cached assets.

**Configuration Files:**
| File | Constant | Line | Purpose |
|------|----------|------|---------|
| `sw.js` | `CACHE_VERSION` | 6 | Service worker cache version |
| `js/version.js` | `APP_VERSION` | 10 | App version for UI display |

**Cache Naming Strategy:**
```javascript
// sw.js
const CACHE_VERSION = '1.0.0';
const CACHE_NAME = `tdee-tracker-v${CACHE_VERSION}`;
// Results in: 'tdee-tracker-v1.0.0'
```

### Pre-Deployment Steps

**MANDATORY:** Increment version before each deployment:

1. Edit `sw.js`: Change `CACHE_VERSION` (line 6)
2. Edit `js/version.js`: Change `APP_VERSION` (line 10)
3. Verify both match: `grep -r "VERSION = " sw.js js/version.js`
4. Commit and deploy

**Example:**
```bash
# Before: const CACHE_VERSION = '1.0.0';
# After:  const CACHE_VERSION = '1.0.1';

git add sw.js js/version.js
git commit -m "chore: bump version to 1.0.1"
wrangler pages deploy . --project-name=tdee-tracker
```

### Version Update Effects

When version is incremented:
- ✅ New service worker installs with new cache name
- ✅ Old cache automatically purged on activation
- ✅ Users see "Update available" notification
- ✅ Version badge in footer updates
- ✅ No manual cache clearing needed by users

### Automatic Update Detection

The `VersionManager` module (`js/version.js`) handles:
- Checking for service worker updates on page load
- Showing update notification toast
- Managing version badge in footer
- Handling user refresh/defer actions

### Common Mistakes

❌ **Forgetting to increment version**
- Result: Users stuck on old cached version
- Fix: Always increment before deploy

❌ **Updating only one file**
- Result: Version mismatch between SW and UI
- Fix: Update BOTH sw.js and js/version.js

❌ **Using different versions**
- Result: Confusing user experience
- Fix: Keep versions in sync

### Related Files
- `sw.js` - Service worker with cache configuration
- `js/version.js` - VersionManager module
- `VERSIONING.md` - Complete versioning documentation
- `js/ui/components.js` - Footer rendering

---

## Supabase Configuration

**CORS**: Settings → API → Add origins:
- `https://tdee.kutasi.dev`
- `http://localhost:*` (development)

**Auth Redirect URLs**: Authentication → URL Configuration:
- `https://tdee.kutasi.dev/auth/callback.html`
- `http://localhost/auth/callback.html`

---

## File Checklist

**Required**: `index.html`, `js/app.js`, `js/auth.js`, `js/sync.js`, `css/styles.css`, `sw.js`, `manifest.json`, `auth/callback.html`

**Excluded** (.gitignore): `js/config.js`, `.env`, `node_modules/`, `.tmp/`

---

## Post-Deploy Verification

- [ ] Site loads: `https://tdee.kutasi.dev`
- [ ] No console errors
- [ ] Magic link auth works
- [ ] Data syncs to Supabase
- [ ] PWA installs correctly

**Debug**:
```javascript
console.log('Config:', window.SUPABASE_CONFIG);
console.log('Auth:', Auth.isAuthenticated());
console.log('Sync:', Sync.getStatus());
```

---

## Rollback

**Cloudflare Pages**: Dashboard → Pages → Project → Deployments → Rollback

**GitHub**: `git revert HEAD && git push`

**References**:
- `guides/cloudflare-pages-deployment.md` — Full deployment guide
- `lookup/auth-configuration.md` — Auth settings

**Related**:
- [guides/cloudflare-pages-deployment.md](../guides/cloudflare-pages-deployment.md)
- [errors/deployment-errors.md](../errors/deployment-errors.md)
- [lookup/auth-configuration.md](auth-configuration.md)

(End of file - total 95 lines)
