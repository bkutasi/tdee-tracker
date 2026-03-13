<!-- Context: testing/examples/test-coverage-bug-fixes | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Example: Test Coverage for Bug Fixes

**Purpose**: Demonstrate how tests prevent regression when fixing bugs.

**Last Updated**: 2026-03-11

---

## Bug #1: Floating-Point Precision

**Bug**: `0.1 + 0.2 = 0.30000000000000004`

**Test**:
```javascript
Test.test('handles floating-point precision', () => {
    Test.assertEqual(Calculator.round(0.1 + 0.2, 2), 0.3);
    Test.assertEqual(Calculator.round(75.5 - 75.2, 2), 0.3);
});
```

**Fix**:
```javascript
round(value, decimals = 2) {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
}
```

---

## Bug #2: Date Parsing Edge Case

**Bug**: `parseDate('2026-02-30')` → `2026-03-02` (rolled over!)

**Test**:
```javascript
Test.test('rejects invalid dates', () => {
    const result = Utils.parseDate('2026-02-30');
    Test.assertEqual(result.valid, false);
});
```

**Fix**:
```javascript
parseDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { valid: false, error: 'invalid_date' };
    
    // Check if date rolled over
    const parts = dateString.split('-');
    if (date.getMonth() + 1 !== parseInt(parts[1])) {
        return { valid: false, error: 'invalid_date' };
    }
    return { valid: true, date };
}
```

---

## Bug #3: Sync Queue Duplicate

**Bug**: Network fails mid-request, retry creates duplicate

**Test**:
```javascript
Test.test('does not create duplicates on retry', async () => {
    Sync.addToQueue(operation);
    await Sync.processQueue();  // Fails
    Test.assertEqual(Sync.getQueue().length, 1);  // Not duplicated
    
    await Sync.processQueue();  // Succeeds
    Test.assertEqual(Sync.getQueue().length, 0);
});
```

**Fix**: Track processed operations with Set to prevent duplicates

---

## Bug #4: Auth Token Expiry

**Bug**: Token expires, app doesn't refresh → 401 errors

**Test**:
```javascript
Test.test('refreshes expired token', async () => {
    Auth.setSession({ expires_at: Date.now() / 1000 - 100 });  // Expired
    const token = await Auth.getToken();
    Test.assertNotEqual(token, 'expired-token');
});
```

**Fix**:
```javascript
async getToken() {
    const session = await supabase.auth.getSession();
    if (session.data.session?.expires_at < Date.now() / 1000) {
        const refreshed = await supabase.auth.refreshSession();
        return refreshed.data.session?.access_token;
    }
    return session.data.session?.access_token;
}
```

---

## Regression Prevention

After fixing each bug:
1. **Keep the test** in test suite
2. **Run all tests**: `node tests/node-test.js`
3. **Add related tests** for edge cases

**References**:
- `tests/calculator.test.js` — Floating-point tests
- `tests/utils.test.js` — Date validation tests
- `tests/sync.test.js` — Sync queue tests

**Related**:
- [concepts/test-driven-development.md](../concepts/test-driven-development.md)
- [examples/e2e-integration-checks.md](e2e-integration-checks.md)
- [guides/testing-auth-flow.md](../guides/testing-auth-flow.md)

(End of file - total 119 lines)
