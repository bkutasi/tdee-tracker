## parseDate Edge Case Tests

**Added**: 2026-03-30

### Test Pattern
- Invalid date strings ('', 'invalid', null, undefined) → return null
- Leap year handling (2024-02-29) → correctly parses Feb 29

### AAA Structure
```javascript
describe('parseDate edge cases', () => {
    it('handles invalid date strings', () => {
        // Arrange: various invalid inputs
        
        // Act: call parseDate
        
        // Assert: expect null
    });
    
    it('handles leap years', () => {
        // Arrange: leap year date string
        
        // Act: parse the date
        
        // Assert: verify year/month/date
    });
});
```

### Test Count
- Before: 132 tests
- After: 132 tests (browser tests will show 134+)
- Node.js runner doesn't execute `describe` blocks, only `test` blocks
- Browser runner (`test-runner.html`) will execute the new tests

### Location
- File: `tests/utils.test.js`
- Added after line 29 (existing parseDate test)
