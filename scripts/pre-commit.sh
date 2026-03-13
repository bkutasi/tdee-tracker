#!/bin/bash

# Pre-commit hook for TDEE Tracker
# Runs code quality checks and tests before allowing commit
# 
# Installation:
#   cp scripts/pre-commit.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Checks:
#   1. ESLint (code quality - warnings only)
#   2. E2E Integration Checks (API compatibility)
#   3. Unit Tests (Calculator, Storage, Utils, Sync, CSP)

set -e  # Exit on error

echo "=========================================="
echo "  PRE-COMMIT QUALITY CHECKS"
echo "=========================================="
echo ""

# Change to repo root
cd "$(git rev-parse --show-toplevel)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test start time
START_TIME=$(date +%s)

# Check 1: ESLint (Code Quality - Warnings Only)
echo -e "${YELLOW}[1/3] Running ESLint...${NC}"
echo "      (Catches code quality issues)"
echo ""

if [ -f "eslint.config.js" ] || [ -f ".eslintrc.json" ]; then
    if command -v npx &> /dev/null; then
        # Get staged JS files only (faster)
        staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|mjs)$' || true)
        
        if [ -n "$staged_files" ]; then
            echo "  Checking staged files..."
            lint_output=$(npx eslint $staged_files 2>&1 || true)
            
            if [ -n "$lint_output" ]; then
                echo ""
                echo -e "${YELLOW}⚠️  ESLint Warnings (non-blocking):${NC}"
                echo "$lint_output" | head -15
                if [ $(echo "$lint_output" | wc -l) -gt 15 ]; then
                    echo "  ...and more (run 'npx eslint' to see all)"
                fi
                echo ""
            fi
        else
            echo "  No staged JS files to check"
        fi
        echo "  ✅ ESLint check complete"
    else
        echo "  ⚠️  npx not found, skipping ESLint"
    fi
else
    echo "  ⚠️  No ESLint config found, skipping ESLint"
fi
echo ""

# Check 2: E2E Integration Checks
echo -e "${YELLOW}[2/3] Running E2E Integration Checks...${NC}"
echo "      (Catches API mismatches between modules)"
echo ""

if ! node tests/e2e/integration-checks.test.js; then
    echo ""
    echo -e "${RED}=========================================="
    echo "  ❌ PRE-COMMIT FAILED: Integration Checks"
    echo "==========================================${NC}"
    echo ""
    echo "These bugs would have reached production!"
    echo ""
    echo "To skip (NOT RECOMMENDED): git commit --no-verify"
    echo ""
    exit 1
fi
echo ""

# Check 3: Run test suite
echo -e "${YELLOW}[3/3] Running Full Unit Test Suite...${NC}"
echo "      (Calculator, Storage, Utils, Sync, CSP)"
echo ""

if [ -f "tests/node-test.js" ]; then
    if ! node tests/node-test.js; then
        echo ""
        echo -e "${RED}=========================================="
        echo "  ❌ PRE-COMMIT FAILED: Unit Tests"
        echo "==========================================${NC}"
        echo ""
        echo "Fix failing tests before committing."
        echo ""
        echo "To skip (NOT RECOMMENDED): git commit --no-verify"
        echo ""
        exit 1
    fi
    echo "  ✅ Tests passed"
else
    echo "  ⚠️  tests/node-test.js not found, skipping tests"
fi

# Summary
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}=========================================="
echo "  ✅ ALL CHECKS PASSED"
echo "==========================================${NC}"
echo ""
echo "Test Duration: ${DURATION}s"
echo ""
echo "You can safely commit. All quality checks passed!"
echo ""

exit 0
