# Learnings: ESLint Block-Scoped-Var Fix in IIFE Modules

## Pattern: Fixing `block-scoped-var` in IIFE

When `AppConstants` (or any variable) is declared inside an `if` block but used outside, ESLint flags it as `block-scoped-var`.

### Problem
```javascript
const Sync = (function() {
    let isInitialized = false;
    
    if (typeof window === 'undefined') {
        var AppConstants = { ... };  // ❌ Declared inside block
    }
    
    const SYNC_INTERVAL = AppConstants?.SYNC_INTERVAL_MS || 30000;  // ❌ Used outside block
})();
```

### Solution
Declare the variable at the TOP of the IIFE, before the `if` block:

```javascript
const Sync = (function() {
    var AppConstants;  // ✅ Declare first
    
    if (typeof window === 'undefined') {
        AppConstants = { ... };  // ✅ Assign inside block
    }
    
    const SYNC_INTERVAL = AppConstants?.SYNC_INTERVAL_MS || 30000;  // ✅ Safe to use
})();
```

### Why This Works
- `var` is function-scoped, not block-scoped
- Declaring at the top makes it visible throughout the IIFE
- Assignment can still happen conditionally inside the `if` block
- Matches the pattern already used in `utils.js`

## Files Fixed
- `js/sync.js` (2026-03-30) - Phase 2.3

## Related ESLint Fixes
1. **Unused eslint-disable directive** (Phase 2.1)
   - Simply remove the unused directive
2. **Unused variable** (Phase 2.2)
   - Remove `let supabase = null;` that was never used

## Verification
```bash
npx eslint js/sync.js --format=json
# Should show dramatically reduced warnings
```
