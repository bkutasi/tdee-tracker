<!-- Context: development/guides/cloudflare-pages-deployment | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Guide: Cloudflare Pages Deployment

**Purpose**: Deploy TDEE Tracker to Cloudflare Pages with automatic builds and Supabase integration.

**Last Updated**: 2026-03-11

---

## Prerequisites

- Cloudflare account (free tier)
- GitHub repository with TDEE Tracker code
- Supabase credentials ready

---

## Step 1: Connect GitHub Repository

1. Go to https://pages.cloudflare.com
2. Click **Create a project**
3. Click **Connect to Git**
4. Select **TDEE Tracker repository**
5. Click **Begin setup**

---

## Step 2: Configure Build Settings

### Build Configuration

| Setting | Value |
|---------|-------|
| **Production branch** | `main` (or `master`) |
| **Build command** | Leave empty (no build step) |
| **Build output directory** | `/` (root) |

### Why No Build Command?

TDEE Tracker is a vanilla JS PWA with zero npm dependencies. Files are served directly without bundling.

---

## Step 3: Set Environment Variables

In Cloudflare Pages dashboard → **Settings** → **Environment variables**:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://xyzcompany.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

⚠️ **Important**: Use **Production** environment, not Preview

---

## Step 4: Configure Custom Domain (Optional)

1. Cloudflare Pages → Project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter domain: `tdee.kutasi.dev`
4. Cloudflare automatically configures DNS
5. Wait for SSL certificate (~5 minutes)

---

## Step 5: Deploy

### Manual Deploy

```bash
# Push to main branch
git add .
git commit -m "Update for deployment"
git push origin main
```

Cloudflare Pages automatically deploys on push.

### Deploy via Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
wrangler pages deploy . --project-name=tdee-tracker
```

---

## Step 6: Verify Deployment

1. Cloudflare Pages → Project → **Deployments**
2. Click latest deployment
3. Check **Build log** for errors
4. Visit production URL

### Verification Checklist

- [ ] Site loads without errors
- [ ] Magic link auth works
- [ ] Data syncs to Supabase
- [ ] PWA installs correctly
- [ ] Offline mode works

---

## Step 7: Configure Redirects

Create `_redirects` file in root:

```
# _redirects
/auth/callback.html    /auth/callback.html    200
/api/*                 https://xyzcompany.supabase.co/rest/v1/:splat    200
```

---

## Step 8: Enable Preview Deployments

For pull request previews:

1. Cloudflare Pages → Project → **Settings**
2. **Build & deployments** → **Preview deployments**
3. Enable **Preview deployments**
4. Each PR gets a unique preview URL

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check build logs, verify no build command needed |
| 404 errors | Verify build output directory is `/` |
| Auth fails | Check environment variables in Production |
| CORS errors | Configure Supabase CORS settings |
| PWA doesn't install | Verify `sw.js` and `manifest.json` present |

## Cloudflare vs GitHub Actions

| Feature | Cloudflare Pages | GitHub Actions |
|---------|-----------------|----------------|
| **Build time** | ~30 seconds | ~2 minutes |
| **CDN** | Global (automatic) | Manual setup |
| **Preview URLs** | Automatic | Manual |
| **Custom domains** | Free SSL | Manual DNS |
| **Environment vars** | Built-in | Secrets |

**References**:
- `wrangler.toml` — Wrangler configuration (if using CLI)
- `_redirects` — Cloudflare Pages redirects
- `sw.js` — Service worker for PWA

**Related**:
- [guides/pre-commit-setup.md](pre-commit-setup.md)
- [lookup/deployment-config.md](../lookup/deployment-config.md)
- [errors/deployment-errors.md](../errors/deployment-errors.md)

(End of file - total 142 lines)
