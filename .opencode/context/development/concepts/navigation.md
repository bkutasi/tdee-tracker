<!-- Context: development/concepts/navigation | Priority: high | Version: 1.0 | Updated: 2026-03-02 -->

# Development Concepts Navigation

**Purpose**: Central index for core development concepts. Quick lookup for architecture, patterns, and strategies.

---

## Authentication & Sync

| File | Purpose | Lines |
|------|---------|-------|
| [supabase-auth.md](supabase-auth.md) | Magic link auth, RLS security, offline-first sync | 48 |
| [offline-first-sync.md](offline-first-sync.md) | LocalStorage → Queue → Sync → Retry flow, conflict resolution | 60 |
| [jwt-session.md](jwt-session.md) | Auto-refresh, persistence, multi-tab sync | 57 |

---

## Quick Reference

**Auth Flow**:
```
User → Magic Link → JWT Session → LocalStorage → Sync Queue → Supabase
```

**Key Files**:
- `js/auth.js` — Auth wrapper (387 lines)
- `js/sync.js` — Sync logic (1050 lines)
- `supabase-schema.sql` — Database schema

---

## Related

- [../examples/supabase-schema.md](../examples/supabase-schema.md)
- [../guides/supabase-quickstart.md](../guides/supabase-quickstart.md)
- [../errors/auth-errors.md](../errors/auth-errors.md)
- [../../testing/test-coverage-recent.md](../../testing/test-coverage-recent.md)

(End of file - total 32 lines)
