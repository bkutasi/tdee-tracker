#!/bin/bash

# TDEE Tracker Test Runner
# Runs Node.js tests and optionally opens browser tests

set -e

echo "=========================================="
echo "TDEE Tracker - Test Suite"
echo "=========================================="
echo ""

# Run Node.js tests (fast, no browser needed)
echo "📦 Running Node.js tests..."
node tests/node-test.js

echo ""
echo "✅ Node.js tests complete!"
echo ""

# Check if browser tests should run
if [ "$1" == "--browser" ] || [ "$1" == "-b" ]; then
    echo "🌐 Opening browser tests..."
    
    # Detect OS and open browser
    if command -v xdg-open &> /dev/null; then
        xdg-open tests/test-runner.html &
        echo "   Opened in browser (check tests/test-runner.html tab)"
    elif command -v open &> /dev/null; then
        open tests/test-runner.html
        echo "   Opened in browser"
    elif command -v start &> /dev/null; then
        start tests/test-runner.html
        echo "   Opened in browser"
    else
        echo "⚠️  No browser opener found."
        echo "   Please open: tests/test-runner.html"
    fi
    echo ""
else
    echo "💡 Browser tests available at: tests/test-runner.html"
    echo "   Run './run-tests.sh --browser' to open automatically"
fi

echo "=========================================="
