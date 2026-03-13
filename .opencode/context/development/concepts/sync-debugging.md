<!-- Context: development/concepts/sync-debugging | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Concept: Sync Debugging Strategies

**Purpose**: Systematic approach to diagnosing and fixing offline-first sync issues in production and development.

**Last Updated**: 2026-03-11

---

## Core Idea

Sync debugging requires checking multiple layers: local storage, sync queue, network status, auth state, and Supabase logs. Use a systematic approach to isolate the failure point.

## Debug Layers

```
1. LocalStorage → Is data saved locally?
2. Sync Queue → Is operation queued?
3. Network → Is device online?
4. Auth → Is user authenticated?
5. Supabase → Did request reach server?
6. RLS → Did policy allow operation?
```

## Debug Workflow

### Step 1: Check LocalStorage

```javascript
// Browser console
const entries = localStorage.getItem('weight-entries');
console.log('Local data:', JSON.parse(entries));
```

**Expected**: Data present with correct structure

### Step 2: Check Sync Queue

```javascript
// Browser console
const queue = localStorage.getItem('sync-queue');
console.log('Queue:', JSON.parse(queue));
```

**Expected**: Queue empty (synced) or contains pending operations

### Step 3: Check Auth State

```javascript
// Browser console
console.log('Authenticated:', Auth.isAuthenticated());
console.log('User:', Auth.getCurrentUser());
console.log('Token:', Auth.getToken());
```

**Expected**: `isAuthenticated() === true`, valid user object

### Step 4: Check Network

```javascript
// Browser console
console.log('Online:', navigator.onLine);

// Check sync status
console.log('Sync status:', Sync.getStatus());
```

**Expected**: `navigator.onLine === true`, sync processing

### Step 5: Check Supabase Logs

1. Supabase Dashboard → Logs → API
2. Filter by user's JWT or operation type
3. Look for errors or rejections

**Expected**: Successful INSERT/UPDATE with 200/201 status

### Step 6: Check RLS Policies

```sql
-- Supabase SQL Editor
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'weight_entries';
```

**Expected**: Policies exist for INSERT, UPDATE, SELECT, DELETE

## Common Sync Issues

| Symptom | Likely Cause | Debug Step |
|---------|--------------|------------|
| Data not in Supabase | Not authenticated | Step 3 |
| Queue growing | Network offline | Step 4 |
| 401 errors | Token expired | Step 3, refresh |
| 403 errors | RLS policy blocking | Step 6 |
| Duplicate entries | Retry without dedup | Check queue logic |

## Console Logging Strategy

```javascript
// Add debug logging to sync.js
const DEBUG = true;

function log(message, data) {
    if (DEBUG) {
        console.log(`[Sync Debug] ${message}`, data);
    }
}

// Log key operations
log('Queue operation', { type, table, data });
log('Sync result', { success, error });
log('Auth state', { authenticated, user: Auth.getCurrentUser() });
```

**References**:
- `js/sync.js` — Sync logic with queue management (1050 lines)
- `js/storage.js` — LocalStorage operations (510 lines)
- `js/auth.js` — Auth state management (387 lines)

**Related**:
- [concepts/offline-first-sync.md](offline-first-sync.md)
- [concepts/supabase-auth.md](supabase-auth.md)
- [errors/auth-errors.md](../errors/auth-errors.md)
- [errors/sync-integration-errors.md](../errors/sync-integration-errors.md)

(End of file - total 109 lines)
