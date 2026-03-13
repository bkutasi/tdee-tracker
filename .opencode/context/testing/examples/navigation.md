<!-- Context: testing/examples/navigation | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Testing Examples Navigation

**Purpose**: Real-world test examples for common scenarios.

**Last Updated**: 2026-03-11

---

## Files

| File | Purpose |
|------|---------|
| [test-coverage-bug-fixes.md](test-coverage-bug-fixes.md) | Tests that caught and prevented bugs (floating-point, date parsing, sync) |
| [e2e-integration-checks.md](e2e-integration-checks.md) | End-to-end tests for user journeys, multi-device sync, offline mode |

---

## Quick Reference

### Bug Fix Tests

- **Floating-point precision**: `Calculator.round(0.1 + 0.2, 2)` → `0.3`
- **Date validation**: Reject invalid dates (Feb 30)
- **Sync duplicates**: Prevent duplicate entries on retry
- **Token expiry**: Auto-refresh expired sessions

### E2E Scenarios

- **User journey**: Sign up → Add entry → Log out → Log in → Verify data
- **Multi-device sync**: Device A adds → Device B sees
- **Offline mode**: Queue when offline → Sync when online
- **Error recovery**: Retry with exponential backoff

---

## Running Examples

```bash
# Run all tests
node tests/node-test.js

# Run specific test
node tests/calculator.test.js
node tests/e2e/user-journey.test.js
```

---

## Related

- [concepts/](../concepts/navigation.md) — TDD principles
- [guides/](../guides/navigation.md) — Test implementation
- [../../development/examples/](../../development/examples/navigation.md) — Code examples

(End of file - total 47 lines)
