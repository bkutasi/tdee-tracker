#!/usr/bin/env node
/**
 * E2E Integration Test Runner
 * 
 * Runs all E2E integration tests in sequence.
 * Exit code: 0 if all pass, 1 if any fail.
 * 
 * Usage: node tests/e2e/run-all.js
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');

// Test files to run
const TEST_FILES = [
    'sync-integration.test.js',
    'auth-integration.test.js',
    'storage-integration.test.js'
];

const E2E_DIR = __dirname;

// Colors for output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function runTestFile(file) {
    const filePath = path.join(E2E_DIR, file);
    
    log(`\n${'═'.repeat(60)}`, 'cyan');
    log(`Running: ${file}`, 'bold');
    log('═'.repeat(60), 'cyan');
    
    try {
        const output = execSync(`node "${filePath}"`, {
            encoding: 'utf-8',
            stdio: 'inherit'
        });
        return { success: true, file };
    } catch (error) {
        return { success: false, file, error: error.message };
    }
}

function main() {
    log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
    log('║         E2E Integration Test Suite                       ║', 'bold');
    log('║         Supabase Sync Flow Integration Tests             ║', 'bold');
    log('╚══════════════════════════════════════════════════════════╝', 'cyan');
    
    const startTime = Date.now();
    const results = [];
    
    // Run each test file
    for (const file of TEST_FILES) {
        const result = runTestFile(file);
        results.push(result);
    }
    
    // Summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    log('\n' + '═'.repeat(60), 'cyan');
    log('TEST SUMMARY', 'bold');
    log('═'.repeat(60), 'cyan');
    
    results.forEach(r => {
        const status = r.success ? '✓ PASS' : '✗ FAIL';
        const color = r.success ? 'green' : 'red';
        log(`  ${status}: ${r.file}`, color);
    });
    
    log('─'.repeat(60), 'cyan');
    log(`Total: ${results.length} test suites`, 'bold');
    log(`Passed: ${passed}`, passed === results.length ? 'green' : 'yellow');
    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log(`Duration: ${duration}s`, 'cyan');
    log('═'.repeat(60), 'cyan');
    
    if (failed > 0) {
        log('\n✗ E2E tests failed. Review failures above.', 'red');
        log('\nFailed test files:', 'red');
        results.filter(r => !r.success).forEach(r => {
            log(`  - ${r.file}`, 'red');
        });
        process.exit(1);
    } else {
        log('\n✓ All E2E tests passed!', 'green');
        log('\nThese tests would have caught:', 'cyan');
        log('  1. Missing export: fetchAndMergeData not exported from Sync', 'yellow');
        log('  2. Missing method: Auth._getSupabase() not exposed', 'yellow');
        log('  3. Wrong API: Storage.clearEntries() does not exist', 'yellow');
        process.exit(0);
    }
}

// Run
main();
