<!-- Context: deployment/errors/deployment-errors | Priority: high | Version: 1.0 | Updated: 2026-02-27 -->

# Errors: Deployment

**Purpose**: Common Cloudflare Pages deployment errors and solutions.

**Common Issues**:
- Authentication failures (invalid API token or account ID)
- Test failures blocking CI/CD pipeline
- Project not found (missing or name mismatch)
- Permission errors (insufficient API token scope)
- Branch configuration errors (wrong branch name)

---

## Error: Authentication Failed

**Symptom**:
```
Error: Authentication error
[401 Unauthorized]
```

**Cause**:
- API token is invalid or expired
- Account ID doesn't match token's account
- Token lacks required permissions

**Solution**:
1. Cloudflare Dashboard → Profile → API Tokens
2. Verify token has: Account → Cloudflare Pages → Edit
3. Regenerate token if needed
4. Update GitHub secret: `CLOUDFLARE_API_TOKEN`
5. Verify `CLOUDFLARE_ACCOUNT_ID` matches dashboard

---

## Error: Test Failures

**Symptom**:
```
✗ Test suite failed
  Expected: 42 but got: 41.99999999999999
```

**Cause**:
- Floating-point precision issues (common in TDEE calculations)
- Logic errors in calculator functions
- Missing edge case handling

**Solution**:
1. Run tests locally: `node tests/node-test.js`
2. Check test output for specific failure
3. Use `Calculator.round(value, 2)` for comparisons
4. Fix failing test, re-push to trigger CI

---

## Error: Project Not Found

**Symptom**:
```
Error: Project "tdee-tracker" not found
[404 Not Found]
```

**Cause**:
- Project doesn't exist in Cloudflare account
- Project name typo in deploy command
- Deploying to wrong account

**Solution**:
1. Create project: `npx wrangler pages project create tdee-tracker`
2. Or use Cloudflare Dashboard → Workers & Pages → Create
3. Verify `--project-name` matches exactly (case-sensitive)
4. Check account ID matches project's account

---

## Error: Permission Denied

**Symptom**:
```
Error: Permission denied
[403 Forbidden]
```

**Cause**:
- API token lacks Pages Edit permission
- Token scoped to wrong account
- Account-level permission restrictions

**Solution**:
1. Regenerate API token with correct permissions:
   - Account → Cloudflare Pages → Edit
2. Verify token is from correct account
3. Check account admin hasn't restricted API access

---

## Error: Branch Configuration

**Symptom**:
```
Deployed to branch "main" but expected "master"
```

**Cause**:
- Workflow configured for wrong branch name
- Repository uses `master` but workflow expects `main` (or vice versa)

**Solution**:
1. Check repository default branch name
2. Update workflow `on.push.branches` to match:
   ```yaml
   on:
     push:
       branches: [master]  # or [main]
   ```
3. Verify deploy step branch filter:
   ```yaml
   if: github.ref == 'refs/heads/master'
   ```

---

## Error: Too Many Files

**Symptom**:
```
Error: Too many files (limit: 20000)
```

**Cause**:
- Project exceeds 20,000 file limit
- Unnecessary files included (node_modules, .git, etc.)

**Solution**:
1. Remove unnecessary files from deploy directory
2. Use `.gitignore` patterns to exclude files
3. For static sites, deploy only required assets:
   ```bash
   npx wrangler pages deploy ./public --project-name=tdee-tracker
   ```

---

## Error: SSL Certificate Pending

**Symptom**:
```
Custom domain status: Certificate provisioning
```

**Cause**:
- DNS not fully propagated
- CAA records blocking Cloudflare
- Recent domain addition (<5 minutes)

**Solution**:
1. Verify CNAME record points to `*.pages.dev`
2. Check CAA records allow Let's Encrypt:
   ```dns
   CAA 0 issue "letsencrypt.org"
   ```
3. Wait up to 24 hours for propagation
4. Re-associate domain in Pages dashboard if stuck

---

## Quick Reference

| Error | Fix Priority | Time to Fix |
|-------|-------------|-------------|
| Authentication Failed | High | 5 minutes |
| Test Failures | High | 10-30 minutes |
| Project Not Found | Medium | 2 minutes |
| Permission Denied | Medium | 5 minutes |
| Branch Configuration | Low | 2 minutes |

---

## Related Files

- `deployment/guides/cloudflare-pages-ci.md` - CI/CD setup guide
- `deployment/guides/cloudflare-custom-domains.md` - Domain configuration

**Reference**: https://developers.cloudflare.com/pages/troubleshooting/
