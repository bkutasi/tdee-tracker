<!-- Context: development/concepts/offline-first-sync | Priority: critical | Version: 1.0 | Updated: 2026-03-02 -->

# Concept: Offline-First Sync Strategy

**Purpose**: Ensure data persistence and cross-device sync even when offline, with automatic retry and conflict resolution.

**Last Updated**: 2026-03-02

---

## Core Idea

Offline-first architecture prioritizes LocalStorage for immediate saves, queues operations for background sync, and uses exponential backoff retry with "newest timestamp wins" conflict resolution.

## Key Points

- **Immediate Local Save**: All operations save to LocalStorage first (instant UI response)
- **Sync Queue**: Pending operations stored in queue, processed when online
- **Exponential Backoff**: Retry failed syncs with increasing delays (1s, 2s, 4s, 8s...)
- **Conflict Resolution**: Newest timestamp wins for concurrent edits
- **Multi-Tab Sync**: BroadcastChannel syncs auth state across browser tabs

## Sync Flow

```
1. User action → Save to LocalStorage (immediate)
2. Queue operation → { type, table, data, timestamp, retries }
3. Check online status → If online, process queue
4. Sync to Supabase → On success, remove from queue
5. On failure → Increment retries, schedule retry with backoff
```

## Sync Queue Structure

```javascript
{
  id: "uuid",
  type: "create", // or "update", "delete"
  table: "weight_entries",
  data: { date: "2026-03-02", weight: 75.5 },
  timestamp: 1741017600000,
  retries: 0
}
```

## Quick Example

```javascript
// Save with automatic sync
await Sync.saveWeightEntry({
    date: '2026-03-02',
    weight: 75.5,
    calories: 2500
});

// Manual sync (force)
await Sync.syncAll();

// Check sync status
const status = Sync.getStatus();
console.log('Queue length:', status.queueLength);
```

**References**:
- `js/sync.js` — Sync logic with queue, retry, conflict resolution (1050 lines)
- `js/storage.js` — LocalStorage wrapper (510 lines)
- `js/auth.js` — Auth state management for sync

**Related**:
- [concepts/supabase-auth.md](supabase-auth.md)
- [concepts/jwt-session.md](jwt-session.md)
- [examples/supabase-schema.md](../examples/supabase-schema.md)
- [errors/auth-errors.md](../errors/auth-errors.md)

(End of file - total 60 lines)
