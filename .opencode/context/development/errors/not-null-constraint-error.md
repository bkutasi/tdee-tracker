<!-- Context: development/errors/not-null-constraint-error | Priority: high | Version: 1.0 | Updated: 2026-03-11 -->

# Error: NOT NULL Constraint Violations

**Purpose**: Diagnose and fix database errors when required fields are missing.

**Last Updated**: 2026-03-11

---

## Error Message

```
ERROR: null value in column "user_id" violates not-null constraint
Code: 23502
```

---

## Common Causes

### 1. Missing user_id

```javascript
// ❌ Wrong
await supabase.from('weight_entries').insert({ date: '2026-03-11', weight: 75.5 });

// ✅ Correct
const user = Auth.getCurrentUser();
await supabase.from('weight_entries').insert({
    user_id: user.id, date: '2026-03-11', weight: 75.5
});
```

### 2. Unauthenticated User

```javascript
// ❌ Wrong: Not checking auth
async function saveEntry(data) {
    await supabase.from('weight_entries').insert(data);
}

// ✅ Correct
async function saveEntry(data) {
    if (!Auth.isAuthenticated()) throw new Error('User not authenticated');
    data.user_id = Auth.getCurrentUser().id;
    await supabase.from('weight_entries').insert(data);
}
```

---

## Debugging Steps

### Check Error Details
```javascript
try {
    await supabase.from('weight_entries').insert(data);
} catch (error) {
    console.error('Code:', error.code);  // 23502
    console.error('Details:', error.details);
}
```

### Verify Data Before Insert
```javascript
function validateEntry(data) {
    const required = ['user_id', 'date', 'weight'];
    const missing = required.filter(key => !data[key]);
    if (missing.length > 0) throw new Error(`Missing: ${missing.join(', ')}`);
}
```

### Check Auth State
```javascript
console.log('Authenticated:', Auth.isAuthenticated());
console.log('User ID:', Auth.getCurrentUser()?.id);
```

---

## Solutions

### 1. Add Validation Layer
```javascript
async function saveWeightEntry(entry) {
    if (!entry.user_id) {
        const user = Auth.getCurrentUser();
        if (!user) throw new Error('NOT_NULL: User not authenticated');
        entry.user_id = user.id;
    }
    if (!entry.date || !entry.weight) throw new Error('NOT_NULL: Missing fields');
    return await supabase.from('weight_entries').insert(entry);
}
```

### 2. Default Values (if appropriate)
```sql
ALTER TABLE weight_entries ALTER COLUMN created_at SET DEFAULT NOW();
```

### 3. Make Column Nullable (last resort)
```sql
ALTER TABLE weight_entries ALTER COLUMN notes DROP NOT NULL;
```

---

## Prevention

### Schema Documentation
```sql
COMMENT ON COLUMN weight_entries.user_id IS 
'Required: References auth.users, set from current session';
```

### Client-Side Validation
```javascript
function validateWeightEntry(entry) {
    const errors = [];
    if (!entry.user_id) errors.push('user_id required');
    if (!entry.date) errors.push('date required');
    if (!entry.weight) errors.push('weight required');
    return { valid: errors.length === 0, errors };
}
```

---

## Related Errors

| Error | Code | Cause |
|-------|------|-------|
| Foreign key violation | 23503 | Referenced user doesn't exist |
| Unique violation | 23505 | Duplicate date for same user |

**References**:
- `supabase-schema.sql` — Table definitions
- `js/sync.js` — Insert operations

**Related**:
- [concepts/row-level-security.md](../concepts/row-level-security.md)
- [examples/supabase-schema.md](../examples/supabase-schema.md)
- [errors/sync-integration-errors.md](sync-integration-errors.md)

(End of file - total 127 lines)
