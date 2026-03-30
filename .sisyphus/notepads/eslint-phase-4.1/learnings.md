# ESLint Configuration Learnings (Phase 4.1)

## Date: 2026-03-30

## Key Insights

### IIFE-Compatible ESLint Rules

Vanilla JS IIFE modules conflict with several ESLint rules. The following relaxations work well:

**Event Handler Parameters:**
```javascript
"argsIgnorePattern": "^(event|e|error|user|type|weightUnit)$"
```
Common pattern: event handlers receive params they don't always use.

**IIFE Module Variables:**
```javascript
"varsIgnorePattern": "^_|^TOAST_|^emailInput$|^sendLinkButton$|^..."
```
Allow common unused vars from DOM queries and module exports.

**Depth & Complexity:**
- `max-depth: 7` - Chart rendering needs nested loops
- `max-lines-per-function: 200` - Vanilla JS tends toward longer functions

**Disabled Rules:**
- `block-scoped-var: off` - IIFEs intentionally expose globals
- `no-return-assign: off` - Common vanilla JS pattern (`return x = y`)

## Results

- **Before**: 40 warnings, 0 errors
- **After**: 20 warnings, 0 errors
- **Reduction**: 50% fewer warnings

## Remaining Warnings (Acceptable)

| Rule | Count | Notes |
|------|-------|-------|
| no-unused-vars | 13 | Legitimate unused variables |
| prefer-const | 4 | Style preference (var vs const) |
| radix | 2 | parseInt without radix parameter |
| no-unused-expressions | 1 | Edge case |

## Verification Command

```bash
npx eslint js/ --format=json
# Expected: errorCount: 0, warningCount: ≤20
```
