<!-- Context: testing/test-patterns | Priority: high | Version: 1.0 | Updated: 2026-02-27 -->

# Concept: Test Patterns

**Core Idea**: Structured approach to writing deterministic tests using Arrange-Act-Assert pattern, Result pattern validation, and positive/negative test pairs. Tests verify behavior against acceptance criteria with tiered coverage goals.

**Key Points**:
- **AAA Pattern**: Every test follows Arrange (setup) → Act (execute) → Assert (verify) structure
- **Result Pattern**: Success returns `{ success: true, data: ... }`, error returns `{ success: false, error, code }`
- **Positive/Negative Pairs**: Every behavior needs both success case and failure/edge case tests
- **Coverage Tiers**: Critical 100% (validation logic), High 90%+ (storage ops), Medium 80%+ (utilities)
- **Determinism**: All external dependencies mocked — no network calls, no time flakiness

**Quick Example**:
```javascript
// Positive test: valid date parsing
it('parses valid YYYY-MM-DD date', () => {
    // Arrange
    const dateStr = '2026-02-26';

    // Act
    const result = Utils.parseDate(dateStr);

    // Assert
    expect(result instanceof Date).toBeTrue();
    expect(result.getHours()).toBe(0);
});

// Negative test: invalid input handling
it('rejects null/undefined input', () => {
    // Arrange
    const invalidInputs = [null, undefined, ''];

    // Act & Assert
    invalidInputs.forEach(input => {
        expect(() => Utils.parseDate(input)).not.toThrow();
    });
});
```

**Related**:
- testing/guides/test-implementation.md
- testing/concepts/result-pattern.md
- tests/TEST-IMPLEMENTATION-SUMMARY.md
