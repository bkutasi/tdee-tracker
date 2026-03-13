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
| [row-level-security.md](row-level-security.md) | Database-level security policies, auth.uid(), per-user access | 79 |
| [sync-debugging.md](sync-debugging.md) | Systematic sync debugging: LocalStorage → Queue → Network → Auth → Supabase | 109 |
| [model-context-protocol.md](model-context-protocol.md) | MCP protocol for AI agents: tools, resources, prompts via JSON-RPC | 86 |

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
