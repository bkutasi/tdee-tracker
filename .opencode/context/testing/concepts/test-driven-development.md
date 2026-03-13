<!-- Context: testing/concepts/test-driven-development | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Concept: Test-Driven Development (TDD)

**Purpose**: Development methodology where tests are written before implementation code, driving design and ensuring coverage.

**Last Updated**: 2026-03-11

---

## Core Idea

TDD follows a "Red-Green-Refactor" cycle: write a failing test (Red), implement minimum code to pass (Green), then improve code quality (Refactor).

## TDD Cycle

```
┌─────────────┐
│    RED      │ ← Write a failing test
│  (Test)     │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   GREEN     │ ← Write code to pass test
│ (Implement) │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  REFACTOR   │ ← Improve code, keep tests passing
│  (Clean up) │
└──────┬──────┘
       │
       ↓
    Repeat
```

---

## TDD Example: Weight Validation

**RED** → Write failing test:
```javascript
Test.test('rejects negative weight', () => {
    const result = WeightValidator.validate(-5);
    Test.assertEqual(result.valid, false);
});
// → FAIL (WeightValidator doesn't exist)
```

**GREEN** → Implement minimum code:
```javascript
const WeightValidator = {
    validate(weight) {
        return { valid: weight >= 0, errors: weight < 0 ? ['negative'] : [] };
    }
};
// → PASS
```

**REFACTOR** → Improve with more rules (add tests first!):
```javascript
const WeightValidator = {
    validate(weight) {
        const errors = [];
        if (typeof weight !== 'number') errors.push('not_a_number');
        if (weight < 20) errors.push('too_low');
        if (weight > 500) errors.push('too_high');
        return { valid: errors.length === 0, errors };
    }
};
```

---

## TDD Best Practices

- **Test First**: Write test BEFORE implementation
- **One Concept Per Test**: Separate validation, save, sync tests
- **Test Behavior**: Test `persists entry` not `calls localStorage.setItem`
- **Coverage Tiers**: Critical (100%), High (90%+), Medium (80%+)

**Common Mistakes**: Tests too complex, testing private methods, ignoring failures, no assertions, over-mocking

---

## TDD Workflow

1. Understand requirement → 2. Write test → 3. Run (Red) → 4. Implement → 5. Run (Green) → 6. Refactor → 7. Run all tests → 8. Repeat

**References**:
- `tests/` — Test suite (109+ tests)
- `tests/node-test.js` — Test runner
- `tests/calculator.test.js` — Example TDD tests

**Related**:
- [concepts/test-patterns.md](test-patterns.md)
- [guides/test-implementation.md](../guides/test-implementation.md)
- [examples/test-coverage-bug-fixes.md](../examples/test-coverage-bug-fixes.md)

(End of file - total 179 lines)
