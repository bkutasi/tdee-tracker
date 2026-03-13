<!-- Context: development/errors/sync-integration-errors | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Error: Sync Integration Issues

**Purpose**: Diagnose and fix synchronization problems between LocalStorage and Supabase.

**Last Updated**: 2026-03-11

---

## Sync Queue Not Processing

**Symptoms**: Data in app but not in Supabase, queue growing

**Causes**: Not authenticated, network offline, sync disabled

**Debug**:
```javascript
const status = Sync.getStatus();
console.log('Queue:', status.queueLength, 'Online:', navigator.onLine);
console.log('Authenticated:', Auth.isAuthenticated());
await Sync.syncAll();  // Force sync
```

---

## Duplicate Entries Created

**Cause**: Retry logic creates duplicates on network failure

**Solution**:
```sql
-- Ensure unique constraint
ALTER TABLE weight_entries ADD CONSTRAINT unique_user_date UNIQUE (user_id, date);
```

```javascript
// Handle duplicate key error
const { error } = await supabase.from('weight_entries').insert(entry);
if (error?.code === '23505') {
    // Update instead
    await supabase.from('weight_entries').update(entry).eq('id', entry.id);
}
```

---

## Data Loss During Sync

**Cause**: Deleting local data before confirming server save

**Solution**:
```javascript
async function syncOperation(operation) {
    try {
        await supabase.from(operation.table).insert(operation.data);
        removeFromQueue(operation.id);  // Only on success
    } catch (error) {
        operation.retries++;  // Keep in queue
        scheduleRetry(operation);
    }
}
```

---

## Conflict: Local vs Remote

**Resolution**: "Newest timestamp wins"
```javascript
function resolveConflict(local, remote) {
    if (local.updated_at > remote.updated_at) {
        await supabase.from('entries').update(local).eq('id', local.id);
        return local;
    } else {
        Storage.updateEntry(remote);
        return remote;
    }
}
```

---

## Sync Loop (Infinite Retries)

**Cause**: Permanent error (RLS blocks), retry limit not enforced

**Solution**:
```javascript
const MAX_RETRIES = 5;
if (operation.retries >= MAX_RETRIES) {
    moveToDeadLetter(operation);  // Move to dead letter queue
    removeFromQueue(operation.id);
}
```

---

## Network Timeout

**Solution**:
```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

const { error } = await supabase.from('entries').insert(entries, { signal: controller.signal });
clearTimeout(timeoutId);

if (error?.name === 'AbortError') {
    // Will retry with backoff
}
```

---

## Debug Checklist

- [ ] Check `navigator.onLine`
- [ ] Verify `Auth.isAuthenticated()`
- [ ] Inspect sync queue length
- [ ] Check browser console for errors
- [ ] Verify Supabase logs (Dashboard → Logs)
- [ ] Test RLS policies in SQL Editor

**References**:
- `js/sync.js` — Sync implementation (1050 lines)
- `js/storage.js` — LocalStorage operations

**Related**:
- [concepts/offline-first-sync.md](../concepts/offline-first-sync.md)
- [concepts/sync-debugging.md](../concepts/sync-debugging.md)
- [errors/auth-errors.md](auth-errors.md)

(End of file - total 127 lines)
