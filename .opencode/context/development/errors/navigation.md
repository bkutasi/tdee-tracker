<!-- Context: development/errors/navigation | Priority: high | Version: 1.0 | Updated: 2026-03-02 -->

# Development Errors Navigation

**Purpose**: Central index for error reference, troubleshooting, and common issues.

---

## Authentication & Sync

| File | Purpose | Lines |
|------|---------|-------|
| [auth-errors.md](auth-errors.md) | Config issues, magic link problems, sync failures, deploy errors | 142 |
| [not-null-constraint-error.md](not-null-constraint-error.md) | Database NOT NULL violations: missing user_id, validation, prevention | 169 |
| [deployment-errors.md](deployment-errors.md) | Build failures, 404s, env vars, CORS, service worker issues | 175 |
| [sync-integration-errors.md](sync-integration-errors.md) | Queue not processing, duplicates, data loss, conflicts, retry loops | 199 |

---

## Quick Reference

**Common Issues**:
| Issue | Quick Fix |
|-------|-----------|
| Config not found | `node scripts/generate-config.js` |
| No email | Check spam, verify in Supabase |
| Not syncing | Check console [Sync] logs |
| Deploy failed | Verify GitHub secrets |

**Debug Commands**:
```javascript
console.log('User:', Auth.getCurrentUser());
console.log('Sync:', Sync.getStatus());
await Sync.syncAll(); // Force sync
```

---

## Related

- [../concepts/supabase-auth.md](../concepts/supabase-auth.md)
- [../guides/supabase-quickstart.md](../guides/supabase-quickstart.md)
- [../examples/supabase-schema.md](../examples/supabase-schema.md)
- [../../../SETUP_AUTH.md](../../../SETUP_AUTH.md)

(End of file - total 34 lines)
