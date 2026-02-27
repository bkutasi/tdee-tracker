<!-- Context: testing/navigation | Priority: high | Version: 1.0 | Updated: 2026-02-27 -->

# Testing Context Navigation

**Purpose**: Central index for testing-related context files. Quick lookup for test patterns, implementation guides, and framework documentation.

---

## Concepts

| File | Purpose |
|------|---------|
| [concepts/test-patterns.md](concepts/test-patterns.md) | AAA pattern, Result validation, coverage tiers, positive/negative pairs |

---

## Guides

| File | Purpose |
|------|---------|
| [guides/test-implementation.md](guides/test-implementation.md) | How to write tests: setup, patterns, localStorage mocking, running tests |

---

## Quick Reference

**Test Runners**:
```bash
node tests/node-test.js      # Fast (69+ tests)
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
