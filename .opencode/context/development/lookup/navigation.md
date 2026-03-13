<!-- Context: development/lookup/navigation | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Development Lookup Navigation

**Purpose**: Quick reference for configuration values, constants, and settings.

**Last Updated**: 2026-03-11

---

## Files

| File | Purpose |
|------|---------|
| [auth-configuration.md](auth-configuration.md) | Supabase Auth settings, environment variables, RLS policies |
| [deployment-config.md](deployment-config.md) | Cloudflare Pages, GitHub Actions, Wrangler configuration |

---

## Quick Reference

### Auth Configuration

| Setting | Value |
|---------|-------|
| Session Expiry | 7 days (604800 seconds) |
| Auto Refresh | Enabled |
| PKCE Flow | Enabled |
| Email OTP Limit | 3 attempts / 60 seconds |

### Deployment

| Platform | Build Command | Output Directory |
|----------|---------------|------------------|
| Cloudflare Pages | (none) | `/` |
| GitHub Actions | (none) | `/` |

---

## Related

- [concepts/](../concepts/navigation.md) — Core architecture
- [guides/](../guides/navigation.md) — Step-by-step instructions
- [errors/](../errors/navigation.md) — Troubleshooting
- [examples/](../examples/navigation.md) — Code examples

(End of file - total 37 lines)
