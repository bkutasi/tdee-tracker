<!-- Context: testing/navigation | Priority: high | Version: 1.0 | Updated: 2026-02-27 -->

# Testing Context Navigation

**Purpose**: Central index for testing-related context files. Quick lookup for test patterns, implementation guides, and framework documentation.

---

## Concepts

| File | Purpose |
|------|---------|
| [concepts/test-patterns.md](concepts/test-patterns.md) | AAA pattern, Result validation, coverage tiers, positive/negative pairs |
| [concepts/test-driven-development.md](concepts/test-driven-development.md) | TDD cycle: Red-Green-Refactor, benefits, best practices, coverage tiers |
| [concepts/custom-test-framework.md](concepts/custom-test-framework.md) | Custom matchers (toContain, toBeGreaterThan, not), beforeEach/afterEach hooks |
| [concepts/browser-test-strategies.md](concepts/browser-test-strategies.md) | Browser-only guard, dual runner architecture, DOM test isolation |
| [concepts/phase-completion.md](concepts/phase-completion.md) | Phase completion tracking: coverage tables, implementation verification, acceptance criteria |
| [concepts/ui-testing-patterns.md](concepts/ui-testing-patterns.md) | Browser-only tests: DOM setup, mock deps, environment guard, component coverage |

---

## Guides

| File | Purpose |
|------|---------|
| [guides/test-implementation.md](guides/test-implementation.md) | How to write tests: setup, patterns, localStorage mocking, running tests |
| [guides/testing-auth-flow.md](guides/testing-auth-flow.md) | Testing Supabase Auth: unit, integration, E2E, security tests |
| [guides/chart-testing-workflow.md](guides/chart-testing-workflow.md) | Scenario-based validation (5 scenarios), exit criteria checklist |

---

## Examples

| File | Purpose |
|------|---------|
| [examples/test-coverage-bug-fixes.md](examples/test-coverage-bug-fixes.md) | Tests that caught bugs: floating-point, date parsing, sync duplicates, token expiry |
| [examples/e2e-integration-checks.md](examples/e2e-integration-checks.md) | E2E tests: user journey, multi-device sync, offline mode, error recovery |
| [examples/modal-dom-testing.md](examples/modal-dom-testing.md) | Modal DOM setup/teardown, ARIA validation, close interaction pairs |

---

## Lookup

| File | Purpose |
|------|---------|
| [lookup/csp-test-reference.md](lookup/csp-test-reference.md) | CSP regex pattern, directive validation, security checklist |

---

## Quick Reference

**Test Runners**:
```bash
node tests/node-test.js      # Fast (109+ tests)
open tests/test-runner.html  # Full suite (155+ tests)
```

**Coverage Goals**:
- Critical: 100% (validation logic)
- High: 90%+ (storage operations)
- Medium: 80%+ (utilities)

**Test File Patterns**:
- `*.test.js` → Browser tests
- `node-test.js` → Node.js runner
- `test-*.js` → Standalone Node.js tests

---

## Related

- ../core/context-system/standards/mvi.md
- ../core/context-system/guides/compact.md
- ../../../tests/TEST-IMPLEMENTATION-SUMMARY.md
- ../../../tests/AGENTS.md
