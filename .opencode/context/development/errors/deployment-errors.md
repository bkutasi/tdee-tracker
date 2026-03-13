<!-- Context: development/errors/deployment-errors | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Error: Common Deployment Issues

**Purpose**: Troubleshoot deployment failures on Cloudflare Pages, GitHub Actions.

**Last Updated**: 2026-03-11

---

## Build Fails: "Command not found"

**Error**: `sh: 1: npm: not found`

**Cause**: Build command references unavailable tools

**Solution**: TDEE Tracker needs NO build command (vanilla JS PWA)
- Cloudflare Pages: Build command (empty), Output directory `/`

---

## 404 Errors After Deploy

**Causes**: Wrong output directory, missing files, incorrect base path

**Solutions**:
```bash
git status
git ls-files | grep -E '\.(html|css|js)$'
```

**File Checklist**: `index.html`, `js/`, `css/styles.css`, `sw.js`, `manifest.json`

---

## Environment Variables Not Working

**Error**: `Supabase configuration not found`

**Cloudflare Pages**: Settings → Environment variables → Add to **Production**:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

**GitHub Actions**:
```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

**Verify**: Browser console → `console.log(window.SUPABASE_CONFIG)`

---

## CORS Errors

**Error**: `Access to fetch...blocked by CORS policy`

**Solution**: Supabase Dashboard → Settings → API → CORS → Add domain:
- `https://tdee.kutasi.dev`
- `https://*.kutasi.dev` (wildcard)

---

## Service Worker Not Registering

**Causes**: `sw.js` not in root, HTTPS required, MIME type incorrect

**Solution**:
```javascript
navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW registered:', reg.scope));
```

**Verify**: DevTools → Application → Service Workers → "Activated and is running"

---

## Auth Redirect Fails

**Causes**: Redirect URL not configured, callback handler missing, Site URL mismatch

**Solution**: Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://tdee.kutasi.dev`
- **Redirect URLs**: `https://tdee.kutasi.dev/auth/callback.html`

---

## Git Push Fails

**Error**: `rejected because the remote contains work that you do not have`

**Solution**:
```bash
git fetch origin
git merge origin/main
git push origin main
```

---

## Deployment Checklist

- [ ] All tests pass: `node tests/node-test.js`
- [ ] No `console.log` in production code
- [ ] `js/config.js` NOT committed
- [ ] Environment variables set
- [ ] Supabase CORS configured
- [ ] Auth redirect URLs configured
- [ ] Service worker path correct

**References**:
- `.github/workflows/` — GitHub Actions
- `guides/cloudflare-pages-deployment.md` — Deployment guide

**Related**:
- [guides/cloudflare-pages-deployment.md](../guides/cloudflare-pages-deployment.md)
- [lookup/deployment-config.md](../lookup/deployment-config.md)
- [errors/auth-errors.md](auth-errors.md)

(End of file - total 113 lines)
