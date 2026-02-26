#!/usr/bin/env node
/**
 * Test runner for date validation functions
 * Run with: node tests/test-date-validation.js
 */

// Simple test harness for Node.js
let passed = 0;
let failed = 0;

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
        },
        toBeTruthy() {
            if (!actual) throw new Error(`Expected truthy value, got ${actual}`);
        },
        toBeFalsy() {
            if (actual) throw new Error(`Expected falsy value, got ${actual}`);
        }
    };
}

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`✓ ${name}`);
    } catch (e) {
        failed++;
        console.log(`✗ ${name}`);
        console.log(`  ${e.message}`);
    }
}

// Load modules
const Utils = require('../js/utils.js');
const Storage = require('../js/storage.js');

console.log('\n=== Date Validation Tests ===\n');

// Test validateDateFormat
test('validateDateFormat accepts valid YYYY-MM-DD', () => {
    const result = Utils.validateDateFormat('2025-01-15');
    expect(result.success).toBe(true);
    expect(result.data instanceof Date).toBeTruthy();
});

test('validateDateFormat rejects null', () => {
    const result = Utils.validateDateFormat(null);
    expect(result.success).toBe(false);
    expect(result.code).toBe('MISSING_INPUT');
});

test('validateDateFormat rejects undefined', () => {
    const result = Utils.validateDateFormat(undefined);
    expect(result.success).toBe(false);
    expect(result.code).toBe('MISSING_INPUT');
});

test('validateDateFormat rejects empty string', () => {
    const result = Utils.validateDateFormat('');
    expect(result.success).toBe(false);
    expect(result.code).toBe('MISSING_INPUT');
});

test('validateDateFormat rejects invalid format', () => {
    const result = Utils.validateDateFormat('01-15-2025');
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_FORMAT');
});

test('validateDateFormat rejects invalid date', () => {
    const result = Utils.validateDateFormat('2025-13-45');
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_DATE');
});

// Test validateDateRange
test('validateDateRange accepts valid range', () => {
    const result = Utils.validateDateRange('2025-01-01', '2025-01-31');
    expect(result.success).toBe(true);
    expect(result.data.days).toBe(30);
});

test('validateDateRange rejects missing start date', () => {
    const result = Utils.validateDateRange(null, '2025-01-31');
    expect(result.success).toBe(false);
    expect(result.code).toBe('MISSING_INPUT');
});

test('validateDateRange rejects missing end date', () => {
    const result = Utils.validateDateRange('2025-01-01', null);
    expect(result.success).toBe(false);
    expect(result.code).toBe('MISSING_INPUT');
});

test('validateDateRange rejects start > end', () => {
    const result = Utils.validateDateRange('2025-01-31', '2025-01-01');
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_RANGE');
});

test('validateDateRange rejects range > 2 years', () => {
    const result = Utils.validateDateRange('2020-01-01', '2025-01-01');
    expect(result.success).toBe(false);
    expect(result.code).toBe('RANGE_EXCEEDED');
});

test('validateDateRange accepts custom maxDays', () => {
    const result = Utils.validateDateRange('2025-01-01', '2025-01-10', 7);
    expect(result.success).toBe(false);
    expect(result.code).toBe('RANGE_EXCEEDED');
});

test('validateDateRange same day is valid', () => {
    const result = Utils.validateDateRange('2025-01-15', '2025-01-15');
    expect(result.success).toBe(true);
    expect(result.data.days).toBe(0);
});

// Test Storage integration
console.log('\n=== Storage Date Validation Tests ===\n');

// Mock localStorage for Node.js
global.localStorage = {
    data: {
        tdee_entries: '{}',
        tdee_settings: '{}',
        tdee_schema_version: '1'
    },
    getItem(key) { return this.data[key] || null; },
    setItem(key, value) { this.data[key] = value; },
    removeItem(key) { delete this.data[key]; }
};

test('Storage.getEntry returns null for invalid date', () => {
    const result = Storage.getEntry('invalid-date');
    expect(result).toBe(null);
});

test('Storage.getEntry returns null for null date', () => {
    const result = Storage.getEntry(null);
    expect(result).toBe(null);
});

test('Storage.saveEntry rejects invalid date format', () => {
    const result = Storage.saveEntry('bad-date', { weight: 80 });
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_FORMAT');
});

test('Storage.saveEntry rejects null date', () => {
    const result = Storage.saveEntry(null, { weight: 80 });
    expect(result.success).toBe(false);
    expect(result.code).toBe('MISSING_INPUT');
});

test('Storage.saveEntry accepts valid date', () => {
    const result = Storage.saveEntry('2025-01-15', { weight: 80, calories: 1600 });
    expect(result).toBe(true);
});

test('Storage.saveEntry validates and saves entry', () => {
    const entry = Storage.getEntry('2025-01-15');
    expect(entry).not.toBe(null);
    expect(entry.weight).toBe(80);
    expect(entry.calories).toBe(1600);
});

test('Storage.deleteEntry rejects invalid date', () => {
    const result = Storage.deleteEntry('not-a-date');
    expect(result.success).toBe(false);
    expect(result.code).toBe('INVALID_FORMAT');
});

test('Storage.deleteEntry accepts valid date', () => {
    const result = Storage.deleteEntry('2025-01-15');
    expect(result).toBe(true);
});

test('Storage.getEntriesInRange rejects invalid start date', () => {
    const result = Storage.getEntriesInRange('bad', '2025-01-31');
    expect(result).toEqual([]);
});

test('Storage.getEntriesInRange rejects invalid end date', () => {
    const result = Storage.getEntriesInRange('2025-01-01', 'bad');
    expect(result).toEqual([]);
});

test('Storage.getEntriesInRange rejects start > end', () => {
    const result = Storage.getEntriesInRange('2025-01-31', '2025-01-01');
    expect(result).toEqual([]);
});

test('Storage.getEntriesInRange rejects range > 2 years', () => {
    const result = Storage.getEntriesInRange('2020-01-01', '2025-01-01');
    expect(result).toEqual([]);
});

test('Storage.getEntriesInRange works with valid range', () => {
    // First save some entries
    Storage.saveEntry('2025-01-01', { weight: 80, calories: 1600 });
    Storage.saveEntry('2025-01-02', { weight: 79.5, calories: 1700 });
    Storage.saveEntry('2025-01-03', { weight: 79.8, calories: null });
    
    const result = Storage.getEntriesInRange('2025-01-01', '2025-01-03');
    expect(result.length).toBe(3);
    expect(result[0].date).toBe('2025-01-01');
    expect(result[0].weight).toBe(80);
    expect(result[1].date).toBe('2025-01-02');
    expect(result[2].date).toBe('2025-01-03');
});

// Summary
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
