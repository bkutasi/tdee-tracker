# TDEE Tracker — Deployment Guide

> Deploy to Cloudflare Pages with automated testing and Git-based CI/CD

## 1. Overview

**What**: TDEE Tracker is a vanilla JavaScript PWA (Progressive Web App) for tracking daily calorie intake and TDEE calculations.

**Where**: Deployed to Cloudflare Pages — a global CDN optimized for static sites.

**How**: GitHub Actions workflow with test gating ensures only passing tests deploy to production.

**Key Features**:
- ✅ Automatic deployment on push to `main` branch
- ✅ Test gating blocks deployment if tests fail
- ✅ Preview deployments for feature branches
- ✅ Zero build step (vanilla JS, no npm dependencies)
- ✅ Global CDN with automatic HTTPS

---

## 2. Prerequisites

Before deploying, ensure you have:

| Requirement | Details |
|-------------|---------|
| **Cloudflare Account** | Free tier is sufficient ([Sign up](https://dash.cloudflare.com/sign-up)) |
| **GitHub Account** | Repository owner or collaborator access |
| **wrangler CLI** | Cloudflare's CLI tool (`npm install -g wrangler`) |
| **Node.js** | Version 18+ (for running tests locally) |

### Install wrangler CLI

```bash
npm install -g wrangler
```

### Authenticate with Cloudflare

```bash
wrangler login
```

This opens a browser window for OAuth authentication.

---

## 3. Initial Setup

### Step 1: Get Account Information

Retrieve your Cloudflare Account ID:

```bash
wrangler whoami
```

**Expected output**:
```
👋 You are logged in as user@example.com
Account ID: abc123def456...
```

**Save the Account ID** — you'll need it for GitHub secrets.

### Step 2: Create Cloudflare Pages Project

Create the project via wrangler CLI:

```bash
wrangler pages project create tdee-tracker --production-branch=main
```

**Expected output**:
```
✨ Project created successfully!
Project URL: https://tdee-tracker.pages.dev
```

**Save the Project URL** — this is your production deployment URL.

### Step 3: Generate API Token

Create a Cloudflare API token for GitHub Actions:

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token** → **Custom Token**
3. Configure permissions:
   - **Account** → **Cloudflare Pages** → **Edit**
   - **Account** → **Account Settings** → **Read** (optional, for wrangler commands)
4. Click **Continue to summary**
5. Name your token: `GitHub Actions - TDEE Tracker`
6. Click **Create Token**
7. **Save the token immediately** — you won't see it again

### Step 4: Configure GitHub Secrets

Add Cloudflare credentials to GitHub repository secrets:

1. Go to your GitHub repo: `https://github.com/{username}/tdee-tracker`
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | (from `wrangler whoami`) | Your Cloudflare Account ID |
| `CLOUDFLARE_API_TOKEN` | (API token from Step 3) | Pages Edit permission token |

**Important**: Secrets are encrypted and never exposed in logs.

---

## 4. GitHub Actions Workflow

### Workflow File: `.github/workflows/deploy.yml`

The workflow handles testing and deployment:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Run tests
        run: node tests/node-test.js

  deploy:
    name: Deploy to Cloudflare Pages
    runs-on: ubuntu-latest
    needs: test  # Only runs if tests pass
    if: github.ref == 'refs/heads/main'  # Production only on main
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy . --project-name=tdee-tracker --branch=main
```

### How It Works

**Test Gating**:
1. Every push/PR triggers the `test` job
2. Runs `node tests/node-test.js` (80+ automated tests)
3. If tests fail → workflow stops, **no deployment**
4. If tests pass → proceeds to deployment

**Deployment Rules**:
| Branch | Deployment Type | URL |
|--------|----------------|-----|
| `main` | Production | `https://tdee-tracker.pages.dev` |
| `develop` | Preview | Auto-generated preview URL |
| Feature branches | Preview | Auto-generated preview URL |
| Pull Requests | Preview | Comment with preview URL |

---

## 5. Deployment Process

### Automatic Deployment

**On push to `main`**:
```
Push → GitHub Actions triggered → Tests run → Deploy to production
```

**On push to other branches**:
```
Push → GitHub Actions triggered → Tests run → Deploy to preview
```

### Viewing Deployment Status

**GitHub Actions**:
1. Go to repo → **Actions** tab
2. Click workflow run to see logs
3. Green checkmark = success, red X = failure

**Cloudflare Dashboard**:
1. Go to https://dash.cloudflare.com
2. Navigate to **Workers & Pages** → **tdee-tracker**
3. View **Deployments** tab for history

### Deployment Timeline

| Stage | Duration | Description |
|-------|----------|-------------|
| Test execution | ~30 seconds | Run 80+ automated tests |
| Upload to Cloudflare | ~10 seconds | Deploy static files to CDN |
| CDN propagation | ~30 seconds | Global edge cache update |
| **Total** | **~1-2 minutes** | From push to live deployment |

---

## 6. Preview Deployments

### What Are Preview Deployments?

Preview deployments create temporary URLs for non-production branches. Useful for:
- Testing feature branches before merging
- Sharing work-in-progress with team
- Visual review of UI changes

### Accessing Preview URLs

**After pushing to a feature branch**:

1. GitHub Actions workflow runs
2. Deployment creates preview URL:
   ```
   https://{commit-hash}.tdee-tracker.pages.dev
   ```

3. Find the URL in:
   - GitHub Actions workflow output
   - Cloudflare Dashboard → Deployments tab
   - Pull request comment (auto-posted)

### Example Workflow

```bash
# Create feature branch
git checkout -b feature/new-chart

# Make changes, commit, push
git push origin feature/new-chart

# Preview URL is automatically created
# Check GitHub Actions for the URL
```

### Preview Deployment Lifecycle

| Event | Action |
|-------|--------|
| Push to branch | Create/update preview |
| Pull request created | Post preview URL in PR comment |
| Branch deleted | Preview URL expires (7 days) |

---

## 7. Troubleshooting

### Authentication Failures

**Error**: `Error: Invalid API token`

**Causes**:
- API token expired or revoked
- Incorrect token copied to GitHub secrets
- Token lacks Pages Edit permission

**Fix**:
1. Regenerate API token (Step 3 above)
2. Update `CLOUDFLARE_API_TOKEN` secret in GitHub
3. Verify token has **Cloudflare Pages: Edit** permission

---

**Error**: `Error: Account ID not found`

**Causes**:
- `CLOUDFLARE_ACCOUNT_ID` secret missing
- Account ID copied incorrectly

**Fix**:
1. Run `wrangler whoami` to get correct Account ID
2. Update `CLOUDFLARE_ACCOUNT_ID` secret in GitHub
3. Ensure no extra spaces in the value

---

### Test Failures in CI

**Error**: Tests pass locally but fail in GitHub Actions

**Causes**:
- Node.js version mismatch
- Environment-specific behavior
- Race conditions or timing issues

**Fix**:
1. Check GitHub Actions logs for specific test failures
2. Verify Node.js version matches locally (use `.nvmrc` if needed)
3. Run tests in CI-like environment:
   ```bash
   node tests/node-test.js --verbose
   ```
4. Fix failing tests before pushing

---

### Deployment Failures

**Error**: `Error: Project not found`

**Causes**:
- Cloudflare Pages project not created
- Project name mismatch in workflow

**Fix**:
1. Verify project exists: `wrangler pages project list`
2. Create project if missing: `wrangler pages project create tdee-tracker`
3. Ensure `--project-name=tdee-tracker` in workflow matches exactly

---

**Error**: `Error: Permission denied`

**Causes**:
- API token lacks required permissions
- Account ID mismatch

**Fix**:
1. Regenerate API token with **Cloudflare Pages: Edit** permission
2. Verify Account ID matches the token's account
3. Check token hasn't expired

---

### Permission Issues

**Error**: `You do not have permission to access this resource`

**Causes**:
- API token created for wrong account
- User lacks admin access to GitHub repo

**Fix**:
1. Ensure logged into correct Cloudflare account: `wrangler whoami`
2. Regenerate token while logged into correct account
3. Verify GitHub repo access (Settings → Collaborators)

---

## 8. Rollback Procedure

### Via Cloudflare Dashboard (Recommended)

1. Go to https://dash.cloudflare.com
2. Navigate to **Workers & Pages** → **tdee-tracker**
3. Click **Deployments** tab
4. Find the deployment to rollback to
5. Click **⋯** (menu) → **Rollback to this deployment**
6. Confirm rollback

**Result**: Production URL immediately reverts to selected version.

---

### Via wrangler CLI

```bash
# List recent deployments
wrangler pages deployment list --project-name=tdee-tracker

# Rollback to specific deployment (replace ID)
wrangler pages deployment rollback --project-name=tdee-tracker <DEPLOYMENT_ID>
```

---

### Via GitHub (Revert Commit)

If a bad commit was deployed:

```bash
# Revert the problematic commit
git revert <BAD_COMMIT_HASH>
git push origin main
```

This triggers a new deployment with the reverted code.

---

## 9. Environment Variables

### Required Secrets

| Secret | Purpose | Where to Set |
|--------|---------|--------------|
| `CLOUDFLARE_ACCOUNT_ID` | Identifies your Cloudflare account | GitHub Secrets |
| `CLOUDFLARE_API_TOKEN` | Authenticates deployment | GitHub Secrets |

### Adding New Secrets

**GitHub Secrets**:
1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Enter name and value
4. Click **Add secret**

**Cloudflare Pages Environment Variables** (if needed in future):
1. Cloudflare Dashboard → **Workers & Pages** → **tdee-tracker**
2. **Settings** → **Environment variables**
3. Click **Add variable**
4. Set name, value, and environment (production/preview)

### Using Environment Variables in Code

```javascript
// Access via Cloudflare Pages environment
const apiKey = process.env.API_KEY; // Not used currently, available for future
```

---

## Quick Reference

### Commands

```bash
# Authenticate
wrangler login

# Get account info
wrangler whoami

# Create project
wrangler pages project create tdee-tracker --production-branch=main

# List projects
wrangler pages project list

# Deploy manually
wrangler pages deploy . --project-name=tdee-tracker --branch=main

# View deployments
wrangler pages deployment list --project-name=tdee-tracker
```

### URLs

| Resource | URL |
|----------|-----|
| Production | `https://tdee-tracker.pages.dev` |
| Cloudflare Dashboard | `https://dash.cloudflare.com` |
| GitHub Actions | `https://github.com/{user}/tdee-tracker/actions` |
| API Tokens | `https://dash.cloudflare.com/profile/api-tokens` |

---

## Support

- **Cloudflare Docs**: https://developers.cloudflare.com/pages/
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **wrangler CLI Docs**: https://developers.cloudflare.com/workers/wrangler/

---

**Last Updated**: 2026-02-26  
**Version**: 1.0
