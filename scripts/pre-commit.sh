#!/bin/bash

# Pre-commit hook for TDEE Tracker
# Runs static analysis and tests before allowing commit
# 
# Installation:
#   cp scripts/pre-commit.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit

set -e  # Exit on error

echo "🔍 Running pre-commit checks..."
echo ""

# Check 1: JavaScript syntax validation
echo "📝 Validating JavaScript syntax..."
syntax_errors=0

for file in js/*.js js/ui/*.js tests/*.test.js tests/*.js; do
    if [ -f "$file" ]; then
        node -c "$file" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "  ❌ Syntax error in $file"
            syntax_errors=$((syntax_errors + 1))
        fi
    fi
done

if [ $syntax_errors -gt 0 ]; then
    echo ""
    echo "❌ Found $syntax_errors syntax error(s). Fix before committing."
    exit 1
fi
echo "  ✅ Syntax validation passed"
echo ""

# Check 2: ESLint (if available)
if command -v npx &> /dev/null; then
    echo "🔍 Running ESLint..."
    if [ -f ".eslintrc.json" ]; then
        npx eslint js/**/*.js tests/**/*.js --quiet 2>/dev/null
        if [ $? -ne 0 ]; then
            echo ""
            echo "❌ ESLint found errors. Fix before committing."
            echo "   Run: npx eslint js/**/*.js tests/**/*.js"
            exit 1
        fi
        echo "  ✅ ESLint passed"
    else
        echo "  ⚠️  No .eslintrc.json found, skipping ESLint"
    fi
    echo ""
else
    echo "  ⚠️  npx not found, skipping ESLint"
    echo ""
fi

# Check 3: Run test suite
echo "🧪 Running test suite..."
if [ -f "tests/node-test.js" ]; then
    node tests/node-test.js
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Tests failed. Fix failing tests before committing."
        echo "   Run: node tests/node-test.js"
        exit 1
    fi
    echo "  ✅ Tests passed"
else
    echo "  ⚠️  tests/node-test.js not found, skipping tests"
fi
echo ""

# Check 4: Verify test file structure
echo "📋 Checking test file structure..."
test_files_missing=0

# Check that new test cases were added for calculateStableTDEE fallback
if ! grep -q "calorie-average fallback" tests/calculator.test.js 2>/dev/null; then
    echo "  ⚠️  Warning: No tests found for calorie-average fallback"
    echo "     Consider adding tests for fallback logic in calculateStableTDEE"
fi

echo "  ✅ Test structure check complete"
echo ""

# All checks passed
echo "✅ All pre-commit checks passed!"
echo ""
echo "💡 Tip: Run 'node tests/node-test.js' locally before pushing to catch issues early."
exit 0
