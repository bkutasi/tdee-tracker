<!-- Context: deployment/guides/cloudflare-pages-ci | Priority: high | Version: 1.0 | Updated: 2026-02-27 -->

# Guide: Cloudflare Pages CI/CD

**Purpose**: Automated deployment with test gating using GitHub Actions and Wrangler direct upload.

**Key Points**:
- GitHub Actions workflow triggers on push to main/staging branches
- Tests run before deploy (gate deployment on test success)
- Direct upload method (not Git integration) for full CI control
- Custom domain setup via CNAME to `*.pages.dev`
- Secrets stored in GitHub (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN)

---

## Prerequisites

### 1. Generate Cloudflare API Token

Cloudflare Dashboard → Profile → API Tokens → Create Token:
- **Permissions**: Account → Cloudflare Pages → Edit
- Save token securely (shown once)

### 2. Get Account ID

Cloudflare Dashboard → Workers & Pages → Account ID (sidebar)

### 3. Configure GitHub Secrets

Repository → Settings → Secrets → Actions:
```
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
CLOUDFLARE_API_TOKEN=<your-api-token>
```

---

## GitHub Actions Workflow

### Test and Deploy (TDEE Tracker)

```yaml
# .github/workflows/deploy.yml
name: Deploy TDEE Tracker

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run test suite
        run: node tests/node-test.js
      
      - name: Deploy to Cloudflare Pages
        if: github.ref == 'refs/heads/main' && success()
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy . --project-name=tdee-tracker
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### Workflow Behavior

| Trigger | Action |
|---------|--------|
| Push to `main` | Run tests → Deploy if pass |
| Pull request | Run tests only (no deploy) |
| Push to other branches | No action (configure separately) |

---

## Custom Domain Setup

### DNS Configuration

For `tdee.kutasi.dev` pattern:

```dns
# At your DNS provider (or Cloudflare DNS)
Type: CNAME
Name: tdee
Value: tdee-tracker.pages.dev
TTL: 3600 (or Automatic)
```

### Cloudflare Pages Configuration

1. Pages Dashboard → Select project → **Custom domains**
2. **Set up a domain** → Enter `tdee.kutasi.dev`
3. Cloudflare auto-creates CNAME (if using Cloudflare DNS)
4. SSL certificate provisions automatically (~5 minutes)

### Branch-Specific Domains

| Domain | Branch | Use Case |
|--------|--------|----------|
| `tdee.kutasi.dev` | `main` | Production |
| `staging.tdee.kutasi.dev` | `staging` | Preview/Staging |

---

## Deploy Command Options

```bash
# Basic deploy
npx wrangler pages deploy . --project-name=tdee-tracker

# Deploy to preview branch
npx wrangler pages deploy . --branch=feature-branch

# Deploy with commit info
npx wrangler pages deploy . --commit-hash=abc123 --commit-message="Fix bug"
```

---

## Troubleshooting

### Authentication Failed

**Symptom**: `Error: Authentication error`

**Cause**: Invalid API token or account ID

**Solution**: 
1. Verify token has Pages Edit permission
2. Check account ID matches Cloudflare dashboard
3. Regenerate token if expired

### Test Failures in CI

**Symptom**: Workflow fails at "Run test suite" step

**Cause**: Test assertion failures or syntax errors

**Solution**:
1. Check workflow logs for test output
2. Run `node tests/node-test.js` locally to reproduce
3. Fix failing tests before re-push

### Project Not Found

**Symptom**: `Error: Project not found`

**Cause**: Project doesn't exist or name mismatch

**Solution**:
1. Create project first: `npx wrangler pages project create`
2. Verify `--project-name` matches exactly

### Permission Denied

**Symptom**: `Error: Permission denied`

**Cause**: API token lacks required permissions

**Solution**: Regenerate token with Account → Cloudflare Pages → Edit

---

## Related Files

- `deployment/errors/deployment-errors.md` - Common deployment errors
- `deployment/guides/cloudflare-custom-domains.md` - Custom domain details
- `.github/workflows/deploy.yml` - Workflow file (when created)

**Reference**: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
