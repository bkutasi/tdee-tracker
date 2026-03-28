<!-- Context: development/guides/navigation | Priority: high | Version: 1.0 | Updated: 2026-03-02 -->

# Development Guides Navigation

**Purpose**: Central index for step-by-step guides and how-to documentation.

---

## Setup & Configuration

| File | Purpose | Lines |
|------|---------|-------|
| [supabase-quickstart.md](supabase-quickstart.md) | 7-step setup: Create project, get credentials, deploy | 108 |
| [supabase-auth-setup.md](supabase-auth-setup.md) | Configure magic link, OAuth providers, URL settings | 147 |
| [running-migrations.md](running-migrations.md) | Apply schema changes, rollback strategy, verification | 151 |
| [cloudflare-pages-deployment.md](cloudflare-pages-deployment.md) | Deploy to Cloudflare Pages: build settings, env vars, custom domain | 142 |
| [pre-commit-setup.md](pre-commit-setup.md) | Automate code quality checks: syntax, tests, file sizes | 148 |
| [creating-skills.md](creating-skills.md) | Create agent skills: structure, workflows, resources | 154 |

## Code Quality

| File | Purpose | Lines |
|------|---------|-------|
| [technical-debt-reduction.md](technical-debt-reduction.md) | 3-batch workflow: foundation → code quality → testing | ~70 |
| [constants-extraction.md](constants-extraction.md) | Identify magic numbers → create constants → replace → group | ~55 |
| [duplicate-consolidation.md](duplicate-consolidation.md) | Find duplicates → choose canonical → update refs → remove | ~55 |

---

## Quick Reference

**5-Minute Setup**:
1. Create Supabase project (1 min)
2. Get credentials (30 sec)
3. Set up database (1 min)
4. Local setup (1 min)
5. Test locally (1 min)
6. Add GitHub secrets (30 sec)
7. Deploy (30 sec)

**Commands**:
```bash
cp .env.example .env
node scripts/generate-config.js
git push origin master
```

---

## Related

- [../concepts/supabase-auth.md](../concepts/supabase-auth.md)
- [../examples/supabase-schema.md](../examples/supabase-schema.md)
- [../errors/auth-errors.md](../errors/auth-errors.md)
- [../../../SETUP_AUTH.md](../../../SETUP_AUTH.md)

(End of file - total 34 lines)
