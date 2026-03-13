<!-- Context: testing/guides/testing-auth-flow | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Guide: Testing Authentication Flow

**Purpose**: Step-by-step instructions for testing Supabase Auth integration.

**Last Updated**: 2026-03-11

---

## Overview

Auth testing requires multiple layers: unit tests (logic), integration tests (API), E2E tests (user flows).

---

## Step 1: Unit Tests (Auth Module)

Test auth logic with mocked Supabase client.

```javascript
Test.describe('Auth Module', () => {
    Test.test('signInWithMagicLink calls Supabase', async () => {
        const mockSupabase = {
            auth: { signInWithOtp: Test.fn().resolves({ data: {}, error: null }) }
        };
        Auth.init(mockSupabase);
        await Auth.signInWithMagicLink('test@example.com');
        Test.assertEqual(mockSupabase.auth.signInWithOtp.calls.length, 1);
    });
    
    Test.test('isAuthenticated checks session', () => {
        Auth.setSession({ access_token: 'valid-token' });
        Test.assertEqual(Auth.isAuthenticated(), true);
    });
});
```

---

## Step 2: Integration Tests (Supabase API)

Test actual Supabase API with test user account.

```javascript
Test.describe('Auth Integration', () => {
    const TEST_EMAIL = `test+${Date.now()}@example.com`;
    
    Test.test('creates user with magic link', async () => {
        await Auth.signInWithMagicLink(TEST_EMAIL);
        const users = await SupabaseAdmin.listUsers();
        Test.assertNotEqual(users.find(u => u.email === TEST_EMAIL), undefined);
        await SupabaseAdmin.deleteUser(users[0].id);  // Cleanup
    });
});
```

---

## Step 3: E2E Tests (Complete Flow)

Test complete user journey.

```javascript
Test.describe('E2E: Auth Flow', () => {
    Test.test('complete auth lifecycle', async () => {
        const email = `e2e+${Date.now()}@example.com`;
        
        // Sign up → Verify → Add entry → Sign out → Sign in → Verify data
        await Auth.signUp(email);
        await Auth.verifyEmail(email);
        await Storage.saveEntry({ date: '2026-03-11', weight: 75.5 });
        await Sync.syncAll();
        await Auth.signOut();
        await Auth.signInWithMagicLink(email);
        
        const entries = await Sync.fetchFromSupabase();
        Test.assertEqual(entries.length, 1);
        await Auth.deleteAccount(email);  // Cleanup
    });
});
```

---

## Step 4: Error Scenarios

```javascript
Test.describe('Auth Error Handling', () => {
    Test.test('handles invalid email', async () => {
        const result = await Auth.signInWithMagicLink('not-an-email');
        Test.assertEqual(result.success, false);
    });
    
    Test.test('handles expired token', async () => {
        Auth.setSession({ expires_at: Date.now() / 1000 - 100 });
        const token = await Auth.getToken();
        Test.assertNotEqual(token, 'expired');
    });
    
    Test.test('handles network error', async () => {
        Test.setOffline(true);
        const result = await Auth.signInWithMagicLink('test@example.com');
        Test.assertEqual(result.success, false);
        Test.setOffline(false);
    });
});
```

---

## Step 5: Security Tests

```javascript
Test.describe('Auth Security', () => {
    Test.test('token not exposed in console', () => {
        const logs = [];
        console.log = (...args) => logs.push(args);
        Auth.setSession({ access_token: 'secret-token' });
        const tokenInLogs = logs.some(log => log.some(arg => arg.includes('secret-token')));
        Test.assertEqual(tokenInLogs, false);
    });
    
    Test.test('session cleared on sign out', async () => {
        Auth.setSession({ access_token: 'token' });
        await Auth.signOut();
        Test.assertEqual(Auth.getSession(), null);
    });
});
```

---

## Test Configuration

**Environment Variables** (`.env.test`):
```bash
SUPABASE_URL=https://xyzcompany.supabase.co
SUPABASE_TEST_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

**Setup**:
```javascript
Test.beforeAll(() => {
    Auth.init({ url: process.env.SUPABASE_URL, anonKey: process.env.SUPABASE_ANON_KEY });
});

Test.afterEach(() => {
    localStorage.clear();
    Auth.signOut();
});
```

**References**:
- `tests/auth.test.js` — Auth unit tests
- `tests/e2e/auth-flow.test.js` — E2E auth tests

**Related**:
- [concepts/supabase-auth.md](../../development/concepts/supabase-auth.md)
- [examples/magic-link-flow.md](../../development/examples/magic-link-flow.md)
- [examples/test-coverage-bug-fixes.md](../examples/test-coverage-bug-fixes.md)

(End of file - total 143 lines)
