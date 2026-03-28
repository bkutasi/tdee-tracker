<!-- Context: development/navigation | Priority: critical | Version: 1.0 | Updated: 2026-02-15 -->

# Development Navigation

**Purpose**: Software development across all stacks

---

## Structure

```
development/
├── navigation.md
├── ui-navigation.md           # Specialized
├── backend-navigation.md      # Specialized
├── fullstack-navigation.md    # Specialized
│
├── concepts/                  # Core architecture & patterns
│   ├── navigation.md
│   ├── supabase-auth.md
│   ├── offline-first-sync.md
│   ├── jwt-session.md
│   ├── row-level-security.md
│   ├── sync-debugging.md
│   ├── model-context-protocol.md
│   ├── batch-execution.md
│   └── technical-debt-categorization.md
│
├── examples/                  # Code examples & schemas
│   ├── navigation.md
│   ├── supabase-schema.md
│   └── magic-link-flow.md
│
├── guides/                    # Step-by-step how-tos
│   ├── navigation.md
│   ├── supabase-quickstart.md
│   ├── supabase-auth-setup.md
│   ├── running-migrations.md
│   ├── cloudflare-pages-deployment.md
│   ├── pre-commit-setup.md
│   ├── creating-skills.md
│   ├── technical-debt-reduction.md
│   ├── constants-extraction.md
│   └── duplicate-consolidation.md
│
├── errors/                    # Troubleshooting & common issues
│   ├── navigation.md
│   ├── auth-errors.md
│   ├── not-null-constraint-error.md
│   ├── deployment-errors.md
│   └── sync-integration-errors.md
│
├── lookup/                    # Configuration reference
│   ├── navigation.md
│   ├── auth-configuration.md
│   ├── deployment-config.md
│   └── code-quality-grep.md
│
├── principles/                # Universal (language-agnostic)
│   ├── navigation.md
│   ├── clean-code.md
│   └── api-design.md
│
├── frameworks/                # Full-stack frameworks
│   ├── navigation.md
│   └── tanstack-start/
│
├── ai/                        # AI & Agents
│   ├── navigation.md
│   └── mastra-ai/
│
├── frontend/                  # Client-side
│   ├── navigation.md
│   ├── when-to-delegate.md    # When to use frontend-specialist
│   └── react/
│       ├── navigation.md
│       └── react-patterns.md
│
├── backend/                   # Server-side (future)
│   ├── navigation.md
│   ├── api-patterns/
│   ├── nodejs/
│   ├── python/
│   └── authentication/
│
├── data/                      # Data layer (future)
│   ├── navigation.md
│   ├── sql-patterns/
│   ├── nosql-patterns/
│   └── orm-patterns/
│
├── integration/               # Connecting systems (future)
│   ├── navigation.md
│   ├── package-management/
│   ├── api-integration/
│   └── third-party-services/
│
└── infrastructure/            # DevOps (future)
    ├── navigation.md
    └── docker/
    └── ci-cd/
```

---

## Quick Routes

| Task | Path |
|------|------|
| **Supabase Auth** | `concepts/supabase-auth.md` |
| **Offline-first sync** | `concepts/offline-first-sync.md` |
| **RLS policies** | `concepts/row-level-security.md` |
| **Sync debugging** | `concepts/sync-debugging.md` |
| **Database schema** | `examples/supabase-schema.md` |
| **Magic link flow** | `examples/magic-link-flow.md` |
| **Quick start guide** | `guides/supabase-quickstart.md` |
| **Auth setup** | `guides/supabase-auth-setup.md` |
| **Running migrations** | `guides/running-migrations.md` |
| **Cloudflare deployment** | `guides/cloudflare-pages-deployment.md` |
| **Pre-commit hooks** | `guides/pre-commit-setup.md` |
| **Auth troubleshooting** | `errors/auth-errors.md` |
| **Sync errors** | `errors/sync-integration-errors.md` |
| **Deployment errors** | `errors/deployment-errors.md` |
| **Auth configuration** | `lookup/auth-configuration.md` |
| **Deployment config** | `lookup/deployment-config.md` |
| **UI/Frontend** | `ui-navigation.md` |
| **When to delegate frontend** | `frontend/when-to-delegate.md` |
| **Backend/API** | `backend-navigation.md` |
| **Full-stack** | `fullstack-navigation.md` |
| **Clean code** | `principles/clean-code.md` |
| **API design** | `principles/api-design.md` |
| **Technical debt reduction** | `guides/technical-debt-reduction.md` |
| **Constants extraction** | `guides/constants-extraction.md` |
| **Duplicate consolidation** | `guides/duplicate-consolidation.md` |
| **Batch execution** | `concepts/batch-execution.md` |
| **Code quality grep** | `lookup/code-quality-grep.md` |

---

## By Concern

**Concepts** → Core architecture (Supabase auth, offline-first sync, JWT sessions)
**Examples** → Code samples (database schema with RLS)
**Guides** → Step-by-step (5-min Supabase setup)
**Errors** → Troubleshooting (auth issues, sync problems)
**Principles** → Universal development practices
**Frameworks** → Full-stack frameworks (Tanstack Start, Next.js)
**AI** → AI frameworks and agent runtimes (MAStra AI)
**Frontend** → React patterns and component design
**Backend** → APIs, Node.js, Python, auth (future)
**Data** → SQL, NoSQL, ORMs (future)
**Integration** → Packages, APIs, services (future)
**Infrastructure** → Docker, CI/CD (future)

---

## Related Context

- **Core Standards** → `../core/standards/navigation.md`
- **UI Patterns** → `../ui/navigation.md`
