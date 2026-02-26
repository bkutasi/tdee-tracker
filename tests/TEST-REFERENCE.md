# Test Writing Quick Reference

## Test Structure (AAA Pattern)

```javascript
describe('Module.function', () => {
    it('does something specific', () => {
        // Arrange
        const input = 'value';
        
        // Act
        const result = Module.function(input);
        
        // Assert
        expect(result).toBe(expected);
    });
});
```

## Assertion Matchers

### Basic
```javascript
expect(actual).toBe(expected)           // Strict equality (===)
expect(actual).toBeCloseTo(3.14, 2)     // Float comparison (2 decimals)
expect(actual).toBeNull()               // Null check
expect(actual).toBeTrue()               // Boolean true
expect(actual).toBeFalse()              // Boolean false
expect(actual).toBeUndefined()          // Undefined check
expect(actual).toBeDefined()            // Defined check
```

### Arrays
```javascript
expect(array).toHaveLength(5)           // Array length
```

### Strings
```javascript
expect(str).toMatch(/^\d{4}-\d{2}-\d{2}$/)  // Regex match
```

### Objects
```javascript
expect(obj).toEqual({ key: 'value' })   // Deep equality (JSON stringify)
```

### Negation
```javascript
expect(actual).not.toBe(expected)       // Not equal
```

## Validation Result Pattern

### Success Result
```javascript
const result = Utils.validateDateFormat('2026-02-26');
expect(result.success).toBeTrue();
expect(result.data).toBeDefined();
expect(result.data instanceof Date).toBeTrue();
```

### Error Result
```javascript
const result = Utils.validateDateFormat(null);
expect(result.success).toBeFalse();
expect(result.error).toBeDefined();
expect(result.code).toBe('MISSING_INPUT');
```

### Nested Data Structure
```javascript
const result = Utils.validateDateRange('2026-01-01', '2026-01-31');
expect(result.success).toBeTrue();
expect(result.data.start).toBeDefined();    // Correct access
expect(result.data.end).toBeDefined();      // Correct access
expect(result.data.days).toBe(30);
expect(result.start).toBeUndefined();       // Incorrect access
```

## Error Codes

| Code | When to Use |
|------|-------------|
| `MISSING_INPUT` | null, undefined, empty string |
| `INVALID_FORMAT` | Wrong format (e.g., MM-DD-YYYY) |
| `INVALID_DATE` | Unparseable date (e.g., 2026-13-45) |
| `INVALID_RANGE` | Start date > end date |
| `RANGE_EXCEEDED` | Range too large (>2 years default) |
| `OUT_OF_RANGE` | Value outside bounds |
| `INVALID_INPUT` | Non-numeric input |

## Test Types

### Positive Test (Success Case)
```javascript
it('accepts valid input', () => {
    const result = Function(validInput);
    expect(result.success).toBeTrue();
    expect(result.data).toBe(expectedValue);
});
```

### Negative Test (Failure Case)
```javascript
it('rejects invalid input', () => {
    const result = Function(invalidInput);
    expect(result.success).toBeFalse();
    expect(result.code).toBe('ERROR_CODE');
});
```

### Edge Case Test
```javascript
it('handles null gracefully', () => {
    const result = Function(null);
    expect(result instanceof Date).toBeTrue(); // Fallback behavior
});
```

### Type Safety Test
```javascript
it('handles Date object without throwing', () => {
    const date = new Date();
    expect(() => Function(date)).not.toThrow();
});
```

### Integration Test
```javascript
it('preserves data through round-trip', () => {
    Storage.saveEntry('2026-01-01', { weight: 80 });
    const entry = Storage.getEntry('2026-01-01');
    expect(entry.weight).toBe(80);
});
```

### Regression Test
```javascript
it('preserves 91 entries through migration', () => {
    // Setup with known issue scenario
    // Act: run migration
    // Assert: count preserved
    expect(Object.keys(entries).length).toBe(91);
});
```

## Mocking localStorage (Node.js)

```javascript
const mockLocalStorage = {
    data: {},
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; },
    clear() { this.data = {}; }
};

global.localStorage = mockLocalStorage;

// In test
beforeEach(() => {
    mockLocalStorage.clear();
});
```

## Common Patterns

### Test Both Input Types
```javascript
it('handles string input', () => {
    expect(Function('2026-02-26')).toBeDefined();
});

it('handles Date object input', () => {
    expect(Function(new Date())).toBeDefined();
});
```

### Test Error Codes
```javascript
it('returns MISSING_INPUT for null', () => {
    expect(Function(null).code).toBe('MISSING_INPUT');
});

it('returns INVALID_FORMAT for wrong format', () => {
    expect(Function('bad').code).toBe('INVALID_FORMAT');
});
```

### Test Data Preservation
```javascript
it('preserves entry structure', () => {
    Storage.saveEntry('2026-01-01', { 
        weight: 80.5, 
        calories: 1600, 
        notes: 'Test' 
    });
    
    const entry = Storage.getEntry('2026-01-01');
    expect(entry.weight).toBe(80.5);
    expect(entry.calories).toBe(1600);
    expect(entry.notes).toBe('Test');
});
```

### Test Count Preservation
```javascript
it('preserves entry count', () => {
    for (let i = 0; i < 91; i++) {
        Storage.saveEntry(date, { weight: 80 });
    }
    
    const allEntries = Storage.getAllEntries();
    expect(Object.keys(allEntries).length).toBe(91);
});
```

## Anti-Patterns to Avoid

❌ **Don't skip negative tests**
```javascript
// WRONG: Only testing success
it('parses valid date', () => { ... });

// RIGHT: Test both success and failure
it('parses valid date', () => { ... });
it('rejects invalid date', () => { ... });
```

❌ **Don't use real network calls**
```javascript
// WRONG: Network-dependent
it('fetches data', () => { ... });

// RIGHT: Mock external dependencies
it('uses mocked data', () => { ... });
```

❌ **Don't skip AAA structure**
```javascript
// WRONG: No structure
it('works', () => {
    const result = Function(input);
    expect(result).toBe(expected);
});

// RIGHT: Clear AAA
it('works', () => {
    // Arrange
    const input = {...};
    // Act
    const result = Function(input);
    // Assert
    expect(result).toBe(expected);
});
```

❌ **Don't test implementation details**
```javascript
// WRONG: Testing internal state
it('sets internal variable', () => { ... });

// RIGHT: Test behavior
it('returns correct result', () => { ... });
```

## Running Tests

```bash
# Node.js (fast)
node tests/node-test.js

# Browser (full suite)
open tests/test-runner.html

# Via script
./run-tests.sh
```

## Checklist Before Committing

- [ ] All new tests pass
- [ ] Both positive and negative tests written
- [ ] Tests follow AAA pattern
- [ ] Error codes are consistent
- [ ] Mocked external dependencies
- [ ] No flaky tests (time-dependent, network-dependent)
- [ ] Test names are descriptive
- [ ] Comments link tests to objectives
- [ ] Ran `node tests/node-test.js` successfully
