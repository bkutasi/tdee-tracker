# Pre-Commit ESLint Error Blocking - Implementation Notes

## Date: 2026-03-30
## Task: Phase 5.1 - Block on ESLint Errors

## Problem
The pre-commit hook treated ALL ESLint output as "non-blocking warnings", which allowed 62 ESLint problems to accumulate and block CI/CD.

## Solution
Updated `.git/hooks/pre-commit` to:
1. Run ESLint with `--format json` for reliable error detection
2. Parse JSON output to extract `errorCount` from all staged files
3. Block commit (exit 1) if ANY errors found (severity: 2)
4. Allow warnings through (exit 0) if only warnings exist (severity: 1)

## Key Implementation Details

### Error Detection
```bash
# Run ESLint in JSON format
lint_json=$(npx eslint $staged_files --format json 2>&1)

# Sum error counts from all files
error_count=$(echo "$lint_json" | grep -o '"errorCount":[0-9]*' | cut -d':' -f2 | awk '{s+=$1} END {print s}')
```

### Critical Gotcha: `set -e` Interaction
When running ESLint twice (once for JSON, once for human-readable), MUST wrap BOTH calls with `set +e`:

```bash
set +e  # Disable exit-on-error
lint_json=$(npx eslint $staged_files --format json 2>&1)
lint_exit_code=$?
set -e  # Restore

# Later, when showing human-readable output:
if [ "$error_count" -gt 0 ]; then
    set +e  # MUST disable again!
    lint_human=$(npx eslint $staged_files 2>&1)
    set -e
    # ... show error message ...
    exit 1
fi
```

Without the second `set +e`, the script exits immediately when ESLint returns non-zero.

### Multi-File Handling
When multiple files are staged, JSON output contains multiple objects:
```json
[{"errorCount":1,...},{"errorCount":0,...}]
```

Must SUM all error counts using `awk`:
```bash
error_count=$(echo "$lint_json" | grep -o '"errorCount":[0-9]*' | cut -d':' -f2 | awk '{s+=$1} END {print s}')
```

## Testing

### Test 1: Error Blocks Commit
```bash
echo "return; console.log('x');" > js/test-error.js  # no-unreachable
git add js/test-error.js
.git/hooks/pre-commit  # Exit code 1, shows error message
```

### Test 2: Warning Allows Commit
```bash
echo "var x = 'test';" > js/test-warning.js  # no-unused-vars (warning)
git add js/test-warning.js
.git/hooks/pre-commit  # Exit code 0, shows warning, continues to tests
```

### Test 3: Mixed Error+Warning Blocks
```bash
git add js/test-error.js js/test-warning.js
.git/hooks/pre-commit  # Exit code 1, blocks on error
```

## Files Modified
- `.git/hooks/pre-commit` (lines 35-84)

## Benefits
- ✅ Prevents future accumulation of ESLint errors
- ✅ Developers get immediate feedback at commit time
- ✅ Warnings don't block workflow (style issues can be fixed later)
- ✅ Clear error messages with fix commands
- ✅ Maintains existing E2E and unit test checks

## Related
- Phase 5.1: Pre-commit hook quality enforcement
- ESLint config: `eslint.config.js` (defines error vs warning rules)
