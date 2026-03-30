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
#   4. Config Validation (prevent ES6 export regression)
#   5. Credential Scanner (detect hardcoded secrets)
#   6. .gitignore Protection (ensure config.js protected)

set -e  # Exit on error

echo "=========================================="
echo "  PRE-COMMIT QUALITY CHECKS"
echo "=========================================="
echo ""

cd "$(git rev-parse --show-toplevel)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test start time
START_TIME=$(date +%s)

# Check 1: ESLint (Code Quality - Warnings Only)
echo -e "${YELLOW}[1/6] Running ESLint...${NC}"
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
echo -e "${YELLOW}[2/6] Running E2E Integration Checks...${NC}"
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
echo -e "${YELLOW}[3/6] Running Full Unit Test Suite...${NC}"
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
echo ""

# Check 4: Config.js Validation (Security)
echo -e "${YELLOW}[4/6] Validating Config.js...${NC}"
echo "      (Prevent ES6 export regression)"
echo ""

CONFIG_FILE="js/config.js"

if [ -f "$CONFIG_FILE" ]; then
    # Check for ES6 exports (forbidden)
    if grep -qE "^export\s+(default|const|let|var|function|class)" "$CONFIG_FILE"; then
        echo ""
        echo -e "${RED}=========================================="
        echo "  ❌ PRE-COMMIT FAILED: Config.js Validation"
        echo "==========================================${NC}"
        echo ""
        echo "ES6 exports detected in $CONFIG_FILE"
        echo "This project uses IIFE modules with window.SUPABASE_CONFIG"
        echo ""
        echo "Fix: Replace 'export' with 'window.SUPABASE_CONFIG ='"
        echo ""
        echo "To skip (NOT RECOMMENDED): git commit --no-verify"
        echo ""
        exit 1
    fi
    
    # Check for window.SUPABASE_CONFIG pattern (required)
    if ! grep -qE "window\.SUPABASE_CONFIG\s*=" "$CONFIG_FILE"; then
        echo ""
        echo -e "${RED}=========================================="
        echo "  ❌ PRE-COMMIT FAILED: Config.js Validation"
        echo "==========================================${NC}"
        echo ""
        echo "Missing window.SUPABASE_CONFIG in $CONFIG_FILE"
        echo "Config must use: window.SUPABASE_CONFIG = { url: '...', anonKey: '...' }"
        echo ""
        echo "To skip (NOT RECOMMENDED): git commit --no-verify"
        echo ""
        exit 1
    fi
    
    echo "  ✅ Config.js validation passed"
else
    echo "  ℹ️  $CONFIG_FILE not found (skipping validation)"
    echo "      Generate with: node scripts/generate-config.js"
fi
echo ""

# Check 5: Credential Scanner (Security)
echo -e "${YELLOW}[5/6] Scanning for Credentials...${NC}"
echo "      (Detect hardcoded secrets)"
echo ""

# Patterns to scan (dangerous patterns that should block commits)
DANGEROUS_PATTERNS=(
    "sk_live_[a-zA-Z0-9]+"                    # Stripe live keys
    "ghp_[a-zA-Z0-9]{36}"                     # GitHub PATs
    "AIza[a-zA-Z0-9_-]{35}"                   # Google API keys
    "xox[baprs]-[a-zA-Z0-9-]+"                # Slack tokens
    "supabase.*key.*['\"][a-zA-Z0-9]{40,}"    # Supabase keys in quotes
)

FOUND_SECRETS=0
SCANNED_FILES=0

# Scan staged files only (faster)
staged_files=$(git diff --cached --name-only --diff-filter=ACM)

if [ -n "$staged_files" ]; then
    for file in $staged_files; do
        # Skip test files and this script itself
        if [[ "$file" == *"test"* ]] || [[ "$file" == *"pre-commit.sh"* ]]; then
            continue
        fi
        
        if [ -f "$file" ]; then
            SCANNED_FILES=$((SCANNED_FILES + 1))
            
            for pattern in "${DANGEROUS_PATTERNS[@]}"; do
                if grep -qE "$pattern" "$file" 2>/dev/null; then
                    echo ""
                    echo -e "${RED}⚠️  Potential secret detected in: ${file}${NC}"
                    echo "   Pattern: $pattern"
                    FOUND_SECRETS=1
                fi
            done
        fi
    done
fi

if [ $FOUND_SECRETS -eq 1 ]; then
    echo ""
    echo -e "${RED}=========================================="
    echo "  ❌ PRE-COMMIT FAILED: Credential Scan"
    echo "==========================================${NC}"
    echo ""
    echo "Hardcoded credentials detected in staged files."
    echo "Never commit secrets - use environment variables instead."
    echo ""
    echo "To skip (NOT RECOMMENDED): git commit --no-verify"
    echo ""
    exit 1
fi

if [ $SCANNED_FILES -gt 0 ]; then
    echo "  ✅ Scanned $SCANNED_FILES files, no secrets detected"
else
    echo "  ℹ️  No staged files to scan"
fi
echo ""

# Check 6: .gitignore Protection (Security)
echo -e "${YELLOW}[6/6] Checking .gitignore Protection...${NC}"
echo "      (Ensure config.js is protected)"
echo ""

GITIGNORE_FILE=".gitignore"
CONFIG_FILE="js/config.js"

if [ -f "$GITIGNORE_FILE" ]; then
    # Check if config.js or js/config.js is in .gitignore
    if grep -qE "(^|/)js/config\.js$" "$GITIGNORE_FILE" || grep -qE "^config\.js$" "$GITIGNORE_FILE"; then
        echo "  ✅ $CONFIG_FILE is protected in .gitignore"
    else
        echo ""
        echo -e "${YELLOW}⚠️  WARNING: $CONFIG_FILE not found in .gitignore${NC}"
        echo ""
        echo "Consider adding $CONFIG_FILE to .gitignore to prevent accidental commits."
        echo "Config files should use environment variables or be gitignored."
        echo ""
        # Non-blocking warning, continue
    fi
else
    echo "  ℹ️  .gitignore not found (skipping protection check)"
fi
echo ""

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
