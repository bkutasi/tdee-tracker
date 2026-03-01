/**
 * E2E Integration Checks
 * 
 * Static code analysis tests to catch API mismatches between modules.
 * These tests would have caught the 3 bugs we just fixed:
 * 1. Missing fetchAndMergeData export
 * 2. Missing Auth._getSupabase()
 * 3. Wrong Storage API usage (clearEntries, addEntry)
 * 
 * Run: node tests/e2e/integration-checks.test.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (error) {
        console.error(`✗ ${name}`);
        console.error(`  ${error.message}`);
        failed++;
    }
}

function expect(actual) {
    return {
        toBeTruthy() {
            if (!actual) throw new Error(`Expected truthy but got ${actual}`);
        },
        toBeFalsy() {
            if (actual) throw new Error(`Expected falsy but got ${actual}`);
        },
        toContain(str) {
            if (!actual.includes(str)) throw new Error(`Expected to contain "${str}"`);
        }
    };
}

console.log('\n=== E2E Integration Checks ===\n');

const jsDir = path.join(__dirname, '../../js');
const syncCode = fs.readFileSync(path.join(jsDir, 'sync.js'), 'utf8');
const authCode = fs.readFileSync(path.join(jsDir, 'auth.js'), 'utf8');
const storageCode = fs.readFileSync(path.join(jsDir, 'storage.js'), 'utf8');

// ============================================
// Critical Integration Points (Would have caught our bugs)
// ============================================

test('E2E: Sync exports fetchAndMergeData function', () => {
    expect(syncCode).toContain('fetchAndMergeData,');
});

test('E2E: Auth exposes _getSupabase method', () => {
    expect(authCode).toContain('_getSupabase');
    const hasReturn = authCode.includes('return supabase') || authCode.includes('=> supabase');
    if (!hasReturn) throw new Error('Auth._getSupabase should return supabase client');
});

test('E2E: Storage does NOT have clearEntries (wrong API)', () => {
    if (storageCode.includes('function clearEntries') || storageCode.includes('clearEntries()')) {
        throw new Error('Storage should not have clearEntries method');
    }
});

test('E2E: Storage does NOT have addEntry (wrong API)', () => {
    if (storageCode.includes('function addEntry') || storageCode.includes('Storage.addEntry(')) {
        throw new Error('Storage should not have addEntry method');
    }
});

test('E2E: Storage has saveEntry(date, entry) method', () => {
    expect(storageCode).toContain('function saveEntry');
});

test('E2E: Storage has getAllEntries method', () => {
    expect(storageCode).toContain('function getAllEntries');
});

// ============================================
// Sync Module Integration
// ============================================

test('E2E: Sync uses Storage.saveEntry(date, entry) signature', () => {
    expect(syncCode).toContain('Storage.saveEntry(entry.date');
});

test('E2E: Sync uses localStorage.setItem for bulk save', () => {
    expect(syncCode).toContain('localStorage.setItem');
});

test('E2E: Sync calls Auth._getSupabase() to get client', () => {
    expect(syncCode).toContain('Auth._getSupabase');
});

test('E2E: Sync has error handling for getSupabase', () => {
    expect(syncCode).toContain('if (!Auth)');
    expect(syncCode).toContain('if (!session)');
});

// ============================================
// API Completeness Checks
// ============================================

test('E2E: Sync has all core methods defined', () => {
    const methods = ['init', 'syncAll', 'saveWeightEntry', 'updateWeightEntry', 
                     'deleteWeightEntry', 'fetchWeightEntries', 'mergeEntries', 
                     'getStatus', 'getQueue', 'clearQueue', 'fetchAndMergeData'];
    methods.forEach(m => {
        if (!syncCode.includes(`function ${m}`) && !syncCode.includes(`async function ${m}`)) {
            throw new Error(`Missing Sync method: ${m}`);
        }
    });
});

test('E2E: Auth has required methods', () => {
    const methods = ['init', 'signInWithMagicLink', 'signOut', 'getCurrentUser', 
                     'isAuthenticated', 'getSession', '_getSupabase'];
    methods.forEach(m => {
        if (!authCode.includes(m)) throw new Error(`Missing Auth method: ${m}`);
    });
});

// ============================================
// Summary
// ============================================

console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) {
    console.log('❌ Integration checks failed - these bugs would reach production!\n');
    console.log('Run this check in CI/CD before deployment:');
    console.log('  node tests/e2e/integration-checks.test.js\n');
    process.exit(1);
} else {
    console.log('✓ All integration checks passed!\n');
    console.log('These checks would have caught:');
    console.log('  1. Missing fetchAndMergeData export ✓');
    console.log('  2. Missing Auth._getSupabase() ✓');
    console.log('  3. Wrong Storage API usage ✓\n');
    process.exit(0);
}
