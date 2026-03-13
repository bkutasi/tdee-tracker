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
