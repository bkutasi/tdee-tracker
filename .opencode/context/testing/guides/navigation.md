<!-- Context: testing/guides/navigation | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Testing Guides Navigation

**Purpose**: Step-by-step testing instructions.

**Last Updated**: 2026-03-11

---

## Files

| File | Purpose |
|------|---------|
| [test-implementation.md](test-implementation.md) | How to write tests: setup, patterns, localStorage mocking |
| [testing-auth-flow.md](testing-auth-flow.md) | Testing Supabase Auth: unit, integration, E2E, security tests |

---

## Quick Reference

### Test Implementation

- **AAA Pattern**: Arrange → Act → Assert
- **Result Validation**: Check `valid` flag and `errors` array
- **Coverage Tiers**: Critical (100%), High (90%+), Medium (80%+)
- **localStorage Mocking**: Use `Test.mockStorage()` for isolation

### Auth Testing

- **Unit tests**: Mock Supabase client
- **Integration tests**: Real Supabase API with test users
- **E2E tests**: Complete user journey
- **Security tests**: Token exposure, session cleanup

---

## Running Tests

```bash
# Node.js runner (fast)
node tests/node-test.js

# Browser runner (full suite)
open tests/test-runner.html
```

---

## Related

- [concepts/](../concepts/navigation.md) — TDD concepts
- [examples/](../examples/navigation.md) — Test examples
- [../../development/guides/](../../development/guides/navigation.md) — Development guides

(End of file - total 47 lines)
