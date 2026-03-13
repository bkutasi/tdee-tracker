<!-- Context: testing/examples/e2e-integration-checks | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Example: End-to-End Integration Checks

**Purpose**: Verify complete user workflows across all system components.

**Last Updated**: 2026-03-11

---

## What is E2E Testing?

E2E tests simulate real user interactions across the entire application stack.

| Aspect | Unit Tests | E2E Tests |
|--------|-----------|-----------|
| **Scope** | Single function | Complete workflow |
| **Speed** | Fast (<1s) | Slow (5-30s) |
| **Dependencies** | Mocked | Real |

---

## E2E Test: Complete User Journey

```javascript
Test.describe('E2E: User Journey', () => {
    Test.test('complete flow', async () => {
        const email = `test+${Date.now()}@example.com`;
        
        // Sign up
        await Auth.signUp(email);
        await Auth.verifyEmail(email);
        Test.assertEqual(Auth.isAuthenticated(), true);
        
        // Add entry
        await Storage.saveEntry({ date: '2026-03-11', weight: 75.5 });
        await Test.waitFor(() => Sync.getQueue().length === 0, 5000);
        
        // Verify in Supabase
        const entries = await Sync.fetchFromSupabase();
        Test.assertEqual(entries.length, 1);
        
        // Sign out → Sign in → Verify data persisted
        await Auth.signOut();
        await Auth.signInWithMagicLink(email);
        const entries2 = await Sync.fetchFromSupabase();
        Test.assertEqual(entries2.length, 1);
        
        await Auth.deleteAccount(email);  // Cleanup
    });
});
```

---

## E2E Test: Multi-Device Sync

```javascript
Test.describe('E2E: Multi-Device Sync', () => {
    Test.test('syncs across devices', async () => {
        const email = `sync+${Date.now()}@example.com`;
        
        // Device A: Sign in and add entry
        const deviceA = new TestDevice('A');
        await deviceA.signIn(email);
        await deviceA.addEntry({ date: '2026-03-11', weight: 75.5 });
        await deviceA.waitForSync();
        
        // Device B: Sign in (same user)
        const deviceB = new TestDevice('B');
        await deviceB.signIn(email);
        await deviceB.waitForSync();
        
        // Verify Device B has Device A's entry
        Test.assertEqual(deviceB.getEntries().length, 1);
        
        await deviceA.cleanup();
        await deviceB.cleanup();
    });
});
```

---

## E2E Test: Offline Mode

```javascript
Test.describe('E2E: Offline Mode', () => {
    Test.test('queues operations when offline', async () => {
        await Auth.signInWithMagicLink('test@example.com');
        
        // Go offline
        Test.setOffline(true);
        
        // Add entry (saves locally, queues for sync)
        await Storage.saveEntry({ date: '2026-03-11', weight: 75.5 });
        Test.assertEqual(Storage.getEntries().length, 1);
        Test.assertEqual(Sync.getQueue().length, 1);
        
        // Go online → Sync
        Test.setOffline(false);
        await Test.waitFor(() => Sync.getQueue().length === 0, 10000);
        
        const entries = await Sync.fetchFromSupabase();
        Test.assertEqual(entries.length, 1);
    });
});
```

---

## E2E Test: Error Recovery

```javascript
Test.describe('E2E: Error Recovery', () => {
    Test.test('retries failed sync', async () => {
        await Auth.signInWithMagicLink('test@example.com');
        
        // Mock Supabase failure (2 times)
        Test.mockSupabase({ fail: true, times: 2 });
        
        await Storage.saveEntry({ date: '2026-03-11', weight: 75.5 });
        await Sync.syncAll();  // Fails
        Test.assertEqual(Sync.getQueue().length, 1);
        
        // Remove mock → Sync succeeds
        Test.mockSupabase({ fail: false });
        await Sync.syncAll();
        Test.assertEqual(Sync.getQueue().length, 0);
    });
});
```

---

## Running E2E Tests

```bash
# Run all tests (includes E2E)
node tests/node-test.js

# Run specific E2E test
node tests/e2e/user-journey.test.js

# Run in browser (full suite)
open tests/test-runner.html
```

---

## E2E Best Practices

1. **Isolate tests**: Each test cleans up after itself
2. **Use unique data**: Timestamps in emails prevent conflicts
3. **Wait for async**: Use `Test.waitFor()` for async operations
4. **Minimal mocks**: Only mock external services
5. **Fast failure**: Fail fast on critical errors

**References**:
- `tests/e2e/` — E2E test directory
- `tests/test-runner.html` — Browser test runner

**Related**:
- [concepts/test-driven-development.md](../concepts/test-driven-development.md)
- [examples/test-coverage-bug-fixes.md](test-coverage-bug-fixes.md)
- [guides/testing-auth-flow.md](../guides/testing-auth-flow.md)

(End of file - total 143 lines)
