<!-- Context: testing/test-implementation | Priority: high | Version: 1.0 | Updated: 2026-02-27 -->

# Guide: Test Implementation

**Purpose**: Write comprehensive tests for TDEE Tracker following project conventions: AAA pattern, Result validation, localStorage mocking, and dual-runner compatibility (Node.js + browser).

**Steps**:

### 1. Setup
- Create test file: `tests/<module>.test.js` (browser) or `test-<module>.js` (Node.js)
- Add to `tests/node-test.js` runner (extend assertion matchers if needed)
- Add script include to `tests/test-runner.html` (browser runner)
- Mock `localStorage` for Node.js tests using standard mock pattern

### 2. Write Tests
- Follow AAA pattern in every test (Arrange → Act → Assert)
- Write positive tests (valid inputs, expected success)
- Write negative tests (invalid inputs, error handling, edge cases)
- Validate Result pattern structure (`result.success`, `result.data`, `result.error`, `result.code`)
- Test type safety (string vs Date object inputs)
- Test round-trip integrity (parse → format, import → export)

### 3. Run Validation
```bash
# Node.js (fast, 69+ tests)
node tests/node-test.js

# Browser (full suite, 155+ tests)
open tests/test-runner.html
```

**localStorage Mock Pattern**:
```javascript
// Node.js setup
global.localStorage = {
    data: { tdee_entries: '{}', tdee_settings: '{}' },
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; },
    clear() { this.data = {}; }
};
```

**Date Type Safety Test**:
```javascript
it('handles Date object input without throwing', () => {
    // Arrange
    const date = new Date('2026-02-26T12:00:00Z');

    // Act
    const result = Utils.parseDate(date);

    // Assert
    expect(result instanceof Date).toBeTrue();
});
```

**Storage Migration Test**:
```javascript
it('preserves entries through schema migration v0→v1', () => {
    // Arrange
    mockLocalStorage.setItem('tdee_schema_version', '0');
    mockLocalStorage.setItem('tdee_entries', JSON.stringify({
        '2026-01-01': { weight: 80.5, calories: 2000 }
    }));

    // Act
    Storage.init();

    // Assert
    const entries = Storage.getAllEntries();
    expect(Object.keys(entries).length).toBe(1);
    expect(entries['2026-01-01'].weight).toBe(80.5);
});
```

**Import/Export Round-Trip Test**:
```javascript
it('preserves data integrity through import/export cycle', () => {
    // Arrange
    const originalData = {
        entries: { '2026-01-01': { weight: 80.5, calories: 2000 } },
        settings: { unit: 'kg' }
    };

    // Act
    Storage.importData(originalData);
    const exportedData = Storage.exportData();

    // Assert
    expect(exportedData.entries['2026-01-01'].weight).toBe(80.5);
    expect(exportedData.settings.unit).toBe('kg');
});
```

**Related**:
- concepts/test-patterns.md
- tests/TEST-IMPLEMENTATION-SUMMARY.md
- tests/node-test.js
