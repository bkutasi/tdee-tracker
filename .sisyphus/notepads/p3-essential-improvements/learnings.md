
## P3-10: Add 30s Timeout to syncAll() - Implementation Learnings

**Date**: 2026-03-30  
**Task**: Add timeout wrapper to prevent indefinite sync hangs

### Implementation Pattern

Used `Promise.race()` to wrap existing sync logic with a timeout:

```javascript
async function syncAll() {
    const TIMEOUT_MS = 30000; // 30 seconds
    
    const syncPromise = (async () => {
        // ... existing sync logic ...
    })();
    
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Sync timeout after 30s')), TIMEOUT_MS);
    });
    
    try {
        return await Promise.race([syncPromise, timeoutPromise]);
    } catch (error) {
        if (error.message.includes('timeout')) {
            _SyncDebug.error('Sync timed out:', error);
            isSyncing = false;
            return { success: false, error: 'Sync timed out. Please check connection.' };
        }
        throw error;
    }
}
```

### Key Points

1. **Timeout constant**: `TIMEOUT_MS = 30000` defined at function top
2. **Promise.race pattern**: Races sync logic against timeout promise
3. **Error handling**: Returns `{success: false, error: '...'}` on timeout (matches existing pattern)
4. **State cleanup**: Resets `isSyncing = false` on timeout to prevent stuck state
5. **User-friendly message**: "Sync timed out. Please check connection."
6. **Preserves functionality**: All existing sync logic unchanged

### Testing

- All 132 existing tests pass
- No changes to sync tests needed (timeout is transparent to test mocks)
- Timeout only triggers in real network conditions

### Benefits

- Prevents indefinite hangs on slow/unstable connections
- Provides clear user feedback on timeout
- Allows retry logic to work properly (no stuck sync state)
- Consistent with existing error handling patterns


## P3-11: Exponential Backoff for Retry Delays (2026-03-30)

### Implementation

Added exponential backoff to sync retry mechanism in `js/sync.js`:

**New Function:**
```javascript
function sleepWithBackoff(attempt) {
    const baseDelay = 1000;  // 1 second
    const maxDelay = 30000;  // 30 seconds cap
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return new Promise(resolve => setTimeout(resolve, delay));
}
```

**Retry Sequence:** 1s → 2s → 4s → 8s → 16s (capped at 30s max)

**Changes:**
- Added `sleepWithBackoff(attempt)` function after existing `sleep(ms)` helper
- Updated `executeOperation()` to include retry loop with exponential backoff
- Loop runs `MAX_RETRIES + 1` attempts (4 total: attempt 0, 1, 2, 3)
- Duplicate key errors still skip retry (won't succeed on retry)
- Error logging improved: shows "Attempt X failed, retrying with backoff..."

**Key Pattern:**
```javascript
for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
        // ... try operation
        if (result.success) return true;
        
        if (attempt === MAX_RETRIES) {
            // Last attempt - record error and return
            return false;
        }
        
        // Wait with exponential backoff before retry
        await sleepWithBackoff(attempt);
    } catch (error) {
        if (attempt === MAX_RETRIES) {
            // Last attempt - record error and return
            return false;
        }
        await sleepWithBackoff(attempt);
    }
}
```

### Verification

- ✅ All 132 tests pass
- ✅ No changes to `MAX_RETRIES` constant (still 3)
- ✅ No changes to timeout logic (P3-10 separate)
- ✅ Follows existing IIFE pattern and code style
- ✅ JSDoc comment added to new function

### Benefits

1. **Reduces API thrashing** - Spaced retries prevent overwhelming Supabase during outages
2. **Better resource usage** - Longer waits for persistent failures
3. **Industry standard** - Exponential backoff is best practice for retry mechanisms
4. **Configurable** - Easy to adjust base delay or max cap if needed


## P3-14: SRI Integrity Hashes for Supabase CDN (2026-03-30)

### Task
Add Subresource Integrity (SRI) hashes to Supabase CDN script tag in `js/auth.js`.

### Implementation
**File Modified**: `js/auth.js` (line 78)

**Before**:
```javascript
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.0/dist/umd/supabase.min.js';
script.crossOrigin = 'anonymous';
```

**After**:
```javascript
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.0/dist/umd/supabase.min.js';
script.integrity = 'sha384-fm42zLXjam4N3lT5umWgNtBBPMP3Ddrdmr9lnPKtDWzs5Dqy457Yn6+eTvCgRU3n';
script.crossOrigin = 'anonymous';
```

### SRI Hash Generation Command
```bash
curl -s https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.47.0/dist/umd/supabase.min.js \
  | openssl dgst -sha384 -binary \
  | openssl base64 -A
```

**Generated Hash**: `sha384-fm42zLXjam4N3lT5umWgNtBBPMP3Ddrdmr9lnPKtDWzs5Dqy457Yn6+eTvCgRU3n`

### Verification
- ✅ All 132 tests pass (`node tests/node-test.js`)
- ✅ Script tag includes `integrity` and `crossorigin` attributes
- ✅ Supabase version unchanged (2.47.0)
- ✅ No other script tags modified

### Security Benefits
- Browser verifies downloaded script matches expected hash
- Prevents CDN compromise attacks (malicious script injection)
- Ensures script integrity even if CDN is compromised
- Fails safely if hash doesn't match (script won't execute)

### Notes
- Supabase client loaded dynamically in `js/auth.js` (not in `index.html`)
- Hash must be regenerated when version is updated
- Use SHA-384 for best browser compatibility
- `crossorigin="anonymous"` required for SRI to work

