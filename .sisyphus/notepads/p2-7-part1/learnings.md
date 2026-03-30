# P2-7 Part 1: Constants File Creation

## Successful Approach

### File Structure
- Created `js/constants.js` with IIFE pattern exposing `window.AppConstants`
- Added JSDoc-style header comment for module documentation
- Grouped constants by category: time, sync, storage, validation

### Script Loading Order
- Placed after `errors.js` and before `calculator-ewma.js`
- Ensures constants available early for all modules
- Follows existing dependency graph pattern

### Constants Included
```javascript
{
    // Time (ms)
    MS_PER_SECOND: 1000,
    MS_PER_MINUTE: 60000,
    MS_PER_HOUR: 3600000,
    MS_PER_DAY: 86400000,
    
    // Sync
    SYNC_INTERVAL_MS: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    
    // Storage
    MAX_STORAGE_ENTRIES: 10000,
    STORAGE_KEY_ENTRIES: 'tdee_entries',
    STORAGE_KEY_SETTINGS: 'tdee_settings',
    
    // Validation
    MIN_WEIGHT_KG: 20,
    MAX_WEIGHT_KG: 300,
    MIN_CALORIES: 500,
    MAX_CALORIES: 10000
}
```

## Key Points
- Comments are necessary for categorization in constants files
- No replacement of magic numbers yet (Parts 2-3 will handle this)
- File exposed as global `window.AppConstants` for module access
- All tests pass without modification (constants not yet used)

## Date: 2026-03-30
