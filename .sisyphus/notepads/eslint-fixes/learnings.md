## ESLint Documentation Added to AGENTS.md

**Date**: 2026-03-30
**Phase**: 7.2

### What Was Done
- Verified ESLint section exists in AGENTS.md Section 11 (Anti-Patterns)
- Section located at lines 742-761
- Content matches required specification exactly

### Documentation Includes
- Configuration details (eslint.config.js, flat config, ESLint v9+)
- Pre-commit requirement (npx eslint js/ must pass with 0 errors)
- Auto-fix command (npx eslint js/ --fix)
- IIFE Pattern Support (5 patterns: unused catch params, event handlers, var hoisting, return assignments, deep nesting)
- Anti-Patterns (4 items: ignore errors, disable rules, .eslintrc usage, unused variables)

### Verification
```bash
grep -A20 "ESLint" AGENTS.md
```
Confirmed section present and correctly formatted.

### Key Points for Future Agents
- ESLint must pass before every commit
- IIFE patterns are explicitly supported in config
- Only flat config (eslint.config.js) allowed, no .eslintrc.*
- Underscore prefix for intentionally unused variables
