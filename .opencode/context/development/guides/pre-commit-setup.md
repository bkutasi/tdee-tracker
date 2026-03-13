<!-- Context: development/guides/pre-commit-setup | Priority: medium | Version: 1.0 | Updated: 2026-03-11 -->

# Guide: Pre-commit Hook Setup

**Purpose**: Automate code quality checks before every commit to catch issues early.

**Last Updated**: 2026-03-11

---

## Overview

Pre-commit hooks run automated checks before git commits complete. For TDEE Tracker, hooks validate JavaScript syntax, run tests, and check file sizes.

---

## Step 1: Create Pre-commit Hook

```bash
# Navigate to git hooks directory
cd .git/hooks

# Create pre-commit file
touch pre-commit
chmod +x pre-commit
```

---

## Step 2: Add Hook Script

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running pre-commit checks..."

# Check 1: JavaScript syntax
echo "Checking JavaScript syntax..."
for file in $(git diff --cached --name-only | grep '\.js$'); do
    if [ -f "$file" ]; then
        node --check "$file" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "❌ Syntax error in $file"
            exit 1
        fi
    fi
done

# Check 2: Run tests
echo "Running tests..."
node tests/node-test.js
if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi

# Check 3: File size limits
echo "Checking file sizes..."
for file in $(git diff --cached --name-only); do
    if [ -f "$file" ]; then
        size=$(wc -l < "$file")
        if [ $size -gt 1000 ]; then
            echo "⚠️  Warning: $file has $size lines (consider splitting)"
        fi
    fi
done

# Check 4: No config.js committed
if git diff --cached --name-only | grep -q 'js/config.js'; then
    echo "❌ Cannot commit js/config.js (add to .gitignore)"
    exit 1
fi

echo "✅ All pre-commit checks passed!"
exit 0
```

---

## Step 3: Test the Hook

```bash
# Make a small change
echo "// Test" >> js/utils.js

# Try to commit
git add js/utils.js
git commit -m "Test pre-commit hook"

# Should see:
# Running pre-commit checks...
# Checking JavaScript syntax...
# Running tests...
# ✅ All pre-commit checks passed!
```

---

## Step 4: Skip Hook (Emergency Only)

```bash
# Skip pre-commit for this commit only
git commit -m "Emergency fix" --no-verify

# ⚠️ Use sparingly - only for true emergencies
```

---

## Alternative: Use Husky (if npm allowed)

```bash
# Install Husky
npm install -D husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit 'node tests/node-test.js'

# Add to package.json
{
  "scripts": {
    "prepare": "husky install"
  }
}
```

⚠️ **Note**: TDEE Tracker has zero npm dependencies policy. Use manual hooks instead.

---

## Recommended Checks

### Critical (Block Commit)

- [ ] JavaScript syntax valid
- [ ] Tests pass
- [ ] No `js/config.js` committed
- [ ] No secrets in code (API keys, passwords)

### Warning (Allow but Notify)

- [ ] File size < 1000 lines
- [ ] No `console.log` in production code
- [ ] No `debugger` statements

---

## Bypass Strategies

### For WIP Commits

```bash
# Commit with WIP prefix (skip tests)
git commit -m "WIP: Working on feature" --no-verify

# Then fix before final commit
git commit --amend -m "Complete feature implementation"
```

### For Large Refactors

```bash
# Commit in stages
git add js/calculator.js
git commit -m "Refactor calculator logic" --no-verify

git add tests/calculator.test.js
git commit -m "Add tests for refactored calculator"
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Hook not running | Verify `chmod +x .git/hooks/pre-commit` |
| Tests hang | Add timeout to test runner |
| False positives | Adjust hook script thresholds |
| Hook breaks CI | Ensure CI has same Node.js version |

**References**:
- `tests/node-test.js` — Test runner (109+ tests)
- `.gitignore` — Files to exclude from git
- `tests/` — Test suite directory

**Related**:
- [guides/creating-skills.md](creating-skills.md)
- [concepts/test-driven-development.md](../../testing/concepts/test-driven-development.md)
- [../testing/guides/testing-auth-flow.md](../../testing/guides/testing-auth-flow.md)

(End of file - total 148 lines)
