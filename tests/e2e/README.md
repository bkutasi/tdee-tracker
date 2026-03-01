# E2E Integration Tests

These tests catch integration bugs that unit tests miss by checking API compatibility between modules.

## What These Tests Catch

The integration checks would have caught all 3 bugs we encountered during the Supabase sync implementation:

1. **Missing Export**: `fetchAndMergeData` not exported from Sync module
2. **Missing Method**: `Auth._getSupabase()` not exposed
3. **Wrong API**: Using non-existent `Storage.clearEntries()` and `Storage.addEntry()`

## Run Integration Checks

```bash
# Run integration checks (fast, static analysis)
node tests/e2e/integration-checks.test.js

# Run all tests including integration
node tests/node-test.js
```

## CI/CD Integration

Add to your CI/CD pipeline:

```yaml
- name: Run E2E Integration Checks
  run: node tests/e2e/integration-checks.test.js
```

## Test Coverage

### Module Integration
- ✓ Sync exports all required methods
- ✓ Auth exposes Supabase client
- ✓ Storage has correct API (no wrong methods)

### API Compatibility
- ✓ Sync uses correct Storage API
- ✓ Sync calls Auth correctly
- ✓ Error handling in place

### Code Quality
- ✓ No obvious "is not a function" errors
- ✓ All public methods defined and exported

## When to Run

- **Before every commit**: Run full test suite
- **In CI/CD**: Run integration checks on every push
- **After refactoring**: Run integration checks to catch breaking changes

## Expected Output

```
=== E2E Integration Checks ===

✓ E2E: Sync exports fetchAndMergeData function
✓ E2E: Auth exposes _getSupabase method
✓ E2E: Storage does NOT have clearEntries (wrong API)
✓ E2E: Storage does NOT have addEntry (wrong API)
...

Results: 12 passed, 0 failed

✓ All integration checks passed!

These checks would have caught:
  1. Missing fetchAndMergeData export ✓
  2. Missing Auth._getSupabase() ✓
  3. Wrong Storage API usage ✓
```

## Adding New Integration Checks

When adding new cross-module integrations, add a test:

```javascript
test('E2E: ModuleA calls ModuleB.correctMethod()', () => {
    expect(moduleACode).toContain('ModuleB.correctMethod');
});
```

## Limitations

These are static analysis tests. They check:
- ✓ API compatibility
- ✓ Method existence
- ✓ Correct usage patterns

They don't check:
- ✗ Runtime behavior (use unit tests for that)
- ✗ Actual Supabase connectivity (use manual testing)
- ✗ UI integration (use browser tests)
