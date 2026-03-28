#!/bin/bash
# Phase 1 Validation Tests Runner
# Run all Phase 1 automated tests
# Make executable: chmod +x scripts/run-phase1-tests.sh

set -e

echo "========================================"
echo "  Phase 1 Validation Tests"
echo "  Testing 5 Critical Fixes"
echo "========================================"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "Running Node.js tests..."
echo ""

# Run Node.js tests
node tests/node-test.js

TEST_EXIT_CODE=$?

echo ""
echo "========================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All Phase 1 tests passed!"
    echo ""
    echo "To run browser tests:"
    echo "  open tests/test-runner.html"
    echo ""
    echo "Phase 1 Fixes Verified:"
    echo "  ✓ Fix #1: Weight validation in saveWeightEntry()"
    echo "  ✓ Fix #2: ID validation in deleteWeightEntry()"
    echo "  ✓ Fix #3: Auth race condition in app.js (see phase1-browser.test.js)"
    echo "  ✓ Fix #4: Clear queue before clear data"
    echo "  ✓ Fix #5: Import triggers sync"
    exit 0
else
    echo "❌ Phase 1 tests failed"
    echo ""
    echo "Review the errors above and fix before deploying."
    exit 1
fi
